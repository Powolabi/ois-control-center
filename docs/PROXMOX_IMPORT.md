# Proxmox Inventory Import Integration

## Overview

The Proxmox Import Integration allows authenticated owners to safely import infrastructure inventory data from Proxmox VE clusters into the OIS Control Center. This is a file-based integration that does not connect directly to live Proxmox servers.

## How It Works

### 1. Generate Export File

Use the standalone Proxmox inventory collector to generate a JSON export file:

```bash
cd tools/proxmox-inventory
npm install
npm run collect
```

This creates a sanitized JSON file containing your Proxmox infrastructure inventory.

### 2. Validate Export

Before importing, you can validate the export file:

```bash
npm run validate -- /path/to/export.json
```

### 3. Upload to OIS Control Center

1. Navigate to **Settings → Integrations → Proxmox Import**
2. Click **Import** or **New Import**
3. Select your JSON export file
4. Click **Generate Preview**

### 4. Review Preview

The preview shows:
- **New**: Resources that will be created as new systems
- **Changed**: Existing systems that will be updated
- **Unchanged**: Systems that match and require no changes
- **Missing**: Previously imported resources not present in current export
- **Conflicts**: Resources requiring manual resolution

### 5. Select Target Location

Choose the location where new systems will be created. This is required for all new Proxmox resources.

### 6. Resolve Conflicts

For any conflicts detected, you must choose:
- **Import as new system**: Create a new system record
- **Skip this resource**: Do not import this resource

### 7. Confirm and Import

Review the summary and confirm to execute the import. The operation will:
- Create new system records
- Update existing systems with fresh Proxmox data
- Establish parent-child relationships
- Create external resource mappings
- Record the import in the audit log

### 8. View Results

After import completes, you can:
- View created and updated systems
- Check the import history
- Review audit events

## Matching Rules

The import uses deterministic matching in this priority order:

1. **Existing external-resource mapping**: If a system was previously imported with this external ID, it will be updated
2. **Stable external ID**: Proxmox resources use stable external IDs like `proxmox:vm:node-name:100`
3. **Manual resolution**: Ambiguous matches require manual confirmation

The import will **never** automatically match systems based solely on similar names to prevent accidental overwrites.

## Field Ownership

### Import-Owned Fields (Updated by Import)
- Status (online/offline/warning/unknown)
- VM/Container ID
- CPU allocation
- Memory allocation
- Storage allocation
- Platform version
- Hostname (if provided by Proxmox)

### Manually-Owned Fields (Preserved)
- Description
- Notes
- Tags
- Owner
- Criticality
- Environment
- Credential reference
- Custom endpoints
- Business purpose
- Maintenance information

**Important**: Import-owned fields will only be updated if the new value is not null or empty. Manual data is never overwritten with missing import data.

## Missing Resources

If a resource was previously imported but is absent from a new export:
- It is **not automatically deleted**
- It is **not automatically archived**
- It is marked as "missing" in the import report
- Manual fields and history are preserved
- The owner can decide later whether to archive or keep it

## Parent-Child Relationships

The import automatically establishes infrastructure relationships:
- Virtual machines → Proxmox host
- Containers → Proxmox host
- Storage → Proxmox node

The import prevents:
- Self-relationships
- Circular parent chains
- Duplicate relationships

## Security

### What the Import Does NOT Do
- ❌ Request or store Proxmox credentials
- ❌ Connect directly to a Proxmox server
- ❌ Execute commands on Proxmox
- ❌ Start, stop, or modify VMs
- ❌ Import authorization tokens
- ❌ Accept executable content
- ❌ Expose internal errors or paths

### What the Import Does
- ✅ Validate file size (10MB limit)
- ✅ Validate JSON schema
- ✅ Validate schema version
- ✅ Sanitize error messages
- ✅ Require owner authentication
- ✅ Use database transactions
- ✅ Record audit events
- ✅ Preserve manual data

## Import History

All imports are recorded in the import history:
- Navigate to **Settings → Integrations → View Import History**
- View details for any past import
- See statistics (new, updated, unchanged, missing, conflicts)
- Track which user initiated the import
- Review timestamps and duration

## Supported Schema Version

Current supported version: **1.0**

If you receive an "unsupported schema version" error:
- Update the Proxmox collector tool to the latest version
- Or update the OIS Control Center to support the newer schema

## Troubleshooting

### "File size exceeds 10MB limit"
Your Proxmox cluster has a very large number of resources. Contact support for guidance on handling large inventories.

### "Unsupported schema version"
The export file was generated with a newer collector version. Update either the collector or the OIS Control Center.

### "Missing schemaVersion field"
The file is not a valid Proxmox inventory export. Verify you are using the correct collector tool.

### "No locations available"
You must create at least one location before importing. Navigate to **Locations** and create a location for your Proxmox infrastructure.

### "Conflict detected"
The import found an existing system that might match the imported resource but cannot confirm it automatically. Choose whether to:
- Create a new system (if it's genuinely new)
- Skip the resource (if you don't want to import it)

## Future Enhancements

The following features are **not yet implemented** but are planned:

- Direct API connection to Proxmox (Phase 3)
- Scheduled automatic imports
- Automatic conflict resolution based on user-defined rules
- Multi-cluster import in a single operation
- Import rollback functionality

## API Endpoints

The import integration exposes these authenticated API endpoints:

- `POST /api/imports/proxmox/preview` - Generate import preview
- `POST /api/imports/proxmox/execute` - Execute confirmed import
- `GET /api/imports/history` - List import history
- `GET /api/imports/[id]` - Get import run details

## Database Schema

The import integration adds these models:

- **ImportSource**: Tracks Proxmox clusters
- **ExternalResourceMapping**: Links Proxmox resources to OIS systems
- **ImportRun**: Records every import attempt with statistics

## Audit Events

The following audit events are recorded:

- `IMPORT_STARTED`: Import execution began
- `IMPORT_PREVIEW_GENERATED`: Preview was generated
- `IMPORT_COMPLETED`: Import finished successfully
- `IMPORT_FAILED`: Import encountered an error
- `IMPORT_SYSTEM_CREATED`: New system created by import
- `IMPORT_SYSTEM_UPDATED`: Existing system updated by import
- `IMPORT_MAPPING_CREATED`: External mapping established
- `IMPORT_CONFLICT_RESOLVED`: Conflict was manually resolved
