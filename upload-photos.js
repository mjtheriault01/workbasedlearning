/**
 * Cloudinary Photo Upload Script
 * Run: node upload-photos.js
 *
 * Usage (easiest):
 *   .\setup-cloudinary.ps1
 *
 * Or manually:
 *   $env:CLOUDINARY_CLOUD_NAME="dikkdclum"
 *   $env:CLOUDINARY_API_KEY="587182656355697"
 *   $env:CLOUDINARY_API_SECRET="S7EWqPxRxyxJRF0MB1fu93Upn3o"
 *   node upload-photos.js
 *
 * Then copy the printed URLs into index.html.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── CONFIGURE THESE ────────────────────────────────────────────────────────
const CLOUD_NAME   = process.env.CLOUDINARY_CLOUD_NAME  || 'dikkdclum';
const API_KEY      = process.env.CLOUDINARY_API_KEY     || '';
const API_SECRET   = process.env.CLOUDINARY_API_SECRET  || '';
// ────────────────────────────────────────────────────────────────────────────

if (!API_KEY || !API_SECRET) {
  console.error('\n❌  Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET before running.');
  console.error('    Example (PowerShell):');
  console.error('      $env:CLOUDINARY_API_KEY="your_key"');
  console.error('      $env:CLOUDINARY_API_SECRET="your_secret"');
  console.error('      node upload-photos.js\n');
  process.exit(1);
}

// ─── FILES TO UPLOAD ─────────────────────────────────────────────────────────
// Photoshoot folder (resolved from .lnk shortcut)
const PHOTO_SHOOT_DIR = 'G:\\.shortcut-targets-by-id\\1CUQkzJGilnmcscTQjNWz9t3j4ZxTyWvO\\fieldexperiences-photoshoot-15May2026';
const HEADSHOTS_DIR   = "G:\\My Drive\\!Mike's AI work\\workbasedlearning\\photos";
const INCUBATOR_DIR   = 'G:\\.shortcut-targets-by-id\\1VbQ7xgcxojK0YU5N-XlA2DoysWHmFRWW\\WBL site content\\Shared photos videos Incubator link';

const uploads = [
  // Team headshots
  { file: path.join(HEADSHOTS_DIR, 'Mike Pic.jpg'),   public_id: 'wbl/team/michael-theriault' },
  { file: path.join(HEADSHOTS_DIR, 'Austun Pic.jpg'), public_id: 'wbl/team/austun-savitski'   },

  // Hero slideshow — 5 shots spread across the photoshoot range
  // Swap these filenames for whichever shots you prefer
  { file: path.join(PHOTO_SHOOT_DIR, 'IMG_E7109.HEIC'), public_id: 'wbl/hero/hero-1' },
  { file: path.join(PHOTO_SHOOT_DIR, 'IMG_E7130.HEIC'), public_id: 'wbl/hero/hero-2' },
  { file: path.join(PHOTO_SHOOT_DIR, 'IMG_E7155.HEIC'), public_id: 'wbl/hero/hero-3' },
  { file: path.join(PHOTO_SHOOT_DIR, 'IMG_E7178.HEIC'), public_id: 'wbl/hero/hero-4' },
  { file: path.join(PHOTO_SHOOT_DIR, 'IMG_E7205.HEIC'), public_id: 'wbl/hero/hero-5' },

  // Incubator student photos
  { file: path.join(INCUBATOR_DIR, 'Olivia McKay', 'IMG_0545.jpeg'), public_id: 'wbl/students/incubator-1' },
  { file: path.join(INCUBATOR_DIR, 'Olivia McKay', 'IMG_0337.jpeg'), public_id: 'wbl/students/incubator-2' },
  { file: path.join(INCUBATOR_DIR, 'Olivia McKay', 'IMG_7742.jpeg'), public_id: 'wbl/students/incubator-3' },
  { file: path.join(INCUBATOR_DIR, 'Vikashani',    'IMG_9168.jpeg'), public_id: 'wbl/students/incubator-4' },
  { file: path.join(INCUBATOR_DIR, 'Vikashani',    'IMG_9945.jpeg'), public_id: 'wbl/students/incubator-5' },
];

// ─── UPLOAD LOGIC ────────────────────────────────────────────────────────────
function sign(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(sorted + API_SECRET).digest('hex');
}

async function uploadFile({ file, public_id }) {
  if (!fs.existsSync(file)) {
    console.warn(`  ⚠  Skipping (not found): ${file}`);
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { public_id, timestamp };
  const signature = sign(params);

  const fileBuffer = fs.readFileSync(file);
  const boundary = '----FormBoundary' + crypto.randomBytes(8).toString('hex');

  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(file)}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    fileBuffer,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${API_KEY}`,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}`,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="public_id"\r\n\r\n${public_id}`,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="signature"\r\n\r\n${signature}`,
    `\r\n--${boundary}--\r\n`,
  ];

  const body = Buffer.concat(parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/auto/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error.message));
          else resolve(json);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('\n📸  Cloudinary Photo Upload\n');
  const results = {};

  for (const item of uploads) {
    process.stdout.write(`  Uploading ${path.basename(item.file)}... `);
    try {
      const res = await uploadFile(item);
      if (res) {
        const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${item.public_id}`;
        results[item.public_id] = url;
        console.log('✅');
        console.log(`    → ${url}`);
      }
    } catch (err) {
      console.log(`❌  ${err.message}`);
    }
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log('Done! Update index.html with these URLs:\n');

  if (results['wbl/team/michael-theriault']) {
    console.log('Michael photo (Meet the Team + For Business section):');
    console.log(`  id="photo-michael" src="${results['wbl/team/michael-theriault']}"`);
  }
  if (results['wbl/team/austun-savitski']) {
    console.log('\nAustun photo (Meet the Team section):');
    console.log(`  id="photo-austun" src="${results['wbl/team/austun-savitski']}"`);
  }

  const heroKeys = Object.keys(results).filter(k => k.startsWith('wbl/hero/'));
  if (heroKeys.length) {
    console.log('\nHero slideshow (replace the existing panel-* placeholder URLs in order):');
    heroKeys.forEach((k, i) => console.log(`  Slide ${i + 1}: ${results[k]}`));
  }

  const studentKeys = Object.keys(results).filter(k => k.startsWith('wbl/students/'));
  if (studentKeys.length) {
    console.log('\nIncubator student photos:');
    studentKeys.forEach(k => console.log(`  ${k}: ${results[k]}`));
  }
}

main();
