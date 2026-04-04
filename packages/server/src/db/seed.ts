import { seedDevelopmentData } from './seeder';

async function main() {
  console.log('🌱 Seeding development data...\n');
  const counts = await seedDevelopmentData();
  console.log('\n✅ Seed complete:', counts);
  process.exit(0);
}

main().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
