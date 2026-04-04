import * as fs from 'fs';
import * as path from 'path';
import { query, getOne } from './client';
import { now } from '@ouro/core';

/**
 * Database Migrator — Manages schema evolution.
 * 
 * Migrations are numbered SQL files in the migrations/ directory.
 * Each migration runs exactly once, tracked in the migrations table.
 * This is how the meme's memory structure evolves.
 */

interface MigrationRecord {
  id: number;
  filename: string;
  applied_at: string;
  checksum: string;
}

export async function initMigrator(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW(),
      checksum TEXT NOT NULL,
      duration_ms INT DEFAULT 0
    )
  `);
}

export async function runMigrations(migrationsDir?: string): Promise<string[]> {
  const dir = migrationsDir || path.join(__dirname, 'migrations');
  await initMigrator();

  // Get list of SQL files
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Get already-applied migrations
  const applied = new Set(
    (await query('SELECT filename FROM _migrations')).rows.map((r: any) => r.filename)
  );

  const newMigrations: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;

    const filepath = path.join(dir, file);
    const sql = fs.readFileSync(filepath, 'utf-8');
    const checksum = simpleHash(sql);

    console.log(`[Migration] Running: ${file}`);
    const start = Date.now();

    try {
      await query('BEGIN');
      await query(sql);
      await query(
        'INSERT INTO _migrations (filename, checksum, duration_ms) VALUES ($1, $2, $3)',
        [file, checksum, Date.now() - start]
      );
      await query('COMMIT');
      newMigrations.push(file);
      console.log(`[Migration] Applied: ${file} (${Date.now() - start}ms)`);
    } catch (error: any) {
      await query('ROLLBACK');
      console.error(`[Migration] Failed: ${file} — ${error.message}`);
      throw error;
    }
  }

  if (newMigrations.length === 0) {
    console.log('[Migration] Database is up to date.');
  } else {
    console.log(`[Migration] Applied ${newMigrations.length} migration(s).`);
  }

  return newMigrations;
}

export async function getMigrationStatus(): Promise<{
  applied: MigrationRecord[];
  pending: string[];
}> {
  await initMigrator();

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const applied = (await query('SELECT * FROM _migrations ORDER BY id')).rows;
  const appliedNames = new Set(applied.map((r: any) => r.filename));
  const pending = files.filter(f => !appliedNames.has(f));

  return { applied, pending };
}

export async function rollbackLastMigration(): Promise<string | null> {
  const last = await getOne<MigrationRecord>(
    'SELECT * FROM _migrations ORDER BY id DESC LIMIT 1'
  );
  if (!last) return null;

  // Check if a rollback SQL exists
  const dir = path.join(__dirname, 'migrations');
  const rollbackFile = last.filename.replace('.sql', '.rollback.sql');
  const rollbackPath = path.join(dir, rollbackFile);

  if (fs.existsSync(rollbackPath)) {
    const sql = fs.readFileSync(rollbackPath, 'utf-8');
    await query('BEGIN');
    try {
      await query(sql);
      await query('DELETE FROM _migrations WHERE id = $1', [last.id]);
      await query('COMMIT');
      console.log(`[Migration] Rolled back: ${last.filename}`);
      return last.filename;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } else {
    console.warn(`[Migration] No rollback file found for ${last.filename}`);
    return null;
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}
