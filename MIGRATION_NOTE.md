# Database Migration Required

This feature branch adds new database models for the Proxmox Import Integration:

## New Models
- `ImportSource` - Tracks external inventory sources (Proxmox clusters)
- `ExternalResourceMapping` - Maps external resources to OIS systems
- `ImportRun` - Records import history with statistics

## New Enums
- `ImportSourceType` - Source type (PROXMOX)
- `ExternalResourceType` - External resource types
- `ImportStatus` - Import run status
- `AuditAction` - Added import-related audit actions

## Migration

When a PostgreSQL database is available, create the migration:

```bash
npx prisma migrate dev --name add_proxmox_import_models
```

Or in production:

```bash
npx prisma migrate deploy
```

## Schema Changes

The migration will:
1. Create `import_sources` table
2. Create `external_resource_mappings` table
3. Create `import_runs` table
4. Add new enum types
5. Add foreign key relationships
6. Create indexes for performance

## Rollback

If needed, the migration can be rolled back by:
1. Dropping the three new tables
2. Removing the new enum values
3. Regenerating Prisma client

## Testing

After migration:
```bash
npm run prisma:studio
```

Verify the new tables appear in Prisma Studio.
