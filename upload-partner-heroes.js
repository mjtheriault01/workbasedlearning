// node upload-partner-heroes.js
const crypto = require('crypto');
const fs = require('fs');

const CLD_CLOUD  = process.env.CLOUDINARY_CLOUD_NAME  || 'dikkdclum';
const CLD_KEY    = process.env.CLOUDINARY_API_KEY     || '587182656355697';
const CLD_SECRET = process.env.CLOUDINARY_API_SECRET  || 'S7EWqPxRxyxJRF0MB1fu93Upn3o';

const HEROES = [
  { file: 'partner-heroes/orbis-design.png',   id: 'orbis-design'   },
  { file: 'partner-heroes/easter-seals.png',    id: 'easter-seals'    },
  { file: 'partner-heroes/firnice-hvac.png',    id: 'firnice-hvac'    },
  { file: 'partner-heroes/bulldog-plumbing.png',id: 'bulldog-plumbing'},
];

function cldSign(params) {
  const str = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + CLD_SECRET;
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function uploadFile(filePath, id) {
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `wbl/partner-heroes/${id}`;
  const params = { public_id: publicId, timestamp };
  const signature = cldSign(params);

  const fileBytes = fs.readFileSync(filePath);
  const b64 = fileBytes.toString('base64');
  const dataUri = `data:image/png;base64,${b64}`;

  const form = new FormData();
  form.append('file', dataUri);
  form.append('public_id', publicId);
  form.append('timestamp', String(timestamp));
  form.append('api_key', CLD_KEY);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, {
    method: 'POST', body: form,
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).secure_url;
}

async function main() {
  const results = {};
  for (const hero of HEROES) {
    process.stdout.write(`  ${hero.id}... `);
    try {
      const url = await uploadFile(hero.file, hero.id);
      results[hero.id] = url;
      console.log(`✓ ${url}`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      results[hero.id] = null;
    }
  }
  fs.writeFileSync('partner-hero-urls.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to partner-hero-urls.json');
}
main().catch(console.error);
