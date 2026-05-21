const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME || 'dikkdclum';
const KEY    = process.env.CLOUDINARY_API_KEY    || '';
const SECRET = process.env.CLOUDINARY_API_SECRET || '';

if (!KEY || !SECRET) { console.error('Set credentials'); process.exit(1); }

function sign(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(sorted + SECRET).digest('hex');
}

function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

async function upload(file, public_id) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { public_id, timestamp };
  const sig = sign(params);
  const buf = fs.readFileSync(file);
  const boundary = '----Boundary' + crypto.randomBytes(8).toString('hex');
  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(file)}"\r\nContent-Type: ${mimeType(file)}\r\n\r\n`,
    buf,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${KEY}`,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}`,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="public_id"\r\n\r\n${public_id}`,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="signature"\r\n\r\n${sig}`,
    `\r\n--${boundary}--\r\n`,
  ];
  const body = Buffer.concat(parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD}/image/upload`,
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { const j = JSON.parse(d); if (j.error) reject(new Error(j.error.message)); else resolve(j); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const logos = [
  ['partner-logos/organic-life.webp',       'wbl/logos/organic-life'],
  ['partner-logos/batavia-library.svg',      'wbl/logos/batavia-library'],
  ['partner-logos/bps101.png',               'wbl/logos/bps101'],
  ['partner-logos/orbis-design-light.png',   'wbl/logos/orbis-design'],
  ['partner-logos/easter-seals.svg',         'wbl/logos/easter-seals'],
  ['partner-logos/firnice-hvac.svg',         'wbl/logos/firnice-hvac'],
  ['partner-logos/bulldog-plumbing.png',     'wbl/logos/bulldog-plumbing'],
];

(async () => {
  for (const [file, public_id] of logos) {
    process.stdout.write(`Uploading ${path.basename(file)}... `);
    try {
      await upload(file, public_id);
      console.log(`OK → https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,h_80/${public_id}`);
    } catch(e) {
      console.log(`ERROR: ${e.message}`);
    }
  }
})();
