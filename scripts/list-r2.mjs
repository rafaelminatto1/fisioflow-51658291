import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = {};
const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...v] = line.split('=');
    if (key && v.length) env[key.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env['R2_ACCESS_KEY_ID'],
    secretAccessKey: env['R2_SECRET_ACCESS_KEY'],
  },
});

async function list() {
  console.log('Listing files in fisioflow-media...');
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: 'fisioflow-media',
    MaxKeys: 5
  }));
  
  if (res.Contents) {
    res.Contents.forEach(obj => {
      console.log(`🔗 https://moocafisio.com.br/${obj.Key}`);
    });
  } else {
    console.log('Bucket is empty!');
  }
}

list().catch(console.error);
