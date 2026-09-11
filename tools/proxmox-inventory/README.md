# Proxmox Inventory Collector

A standalone, read-only TypeScript CLI tool that connects to Proxmox Virtual Environment (VE) via its REST API and exports a normalized JSON inventory of infrastructure resources.

## Purpose

This collector discovers and exports:
- Proxmox cluster and node information
- QEMU virtual machines
- LXC containers
- Storage resources
- Resource allocation and utilization metrics
- Parent-child relationships between infrastructure components

The collected inventory is designed to feed the **OIS Control Center** application but operates as a completely independent tool that can be run separately or integrated later.

## Scope and Limitations

### What This Collector Does
- ✅ Connects using read-only Proxmox API tokens
- ✅ Discovers Proxmox nodes, VMs, containers, and storage
- ✅ Collects CPU, memory, and storage metrics
- ✅ Maps relationships between infrastructure components
- ✅ Exports normalized, validated JSON
- ✅ Works with both clustered and standalone Proxmox installations
- ✅ Handles partial failures gracefully

### What This Collector Does NOT Do
- ❌ Does not discover applications or services running inside VMs/containers
- ❌ Does not perform any write operations (start, stop, modify, delete)
- ❌ Does not collect credentials or keys from guest systems
- ❌ Does not install agents or access guest operating systems
- ❌ Does not integrate with the OIS Control Center database (yet)

## Security Design

### Read-Only by Design
- **API Token Authentication Only** - No password authentication
- **GET Requests Only** - No POST, PUT, DELETE, or PATCH operations
- **TLS Verification Enabled** - Certificate validation on by default
- **Credential Redaction** - All logs automatically redact sensitive values
- **No Secret Storage** - Credentials loaded from environment only
- **Custom CA Support** - Use your own certificate authority

### Security Requirements

⚠️ **IMPORTANT**: Before connecting this collector to production infrastructure, ensure:

1. Create a dedicated API token with **read-only permissions**
2. Test with a non-production Proxmox instance first
3. Verify the token has minimal required privileges
4. Review the exported data for sensitive information
5. Store credentials securely (e.g., secrets manager)
6. Enable TLS verification in production
7. Rotate API tokens regularly

## Requirements

- **Node.js** 18.x or later
- **Proxmox VE** 7.x or later (may work with earlier versions)
- **API Token** with read permissions (see below)
- **Network Access** to Proxmox API (typically port 8006)

## Creating a Proxmox API Token

To create a least-privilege read-only API token:

### Step 1: Create a User (Optional)
If you don't want to use an existing user:

1. Log into Proxmox web interface
2. Navigate to **Datacenter → Permissions → Users**
3. Click **Add** and create a user (e.g., `inventory-collector@pam`)
4. Do not assign any passwords

### Step 2: Create an API Token

1. Navigate to **Datacenter → Permissions → API Tokens**
2. Click **Add**
3. Select your user
4. Enter a Token ID (e.g., `readonly-token`)
5. **Uncheck "Privilege Separation"** if you want the token to inherit user permissions
6. Click **Add**
7. **IMPORTANT**: Copy the token secret immediately - it won't be shown again!

### Step 3: Assign Read-Only Permissions

1. Navigate to **Datacenter → Permissions**
2. Click **Add → User Permission**
3. Path: `/`
4. User: Select your user (e.g., `inventory-collector@pam`)
5. Role: **PVEAuditor** (read-only role)
6. Click **Add**

Your token ID will be in the format: `username@realm!tokenname`

Example: `inventory-collector@pam!readonly-token`

## Installation

```bash
cd tools/proxmox-inventory
npm install
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your Proxmox details:

```bash
# Required: Proxmox API endpoint
PROXMOX_BASE_URL=https://proxmox.example.com:8006

# Required: API token credentials
PROXMOX_TOKEN_ID=inventory-collector@pam!readonly-token
PROXMOX_TOKEN_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Optional: Custom CA certificate for self-signed certificates
# PROXMOX_CA_CERT_PATH=/path/to/ca-cert.pem

# Optional: Allow insecure TLS (DEVELOPMENT ONLY - defaults to false)
# PROXMOX_ALLOW_INSECURE_TLS=false

# Optional: Request timeout in milliseconds (defaults to 10000)
# PROXMOX_REQUEST_TIMEOUT_MS=10000

# Optional: Output file path (defaults to ./output/proxmox-inventory.json)
# PROXMOX_OUTPUT_PATH=./output/proxmox-inventory.json
```

### TLS Configuration

#### Production (Recommended)
Use a valid certificate or provide a custom CA:

```bash
PROXMOX_CA_CERT_PATH=/path/to/ca-cert.pem
```

#### Development Only
If you must use a self-signed certificate in development:

```bash
PROXMOX_ALLOW_INSECURE_TLS=true
```

⚠️ **WARNING**: Insecure TLS should **never** be used in production. The tool will display a warning when this is enabled.

## Usage

### Collect Inventory

Run a full collection:

```bash
npm run collect
```

Example output:
```
=== Proxmox Inventory Collector ===

Configuration loaded:
  Base URL: https://proxmox.example.com:8006
  Token ID: inventory-collector@pam![REDACTED]
  Timeout: 10000ms
  TLS Insecure: false

Testing connection to Proxmox API...
✓ Connected successfully
Fetching Proxmox version...
✓ Proxmox version: 8.1.3
Checking cluster configuration...
✓ Cluster detected: production-cluster
Collecting nodes...
✓ Found 3 node(s)
Collecting VMs and containers...
✓ Found 15 VM(s) and 8 container(s)
Collecting storage...
✓ Found 6 storage resource(s)
✓ Collection completed in 1234ms

Validating export against schema...
✓ Validation passed

=== Collection Summary ===
Generated at: 2026-09-11T15:30:00.000Z
Source: production-cluster (PROXMOX)
Version: 8.1.3

Systems: 32 total
  - PROXMOX_HOST: 3
  - VIRTUAL_MACHINE: 15
  - CONTAINER: 8
  - STORAGE: 6
Relationships: 29

✓ Inventory written to: ./output/proxmox-inventory.json
  Size: 45.23 KB
```

### Dry Run

Test collection without writing the output file:

```bash
npm run collect -- --dry-run
```

The dry run performs the full collection and validation but does not save the file.

### Validate Existing Export

Validate an inventory file against the JSON schema:

```bash
npm run validate -- ./output/proxmox-inventory.json
```

### Run Tests

Execute the full test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Type Checking

Verify TypeScript types:

```bash
npm run typecheck
```

## Output Format

The collector produces a normalized JSON export with the following structure:

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-09-11T15:30:00.000Z",
  "source": {
    "type": "PROXMOX",
    "name": "production-cluster",
    "version": "8.1.3"
  },
  "systems": [
    {
      "externalId": "proxmox:node:pve-node-1",
      "name": "pve-node-1",
      "type": "PROXMOX_HOST",
      "status": "ONLINE",
      "hostname": "pve-node-1",
      "description": null,
      "platform": "Proxmox",
      "platformVersion": null,
      "vmId": null,
      "nodeName": null,
      "cpuAllocated": 8,
      "cpuUsagePercent": 25.0,
      "memoryAllocatedBytes": 16777216000,
      "memoryUsedBytes": 8388608000,
      "storageAllocatedBytes": null,
      "storageUsedBytes": null,
      "metadata": {
        "type": "node",
        "uptime": 864000
      }
    }
  ],
  "relationships": [
    {
      "sourceExternalId": "proxmox:vm:pve-node-1:101",
      "targetExternalId": "proxmox:node:pve-node-1",
      "type": "HOSTED_ON"
    }
  ],
  "warnings": []
}
```

### System Types
- `PROXMOX_HOST` - Proxmox node/hypervisor
- `VIRTUAL_MACHINE` - QEMU VM
- `CONTAINER` - LXC container
- `STORAGE` - Storage resource

### Status Values
- `ONLINE` - Running/active
- `OFFLINE` - Stopped/inactive
- `WARNING` - Paused or degraded
- `UNKNOWN` - Status unavailable

### Relationship Types
- `HOSTED_ON` - Guest to host relationship (VM/container → node)
- `ATTACHED_TO` - Resource attachment (storage → node)

All resource metrics (CPU, memory, storage) are included when available. Missing values are represented as `null` rather than invented or estimated.

## Validation

The export format is validated against a JSON Schema (`schemas/inventory-export.schema.json`) to ensure:
- Required fields are present
- Data types are correct
- Enum values are valid
- Numeric values are within valid ranges

## Testing

The test suite includes:
- **Configuration validation** - Environment variable parsing and validation
- **Redaction tests** - Sensitive data masking
- **Normalization tests** - Proxmox API response transformation
- **Schema validation** - Export format compliance
- **Error handling** - Timeout, auth failure, and partial failure scenarios

All tests use mocked API responses and committed fixtures. **No live Proxmox server is required for testing.**

## Integration with OIS Control Center

This collector is designed for future integration with the OIS Control Center application:

### Current State (Standalone)
- Runs independently as a CLI tool
- Outputs JSON files to disk
- No database integration
- Manual execution required

### Future Integration Options

1. **Scheduled Import**
   - Run collector on a schedule (cron, etc.)
   - Import JSON files into OIS Control Center database
   - Map Proxmox systems to database entities

2. **API Integration**
   - Expose collector as an internal API endpoint
   - Trigger collection from OIS Control Center UI
   - Stream results directly to database

3. **Background Worker**
   - Run collector as a background job
   - Queue-based processing
   - Automatic refresh of inventory data

4. **Real-time Sync**
   - Subscribe to Proxmox events (if available)
   - Incremental updates instead of full collection
   - Near-real-time inventory state

The normalized export format is designed to map cleanly to the OIS Control Center data model once integration is implemented.

## Known Limitations

1. **No Guest OS Discovery** - Cannot discover OS details without guest agent
2. **No Application Discovery** - Does not scan for running services
3. **Snapshot in Time** - Provides current state only, no historical data
4. **Network Info Limited** - Basic network details only
5. **Standalone Execution** - Not yet integrated with OIS Control Center
6. **Single Cluster** - Collects from one Proxmox instance per run
7. **No Templating** - Template VMs included but not specially handled

## Troubleshooting

### Authentication Failures
```
Authentication failed. Please check your API token credentials.
```
- Verify `PROXMOX_TOKEN_ID` format: `user@realm!tokenname`
- Confirm `PROXMOX_TOKEN_SECRET` is correct
- Check token hasn't been deleted or expired

### Permission Denied
```
Permission denied. Please ensure your API token has read permissions.
```
- Verify user has PVEAuditor role or equivalent
- Check permission is assigned at `/` path
- Ensure privilege separation is correctly configured

### Connection Timeout
```
Request timeout after 10000ms
```
- Check network connectivity to Proxmox server
- Verify firewall allows access to port 8006
- Increase `PROXMOX_REQUEST_TIMEOUT_MS` if needed

### TLS Certificate Errors
```
Network error connecting to https://proxmox.example.com:8006
```
- Provide custom CA: `PROXMOX_CA_CERT_PATH=/path/to/ca.pem`
- For development only: `PROXMOX_ALLOW_INSECURE_TLS=true`

### Empty Resources
If VMs or containers show as empty:
- Verify user can access all resource pools
- Check node permissions
- Ensure cluster API is accessible

## Development

### Project Structure
```
tools/proxmox-inventory/
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── jest.config.js         # Test configuration
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
├── README.md              # This file
├── schemas/
│   └── inventory-export.schema.json  # JSON Schema for validation
├── src/
│   ├── cli.ts            # CLI entry point
│   ├── config.ts         # Configuration management
│   ├── client.ts         # Proxmox API client
│   ├── collector.ts      # Collection orchestration
│   ├── normalize.ts      # Data normalization
│   ├── redact.ts         # Security redaction
│   └── types.ts          # TypeScript types
├── tests/
│   ├── fixtures/         # Test fixtures (sanitized)
│   ├── config.test.ts    # Config tests
│   ├── normalize.test.ts # Normalization tests
│   └── redact.test.ts    # Redaction tests
└── output/               # Generated inventory files (gitignored)
```

### Adding New Features

1. **New Resource Types** - Add to `types.ts` and normalization logic in `normalize.ts`
2. **New Metrics** - Extend `NormalizedSystem` interface and collection logic
3. **New API Endpoints** - Add methods to `ProxmoxClient` class

### Code Quality
- TypeScript strict mode enabled
- Comprehensive error handling
- Automatic secret redaction
- Full test coverage for core logic

## License

MIT

## Support

This is a standalone tool designed for the OIS Control Center project. For issues or questions, contact the development team.

---

**Remember**: Always test with non-production infrastructure first and verify token permissions before deploying!
