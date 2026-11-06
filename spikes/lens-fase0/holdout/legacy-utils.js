const util = require('util');
const path = require('path');
const zlib = require('zlib');
const assert = require('assert');
const querystring = require('querystring');

function isList(value) {
  return util.isArray(value);
}

function unpack(buffer) {
  const raw = zlib.gunzipSync(buffer);
  return querystring.parse(raw.toString());
}

function extOf(file) {
  return path.extname(file).toLowerCase();
}

assert.strictEqual(extOf('a.TXT'), '.txt');
process.on('exit', (code) => console.error('bye', code));
module.exports = { isList, unpack, extOf, cwd: process.cwd() };
