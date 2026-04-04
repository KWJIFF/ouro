import { runMigrations, getMigrationStatus, rollbackLastMigration } from './migrator';

const command = process.argv[2] || 'up';

async function main() {
  switch (command) {
    case 'up':
      await runMigrations();
      break;
    case 'status':
      const status = await getMigrationStatus();
      console.log(`Applied: ${status.applied.length}`);
      for (const m of status.applied) {
        console.log(`  ✅ ${m.filename} (${m.applied_at})`);
      }
      console.log(`Pending: ${status.pending.length}`);
      for (const f of status.pending) {
        console.log(`  ⏳ ${f}`);
      }
      break;
    case 'rollback':
      const rolled = await rollbackLastMigration();
      if (rolled) console.log(`Rolled back: ${rolled}`);
      else console.log('Nothing to roll back.');
      break;
    default:
      console.log('Usage: tsx src/db/migrate.ts [up|status|rollback]');
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
