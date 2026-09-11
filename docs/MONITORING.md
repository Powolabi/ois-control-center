# Monitoring System Documentation

## Architecture

OIS Control Center Phase 2 implements read-only health monitoring for infrastructure systems. The monitoring system consists of:

1. **Web Application** - Next.js application for managing monitors and viewing results
2. **Background Worker** - Separate Node.js process that executes checks
3. **PostgreSQL Database** - Stores monitors, check results, and incidents

### Key Design Decisions

- **Separate Worker Process**: Monitoring does not depend on an open browser or active Next.js request
- **PostgreSQL-Based Scheduling**: No external dependencies like Redis required
- **Atomic Job Claiming**: Multiple workers can run safely without duplicate execution
- **SSRF Protection**: Comprehensive security controls prevent abuse

## Check Types

### HTTP/HTTPS Checks

Monitor web services and APIs.

**Configuration:**
- URL (validated against SSRF rules)
- Method: GET or HEAD only
- Expected status code range (default: 200-299)
- Follow redirects (default: true, max 5)
- TLS validation (always enabled, cannot be disabled)
- Optional expected response text (max 1000 chars)

**Security:**
- URL scheme must be http:// or https://
- Embedded credentials rejected
- Response body limited to 1MB
- Redirects validated against SSRF rules
- Connection timeout enforced

### TCP Connection Checks

Test if a TCP port is reachable.

**Configuration:**
- Host (IP or hostname)
- Port (must be in allowlist)

**Security:**
- DNS resolution validated
- Port must be in MONITOR_ALLOWED_TCP_PORTS
- Connection-only test (no data transmitted)

### Heartbeat Checks

External processes report they are alive.

**Configuration:**
- Auto-generated 64-character hex token
- Token displayed only once at creation (or after rotation)
- Token hash stored in database (SHA-256)

**Security:**
- High-entropy tokens (32 random bytes)
- Secure hashing (SHA-256)
- Rate limited (10 requests per minute per monitor)
- Tokens never logged or included in audit events

**Usage:**
```bash
curl -X POST https://your-domain/api/heartbeat/YOUR_TOKEN_HERE
```

## SSRF Protection

The monitoring system implements comprehensive Server-Side Request Forgery (SSRF) protections:

### Always Blocked

- Loopback addresses (127.0.0.0/8, ::1)
- Link-local addresses (169.254.0.0/16, fe80::/10)
- Multicast addresses (224.0.0.0/4, ff00::/8)
- Unspecified addresses (0.0.0.0/8, ::)
- Carrier-grade NAT (100.64.0.0/10)
- Cloud metadata endpoints:
  - 169.254.169.254 (AWS, Azure, GCP, DigitalOcean)
  - fd00:ec2::254 (AWS IMDSv2 IPv6)
  - 100.100.100.200 (Alibaba Cloud)
  - metadata.google.internal

### Private Network Handling

Private networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) are **blocked by default**.

To monitor private infrastructure, configure the allowlist:

```env
MONITOR_ALLOWED_PRIVATE_CIDRS=192.168.1.0/24,10.0.0.0/8
```

**Security Notes:**
- Allowlist evaluated after metadata endpoint check
- DNS resolution happens server-side
- All resolved IPs validated (not just the hostname)
- Redirect destinations re-validated

### URL Validation

- Only HTTP(S) protocols allowed
- No embedded credentials (http://user:pass@host rejected)
- Ports must be in allowlist
- Scheme normalization prevents bypasses

### DNS Rebinding Protection

- Hostname resolved server-side before connection
- All resolved IPs validated against block rules
- IP addresses used for actual connection

## Health States

| State | Description |
|-------|-------------|
| **HEALTHY** | Passing checks, recovery threshold met |
| **DEGRADED** | Failures below threshold, or recovering |
| **DOWN** | Failure threshold exceeded, incident opened |
| **PAUSED** | Monitor disabled |
| **UNKNOWN** | Insufficient data or first check not run |

## Failure and Recovery Thresholds

**Default Configuration:**
- Failure Threshold: 3 consecutive failures
- Recovery Threshold: 2 consecutive successes

**Behavior:**

1. **Initial State**: UNKNOWN (no data)
2. **First Success**: HEALTHY
3. **First Failure**: DEGRADED
4. **Second Failure**: DEGRADED
5. **Third Failure**: DOWN → Incident opened
6. **First Success After Down**: DEGRADED
7. **Second Success After Down**: HEALTHY → Incident resolved

**Single Active Incident Rule**: Only one active incident exists per monitor at a time.

## Incidents

### Lifecycle

1. **Opened**: Failure threshold reached, status = OPEN
2. **Acknowledged**: Manual acknowledgement (future feature)
3. **Resolved**: Recovery threshold reached, automatic

### Fields

- Monitor & System references
- First failed result reference
- Recovery result reference (when resolved)
- Opened/Acknowledged/Resolved timestamps
- Failure summary

## Worker Architecture

### Job Claiming

```typescript
// Atomic PostgreSQL-based claiming
UPDATE monitors
SET workerLeaseOwner = 'worker-id',
    workerLeaseExpiry = NOW() + interval
WHERE id IN (
  SELECT id FROM monitors
  WHERE enabled = true
    AND nextCheckAt <= NOW()
    AND (workerLeaseOwner IS NULL OR workerLeaseExpiry < NOW())
  ORDER BY nextCheckAt
  LIMIT available_slots
  FOR UPDATE SKIP LOCKED
)
RETURNING id
```

### Concurrency Control

- Max concurrent checks: `MONITOR_MAX_CONCURRENCY` (default: 10)
- Worker polls every 5 seconds
- Lease duration: `MONITOR_WORKER_LEASE_SECONDS` (default: 60)
- Expired leases automatically recovered

### Graceful Shutdown

1. SIGTERM/SIGINT received
2. Stop claiming new monitors
3. Wait up to 30 seconds for active checks
4. Force shutdown if checks don't complete

### Running the Worker

**Development:**
```bash
npm run monitor:worker
```

**Production (with PM2):**
```bash
pm2 start npm --name "monitor-worker" -- run monitor:worker
```

**Production (systemd):**
```ini
[Unit]
Description=OIS Control Center Monitor Worker
After=network.target postgresql.service

[Service]
Type=simple
User=oisadmin
WorkingDirectory=/opt/ois-control-center
ExecStart=/usr/bin/npm run monitor:worker
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONITOR_ALLOW_PUBLIC_TARGETS` | `true` | Allow monitoring public IPs |
| `MONITOR_ALLOWED_PRIVATE_CIDRS` | `` | Comma-separated private CIDRs to allow |
| `MONITOR_ALLOWED_TCP_PORTS` | `22,80,443,5432,6379,8000,8080` | Comma-separated allowed ports |
| `MONITOR_MAX_CONCURRENCY` | `10` | Max simultaneous checks per worker |
| `MONITOR_DEFAULT_INTERVAL_SECONDS` | `60` | Default check interval |
| `MONITOR_RESULT_RETENTION_DAYS` | `30` | Days to keep old results |
| `MONITOR_WORKER_LEASE_SECONDS` | `60` | Lease duration for claimed monitors |

## Result Retention

Old check results consume database space. Run cleanup periodically:

**Dry Run (preview):**
```bash
npm run monitor:cleanup -- --dry-run
```

**Live Cleanup:**
```bash
npm run monitor:cleanup
```

**What Gets Deleted:**
- Check results older than `MONITOR_RESULT_RETENTION_DAYS`
- Only results NOT referenced by incidents

**What's Preserved:**
- All monitors (even archived)
- All incidents
- Check results referenced by incidents
- Audit events

## API Endpoints

### Monitor Management

- `POST /api/monitoring` - Create monitor
- `GET /api/monitoring` - List monitors
- `GET /api/monitoring/[id]` - Get monitor details
- `DELETE /api/monitoring/[id]` - Archive monitor
- `POST /api/monitoring/[id]/run` - Schedule manual check
- `POST /api/monitoring/[id]/rotate-token` - Rotate heartbeat token

### Heartbeat

- `POST /api/heartbeat/[token]` - Submit heartbeat

### Incidents

- `GET /api/incidents` - List incidents
- `POST /api/incidents/[id]/acknowledge` - Acknowledge incident

## Deployment Considerations

### Network Access

The worker process must have network access to monitored systems:

- **Home Lab Monitoring**: Deploy worker in home network
- **Cloud Monitoring**: Deploy worker with appropriate network access
- **Hybrid**: Run multiple workers in different networks

### Database Connection

Worker requires persistent PostgreSQL connection:
- Configure connection pooling
- Handle transient connection failures
- Monitor PostgreSQL performance under load

### Scaling

**Horizontal Scaling:**
- Run multiple workers safely
- Atomic job claiming prevents duplication
- Each worker has unique ID

**Vertical Scaling:**
- Increase `MONITOR_MAX_CONCURRENCY`
- Monitor database connection usage
- Watch for database lock contention

### Security

**Credentials:**
- Never store monitor targets in public repos
- Use environment variables for sensitive configs
- Rotate heartbeat tokens if compromised

**Network Security:**
- Worker should NOT be publicly accessible
- Only web app needs public access
- Consider VPN for worker in untrusted networks

## Current Limitations

### Phase 2 Does Not Include

- Email/SMS/Slack notifications
- Automatic remediation
- Custom HTTP headers or authentication
- POST/PUT/PATCH HTTP methods
- ICMP ping checks
- DNS record validation
- Certificate expiration monitoring
- Custom scripts or commands
- Distributed tracing
- SLA tracking

### Known Issues

- In-memory rate limiting (resets on worker restart)
- No worker health dashboard (coming in Phase 3)
- No check result aggregation/reporting

## Phase 3 Possibilities

- Notification channels (email, Slack, webhooks)
- Multi-region monitoring
- Worker health dashboard
- Advanced HTTP authentication
- Custom check scripts (sandboxed)
- Prometheus metrics export
- Grafana integration
- SLA tracking and reporting
- Automatic ticket creation
