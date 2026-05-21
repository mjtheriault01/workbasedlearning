const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME || 'dikkdclum';
const KEY    = process.env.CLOUDINARY_API_KEY    || '';
const SECRET = process.env.CLOUDINARY_API_SECRET || '';

const FILE      = process.argv[2];
const PUBLIC_ID = process.argv[3];

if (!FILE || !PUBLIC_ID) { console.error('Usage: node upload-single.js <file> <public_id>'); process.exit(1); }

function sign(params) {
  return crypto.createHash('sha1')
    .update(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + SECRET)
    .digest('hex');
}

(async () => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { public_id: PUBLIC_ID, timestamp };
  const sig = sign(params);
  const buf = fs.readFileSync(FILE);
  const boundary = '----Boundary' + crypto.randomBytes(8).toString('hex');
  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(FILE)}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    buf,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${KEY}`,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}`,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="public_id"\r\n\r\n${PUBLIC_ID}`,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="signature"\r\n\r\n${sig}`,
    `\r\n--${boundary}--\r\n`,
  ];
  const body = Buffer.concat(parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));
  const req = https.request({
    hostname: 'api.cloudinary.com',
    path: `/v1_1/${CLOUD}/auto/upload`,
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const j = JSON.parse(d);
      if (j.error) console.log('ERROR:', j.error.message);
      else console.log('OK:', `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto/${PUBLIC_ID}`);
    });
  });
  req.on('error', e => console.log('ERR:', e.message));
  req.write(body);
  req.end();
})();
