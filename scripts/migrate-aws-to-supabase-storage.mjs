#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const DEFAULT_STORAGE_BUCKET = 'lbc-assets';

const args = new Set(process.argv.slice(2));
const writeMode = args.has('--write') || args.has('--execute');
const outArgIndex = process.argv.findIndex((arg) => arg === '--out');
const outPath = outArgIndex >= 0 ? process.argv[outArgIndex + 1] : null;

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const [name, ...valueParts] = trimmed.split('=');
    if (!process.env[name]) {
      process.env[name] = valueParts.join('=').replace(/^['"]|['"]$/g, '');
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
const awsRegion = process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'eu-north-1';
const defaultAwsBucket =
  process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME ||
  process.env.AWS_S3_BUCKET_NAME ||
  'londonbridgeproject';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const s3Client = new S3Client({
  region: awsRegion,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

const sources = [
  { table: 'users', columns: ['profile_image_key', 'banner_image_key'] },
  { table: 'partners', columns: ['logo_key'] },
  { table: 'benefits', columns: ['image_key'] },
  { table: 'opportunities', columns: ['image_key'] },
  { table: 'events', columns: ['image_key'] },
  { table: 'post_media', columns: ['s3_key'], bucketColumn: 's3_bucket_name' },
  { table: 'messages', columns: ['attachment_key', 'file_key'] },
];

const report = {
  mode: writeMode ? 'write' : 'dry-run',
  storageBucket,
  scanned: [],
  copied: [],
  alreadyExists: [],
  missingSource: [],
  failed: [],
  skipped: [],
  schemaWarnings: [],
};

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function normalizeSourceKey(rawKey, fallbackBucket) {
  if (!rawKey || typeof rawKey !== 'string') return null;
  const trimmed = rawKey.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed);
    if (url.hostname.includes('supabase.co')) {
      return { skipReason: 'alreadySupabaseUrl', rawKey: trimmed };
    }

    const s3HostMatch = url.hostname.match(/^(.+)\.s3[.-]/);
    const bucket = s3HostMatch?.[1] || fallbackBucket || defaultAwsBucket;
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    return key ? { key, bucket, rawKey: trimmed } : null;
  }

  return {
    key: trimmed.replace(/^\/+/, ''),
    bucket: fallbackBucket || defaultAwsBucket,
    rawKey: trimmed,
  };
}

async function safeSelect(table, columns, bucketColumn) {
  const selectColumns = bucketColumn ? [...columns, bucketColumn] : columns;
  const { data, error } = await supabase.from(table).select(selectColumns.join(','));

  if (!error) return data || [];

  if (table !== 'messages') {
    report.schemaWarnings.push({ table, columns: selectColumns, error: error.message });
    return [];
  }

  const rowsByColumn = [];
  for (const column of columns) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from(table)
      .select(column);

    if (fallbackError) {
      report.schemaWarnings.push({ table, columns: [column], error: fallbackError.message });
    } else {
      rowsByColumn.push(...(fallbackData || []));
    }
  }

  return rowsByColumn;
}

async function collectObjects() {
  const objectMap = new Map();

  for (const source of sources) {
    const rows = await safeSelect(source.table, source.columns, source.bucketColumn);
    report.scanned.push({
      table: source.table,
      columns: source.columns,
      rowCount: rows.length,
    });

    for (const row of rows) {
      const bucket = source.bucketColumn ? row[source.bucketColumn] || defaultAwsBucket : defaultAwsBucket;

      for (const column of source.columns) {
        const normalized = normalizeSourceKey(row[column], bucket);
        if (!normalized) continue;

        if (normalized.skipReason) {
          report.skipped.push({
            table: source.table,
            column,
            key: normalized.rawKey,
            reason: normalized.skipReason,
          });
          continue;
        }

        const mapKey = `${normalized.bucket}::${normalized.key}`;
        if (!objectMap.has(mapKey)) {
          objectMap.set(mapKey, {
            key: normalized.key,
            awsBucket: normalized.bucket,
            references: [],
          });
        }

        objectMap.get(mapKey).references.push({
          table: source.table,
          column,
        });
      }
    }
  }

  return [...objectMap.values()];
}

async function supabaseObjectExists(key) {
  const pathParts = key.split('/');
  const fileName = pathParts.pop();
  const folder = pathParts.join('/');

  const { data, error } = await supabase.storage
    .from(storageBucket)
    .list(folder, { limit: 1000, search: fileName });

  if (error) {
    throw new Error(`Supabase list failed for ${key}: ${error.message}`);
  }

  return (data || []).some((item) => item.name === fileName);
}

async function copyObject(object) {
  if (await supabaseObjectExists(object.key)) {
    report.alreadyExists.push(object);
    return;
  }

  let s3Object;
  try {
    s3Object = await s3Client.send(
      new GetObjectCommand({
        Bucket: object.awsBucket,
        Key: object.key,
      })
    );
  } catch (error) {
    const statusCode = error?.$metadata?.httpStatusCode;
    if (statusCode === 404 || error?.name === 'NoSuchKey' || error?.name === 'NotFound') {
      report.missingSource.push({
        ...object,
        error: error.message || 'S3 object not found',
      });
      return;
    }

    report.failed.push({
      ...object,
      stage: 'download',
      error: error.message || String(error),
    });
    return;
  }

  try {
    const buffer = await streamToBuffer(s3Object.Body);
    const { error } = await supabase.storage
      .from(storageBucket)
      .upload(object.key, buffer, {
        contentType: s3Object.ContentType,
        upsert: false,
      });

    if (error) {
      if (error.message.toLowerCase().includes('already exists')) {
        report.alreadyExists.push(object);
        return;
      }

      report.failed.push({
        ...object,
        stage: 'upload',
        error: error.message,
      });
      return;
    }

    report.copied.push(object);
  } catch (error) {
    report.failed.push({
      ...object,
      stage: 'upload',
      error: error.message || String(error),
    });
  }
}

const objects = await collectObjects();
report.totalUniqueObjects = objects.length;

if (!writeMode) {
  report.dryRunObjects = objects;
} else {
  for (const object of objects) {
    await copyObject(object);
  }
}

const output = JSON.stringify(report, null, 2);
if (outPath) {
  fs.writeFileSync(path.resolve(process.cwd(), outPath), `${output}\n`);
}

console.log(output);
