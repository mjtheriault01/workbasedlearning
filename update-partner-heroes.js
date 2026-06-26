// node update-partner-heroes.js
// Reads partner-hero-urls.json and updates hero_image in Supabase partners table

const SUPABASE_URL = 'https://bsgrkpykysvqcdqikcym.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZ3JrcHlreXN2cWNkcWlrY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MTE5NzUsImV4cCI6MjA5NTA4Nzk3NX0.brdA4f7v0GC89fRXPTVPZV11KIdZxXyCkLTWWsoe0o0';

const NAME_MAP = {
  'orbis-design':    'orbis',
  'easter-seals':    'easter',
  'firnice-hvac':    'firnice',
  'bulldog-plumbing':'bulldog plumb',
};

async function run() {
  const urls = JSON.parse(require('fs').readFileSync('partner-hero-urls.json', 'utf8'));

  // Fetch all partners
  const res = await fetch(`${SUPABASE_URL}/rest/v1/partners?select=id,company_name`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const partners = await res.json();
  console.log(`Found ${partners.length} partners in Supabase`);

  for (const [slug, url] of Object.entries(urls)) {
    if (!url) { console.log(`  ${slug}: no URL, skipping`); continue; }
    const keyword = NAME_MAP[slug];
    const match = partners.find(p => p.company_name.toLowerCase().includes(keyword));
    if (!match) { console.log(`  ${slug}: no partner found matching "${keyword}"`); continue; }

    const upd = await fetch(`${SUPABASE_URL}/rest/v1/partners?id=eq.${match.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ hero_image: url }),
    });
    if (upd.ok) {
      console.log(`  ✓ ${match.company_name} → hero_image set`);
    } else {
      console.log(`  ✗ ${match.company_name}: ${upd.status} ${await upd.text()}`);
    }
  }
}
run().catch(console.error);
