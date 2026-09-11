#!/usr/bin/env node
/**
 * CLI for Proxmox Inventory Collector
 */

import { writeFileSync, readFileSync, mkdirSync, renameSync } from 'fs';
import { dirname, resolve } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { loadConfig, getSafeConfig } from './config.js';
import { ProxmoxClient } from './client.js';
import { ProxmoxCollector } from './collector.js';
import type { InventoryExport } from './types.js';

const SCHEMA_PATH = resolve(dirname(new URL(import.meta.url).pathname), '../schemas/inventory-export.schema.json');

/**
 * Load and compile the JSON schema
 */
function loadSchema() {
  const schemaContent = readFileSync(SCHEMA_PATH, 'utf-8');
  return JSON.parse(schemaContent);
}

/**
 * Validate inventory export against JSON schema
 */
function validateInventory(inventory: InventoryExport): { valid: boolean; errors: string[] } {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = loadSchema();
  const validate = ajv.compile(schema);
  
  const valid = validate(inventory);
  const errors = validate.errors
    ? validate.errors.map(err => `${err.instancePath} ${err.message}`)
    : [];
  
  return { valid: !!valid, errors };
}

/**
 * Safely write output file using atomic rename
 */
function writeOutputSafely(path: string, data: string): void {
  const dir = dirname(path);
  const tempPath = `${path}.tmp`;
  
  // Ensure output directory exists
  mkdirSync(dir, { recursive: true });
  
  // Write to temporary file
  writeFileSync(tempPath, data, 'utf-8');
  
  // Atomic rename
  renameSync(tempPath, path);
}

/**
 * Print summary statistics
 */
function printSummary(inventory: InventoryExport): void {
  console.log('\n=== Collection Summary ===');
  console.log(`Generated at: ${inventory.generatedAt}`);
  console.log(`Source: ${inventory.source.name} (${inventory.source.type})`);
  if (inventory.source.version) {
    console.log(`Version: ${inventory.source.version}`);
  }
  
  const systemsByType = inventory.systems.reduce((acc, system) => {
    acc[system.type] = (acc[system.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`\nSystems: ${inventory.systems.length} total`);
  for (const [type, count] of Object.entries(systemsByType)) {
    console.log(`  - ${type}: ${count}`);
  }
  
  console.log(`Relationships: ${inventory.relationships.length}`);
  
  if (inventory.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${inventory.warnings.length}`);
    for (const warning of inventory.warnings) {
      console.log(`  - [${warning.severity || 'MEDIUM'}] ${warning.message} (${warning.context})`);
    }
  }
}

/**
 * Collect command
 */
async function collect(dryRun: boolean = false): Promise<void> {
  try {
    console.log('=== Proxmox Inventory Collector ===\n');
    
    // Load configuration
    const config = loadConfig();
    const safeConfig = getSafeConfig(config);
    console.log('Configuration loaded:');
    console.log(`  Base URL: ${safeConfig.baseUrl}`);
    console.log(`  Token ID: ${safeConfig.tokenId}`);
    console.log(`  Timeout: ${safeConfig.requestTimeoutMs}ms`);
    console.log(`  TLS Insecure: ${safeConfig.allowInsecureTls}`);
    if (safeConfig.caCertPath) {
      console.log(`  CA Cert: ${safeConfig.caCertPath}`);
    }
    console.log();

    // Create client and collector
    const client = new ProxmoxClient(config);
    const collector = new ProxmoxCollector(client);

    // Collect inventory
    const inventory = await collector.collect();

    // Validate
    console.log('\nValidating export against schema...');
    const validation = validateInventory(inventory);
    if (!validation.valid) {
      console.error('❌ Validation failed:');
      for (const error of validation.errors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }
    console.log('✓ Validation passed');

    // Print summary
    printSummary(inventory);

    // Write output (unless dry run)
    if (dryRun) {
      console.log('\n🏃 Dry run mode - output file not written');
    } else {
      const outputData = JSON.stringify(inventory, null, 2);
      writeOutputSafely(config.outputPath, outputData);
      console.log(`\n✓ Inventory written to: ${config.outputPath}`);
      console.log(`  Size: ${(outputData.length / 1024).toFixed(2)} KB`);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Collection failed:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    if ((error as any).details) {
      console.error('Details:', (error as any).details);
    }
    process.exit(1);
  }
}

/**
 * Validate command
 */
async function validateCommand(filePath: string): Promise<void> {
  try {
    console.log(`=== Validating ${filePath} ===\n`);
    
    // Read file
    const content = readFileSync(filePath, 'utf-8');
    const inventory: InventoryExport = JSON.parse(content);
    
    // Validate
    const validation = validateInventory(inventory);
    
    if (validation.valid) {
      console.log('✓ Validation passed');
      printSummary(inventory);
      process.exit(0);
    } else {
      console.error('❌ Validation failed:');
      for (const error of validation.errors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Validation error:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'collect') {
    const dryRun = args.includes('--dry-run');
    await collect(dryRun);
  } else if (command === 'validate') {
    const filePath = args[1];
    if (!filePath) {
      console.error('Usage: validate <file-path>');
      process.exit(1);
    }
    await validateCommand(filePath);
  } else {
    console.log('Proxmox Inventory Collector');
    console.log('\nUsage:');
    console.log('  collect [--dry-run]  Collect inventory from Proxmox');
    console.log('  validate <file>      Validate an inventory export file');
    console.log('\nExamples:');
    console.log('  npm run collect');
    console.log('  npm run collect -- --dry-run');
    console.log('  npm run validate -- ./output/proxmox-inventory.json');
    process.exit(command ? 1 : 0);
  }
}

main();
