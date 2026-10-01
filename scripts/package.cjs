// Small dependency-free ZIP writer (stored entries, standard CRC32).
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'extension');
const version = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'))).version;
const output = path.join(root, 'dist', `blob-image-downloader-v${version}.zip`);
function files(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const name = prefix + entry.name;
    return entry.isDirectory() ? files(path.join(dir, entry.name), `${name}/`) : [{ name, bytes: fs.readFileSync(path.join(dir, entry.name)) }];
  });
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
let offset = 0;
const locals = [], central = [];
const entries = [...files(source), { name: 'LICENSE', bytes: fs.readFileSync(path.join(root, 'LICENSE')) }];
for (const entry of entries) {
  const name = Buffer.from(entry.name);
  const crc = crc32(entry.bytes);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x800, 6);
  local.writeUInt16LE(33, 12); // 1980-01-01, reproducible packaging
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(entry.bytes.length, 18);
  local.writeUInt32LE(entry.bytes.length, 22);
  local.writeUInt16LE(name.length, 26);
  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50, 0);
  directory.writeUInt16LE(20, 4);
  directory.writeUInt16LE(20, 6);
  directory.writeUInt16LE(0x800, 8);
  directory.writeUInt16LE(33, 14);
  directory.writeUInt32LE(crc, 16);
  directory.writeUInt32LE(entry.bytes.length, 20);
  directory.writeUInt32LE(entry.bytes.length, 24);
  directory.writeUInt16LE(name.length, 28);
  directory.writeUInt32LE(offset, 42);
  locals.push(local, name, entry.bytes);
  central.push(directory, name);
  offset += local.length + name.length + entry.bytes.length;
}
const centralSize = central.reduce((sum, buffer) => sum + buffer.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, Buffer.concat([...locals, ...central, end]));
console.log(output);
