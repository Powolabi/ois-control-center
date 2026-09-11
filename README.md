# OIS Control Center

A private internal control plane for managing infrastructure systems at Owolabi IT Solutions.

## Product Vision

OIS Control Center provides a centralized, searchable source of truth for infrastructure inventory. Track what systems exist, where they're located, how they're connected, and what dependencies exist between them.

## Phase 1: System Inventory (Current)

Phase 1 provides:

- **System Management**: Register, view, edit, search, and archive systems
- **Hierarchical Organization**: Parent-child relationships (Proxmox → VM → Container → Application)
- **Dependency Tracking**: Operational dependencies (app depends on database, website depends on proxy)
- **Location Management**: Physical and cloud location tracking
- **Endpoint Recording**: URLs, APIs, SSH access, management interfaces
- **Audit Logging**: Track inventory changes with timestamps and actors
- **Status & Criticality**: Monitor system health and importance
- **Secure Authentication**: Owner-only access with protected routes

### What Phase 1 Does NOT Include

- Monitoring or alerting
- Automatic system discovery
- SSH execution or remote commands
- Proxmox API integration
- Restart controls or automation
- AI features

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Auth.js (NextAuth v5)
- **Validation**: Zod
- **Testing**: Vitest

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- PostgreSQL 14 or higher
- Docker (optional, for local PostgreSQL)

## Installation

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/Powolabi/ois-control-center.git
cd ois-control-center
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set the following:

```env
# Database Configuration
DATABASE_URL="postgresql://oisadmin:your_password@localhost:5432/ois_control_center?schema=public"
POSTGRES_USER=oisadmin
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=ois_control_center

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_secret_here

# Initial Owner Account (for bootstrap only)
INITIAL_OWNER_EMAIL=admin@owolabi-it.local
INITIAL_OWNER_PASSWORD=your_secure_password_min_12_chars
INITIAL_OWNER_NAME=System Administrator

# Application Configuration
APP_NAME="OIS Control Center"
DEFAULT_ENVIRONMENT=LAB
INVENTORY_REVIEW_INTERVAL_DAYS=30
```

**Generate a secure NextAuth secret:**

```bash
openssl rand -base64 32
```

### 3. Start PostgreSQL

**Option A: Using Docker Compose (Recommended)**

```bash
docker compose up -d
```

**Option B: Use Existing PostgreSQL**

Ensure PostgreSQL is running and create the database:

```bash
psql -U postgres -c "CREATE DATABASE ois_control_center;"
psql -U postgres -c "CREATE USER oisadmin WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ois_control_center TO oisadmin;"
```

### 4. Run Database Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Create Initial Owner Account

```bash
npm run db:bootstrap
```

This creates the initial owner account using credentials from your `.env` file.

**⚠️ Important**: Change the password immediately after first login.

### 6. Seed Development Data (Optional)

```bash
npm run db:seed
```

This creates sample locations and systems for development.

## Development

Start the development server:

```bash
npm run dev
```

Access the application at [http://localhost:3000](http://localhost:3000)

### Other Commands

```bash
# Run linter
npm run lint

# Run tests
npm test
npm run test:watch

# Format Prisma schema
npm run prisma:format

# Validate Prisma schema
npm run prisma:validate

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

## Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Database Schema

### Core Models

**User**
- Owner accounts with secure password hashing
- Session management via Auth.js

**Location**
- Physical locations (home lab, data center)
- Cloud providers (DigitalOcean, AWS, etc.)
- Remote sites

**System**
- Any infrastructure component: servers, VMs, containers, applications, databases, services
- Hierarchical parent-child relationships
- Status tracking (Online, Offline, Warning, Maintenance, Unknown, Retired)
- Criticality levels (Critical, High, Medium, Low)
- Environment classification (Production, Staging, Development, Lab)

**Dependency**
- Operational relationships between systems
- Types: depends_on, connects_to, stores_data_on, routed_through, monitored_by, backed_up_to, provides_service_to

**Endpoint**
- Access points for systems
- URLs, APIs, SSH, management interfaces, database connections

**AuditEvent**
- Automatic tracking of inventory changes
- Records who did what and when

## Security Notes

### Credentials

- **Never store passwords, tokens, API keys, or private keys** in:
  - Source code
  - Database records
  - Seed data
  - Commit history
  - Log files

- Use the "Credential Reference" field to note where credentials are stored, e.g., "Stored in 1Password vault"

### Authentication

- All routes except `/login` require authentication
- Passwords are hashed with bcrypt (12 rounds)
- Sessions expire after 8 hours
- No public registration page

### Rate Limiting

Phase 1 does not include rate limiting. Consider adding this in production using middleware or a reverse proxy.

## Validation Rules

### System Hierarchy

- A system cannot be its own parent
- Circular hierarchies are prevented (A → B → C → A)
- Validation occurs on both create and update

### Dependencies

- A system cannot depend on itself
- Duplicate dependencies are prevented (same source, target, and type)

### IP Addresses

- IPv4 and IPv6 validation when provided
- IP addresses are optional fields

### Resource Allocations

- CPU, memory, and storage allocations must be positive integers

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

Tests cover:
- Utility functions (slugify, IP validation)
- Validation schemas
- Business logic rules

## API Endpoints

All API routes require authentication except where noted.

### Systems

- `POST /api/systems` - Create a new system
- `GET /api/systems/[id]` - Get system details
- `PUT /api/systems/[id]` - Update a system
- `DELETE /api/systems/[id]` - Archive a system

### Authentication

- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running: `pg_isready`
2. Check database exists: `psql -U postgres -l | grep ois_control_center`
3. Verify connection string in `.env`
4. Check firewall rules if using remote database

### Migration Errors

```bash
# Reset database (⚠️ destroys all data)
npx prisma migrate reset

# Apply migrations manually
npx prisma migrate deploy
```

### Prisma Client Issues

```bash
# Regenerate Prisma Client
npm run prisma:generate
```

### Authentication Issues

1. Verify `NEXTAUTH_SECRET` is set in `.env`
2. Check `NEXTAUTH_URL` matches your application URL
3. Clear browser cookies and try again
4. Verify owner account exists: `npm run prisma:studio`

## Project Structure

```
ois-control-center/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Protected pages
│   ├── login/             # Authentication
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── navigation.tsx    # Main navigation
│   ├── system-form.tsx   # System form
│   └── status-badge.tsx  # Status indicators
├── lib/                  # Utilities and configuration
│   ├── auth.ts          # Authentication config
│   ├── prisma.ts        # Prisma client
│   ├── validations.ts   # Zod schemas
│   ├── utils.ts         # Helper functions
│   └── audit.ts         # Audit logging
├── prisma/              # Database
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Seed data
├── scripts/             # Utility scripts
│   └── bootstrap-owner.ts
├── test/                # Tests
├── middleware.ts        # Route protection
└── docker-compose.yml   # PostgreSQL container
```

## Current Limitations

### Phase 1 Constraints

- Manual system registration only
- No automatic monitoring or health checks
- No Proxmox API integration
- No SSH command execution
- No automated backups
- Single owner account (no team management)
- No mobile app

### Known Issues

- Dashboard metrics refresh on page load only
- No real-time updates
- No bulk import/export
- No system templates
- No API documentation UI

## Planned Phase 2: Read-Only Proxmox Integration

Future capabilities:

- View Proxmox VMs and containers
- Display resource usage
- Show VM status and uptime
- Link Proxmox entities to inventory systems
- **Still read-only**: no start/stop/restart controls

## License

UNLICENSED - Internal use only for Owolabi IT Solutions

## Support

This is an internal tool. For support, contact the infrastructure team.

## Development Guidelines

### Adding a New System Type

1. Add enum value to `SystemType` in `prisma/schema.prisma`
2. Run `npm run prisma:migrate`
3. Update form dropdowns in `components/system-form.tsx`
4. No other changes needed

### Adding a New Dependency Type

1. Add enum value to `DependencyType` in `prisma/schema.prisma`
2. Run `npm run prisma:migrate`
3. Update dependency form if one exists

### Adding Audit Events

Use the `createAuditEvent` helper:

```typescript
import { createAuditEvent } from '@/lib/audit'

await createAuditEvent({
  action: 'SYSTEM_CREATED',
  entityId: system.id,
  userId: session.user.id,
  systemId: system.id,
  metadata: { name: system.name },
})
```

## Contributing

Internal project. Follow standard Git flow:

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Create pull request
5. Request review from team lead

## Changelog

### v0.1.0 - Phase 1 Complete

- System inventory with full CRUD
- Location management
- Dependency tracking
- Hierarchical system organization
- Endpoint recording
- Audit logging
- Secure authentication
- Search and filtering
- Dashboard with live metrics
- Responsive mobile design
