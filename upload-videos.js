const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME || 'dikkdclum';
const KEY    = process.env.CLOUDINARY_API_KEY    || '';
const SECRET = process.env.CLOUDINARY_API_SECRET || '';

if (!KEY || !SECRET) {
  console.error('Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET'); process.exit(1);
}

function sign(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(sorted + SECRET).digest('hex');
}

async function upload(file, public_id) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { public_id, timestamp };
  const sig = sign(params);
  const buf = fs.readFileSync(file);
  const boundary = '----Boundary' + crypto.randomBytes(8).toString('hex');
  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(file)}"\r\nContent-Type: video/mp4\r\n\r\n`,
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
      path: `/v1_1/${CLOUD}/video/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.error) reject(new Error(j.error.message));
          else resolve(j);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const files = [
    ['videos-compressed/penrose.mp4',   'wbl/video/penrose'],
    ['videos-compressed/incubator.mp4', 'wbl/video/incubator'],
  ];
  for (const [file, public_id] of files) {
    process.stdout.write(`Uploading ${file}... `);
    try {
      await upload(file, public_id);
      console.log(`DONE`);
      console.log(`  -> https://res.cloudinary.com/${CLOUD}/video/upload/f_auto,q_auto/${public_id}.mp4`);
    } catch(e) {
      console.log(`ERROR: ${e.message}`);
    }
  }
})();
