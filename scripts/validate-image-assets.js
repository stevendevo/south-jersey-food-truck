'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const manifest = require('../public/optimized/manifest.json');
const { imageAsset, hasVerifiedTruckImage } = require('../utils');

const publicRoot = path.resolve(__dirname, '../public');
let sourceBytes = 0;
let outputBytes = 0;
for (const [source, entry] of Object.entries(manifest)) {
  const original = fs.readFileSync(path.join(publicRoot, source));
  const output = fs.readFileSync(path.join(publicRoot, entry.url));
  assert.equal(createHash('sha256').update(original).digest('hex'), entry.sourceSha256, `stale optimized asset: ${source}`);
  assert.equal(output.length, entry.bytes, `truncated optimized asset: ${entry.url}`);
  assert.equal(original.length, entry.sourceBytes);
  assert.equal(output.toString('ascii', 0, 4), 'RIFF');
  assert.equal(output.toString('ascii', 8, 12), 'WEBP');
  assert.equal(output.readUInt32LE(4) + 8, output.length, `invalid WebP size: ${entry.url}`);
  assert.ok(entry.width > 0 && entry.height > 0 && entry.width <= 1200, `invalid image dimensions: ${source}`);
  assert.equal(imageAsset(source).url, entry.url);
  sourceBytes += original.length;
  outputBytes += output.length;
}
assert.ok(Object.keys(manifest).length > 0);
assert.ok(outputBytes < sourceBytes, 'optimized assets must reduce transferred bytes');
assert.equal(hasVerifiedTruckImage({ image_url: 'http://example.com/truck.jpg' }), false, 'insecure images must not be embedded');
assert.equal(hasVerifiedTruckImage({ image_url: '//example.com/truck.jpg' }), false);
assert.equal(hasVerifiedTruckImage({ image_url: '/seed/cat_bbq.png' }), false, 'category art is not a truck photo');
console.log(`Image assets passed: ${Object.keys(manifest).length} intact WebP files, source hashes match, ${sourceBytes} -> ${outputBytes} bytes (${Math.round((1 - outputBytes / sourceBytes) * 100)}% smaller), unsafe images excluded.`);
