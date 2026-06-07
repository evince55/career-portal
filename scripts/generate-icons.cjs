const fs = require('fs');
const zlib = require('zlib'); // Node.js built-in

// Minimal valid PNG generator using only Node.js builtins
function createPNG(width, height, r, g, b) {
  const zlib = require('zlib');
  
  // IHDR chunk
  const ihdr = Buffer.alloc(16);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type (truecolor)
  
  // Raw image data with filter bytes
  const rawSize = 1 + width * 3;
  const rawData = Buffer.alloc(rawSize * height);
  for (let y = 0; y < height; y++) {
    rawData[y * rawSize] = 0x00; // filter byte
    for (let x = 0; x < width; x++) {
      const px = y * rawSize + 1 + x * 3;
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
    }
  }

  // Compress with zlib
  const compressed = zlib.deflateSync(rawData);
  
  // Build IDAT chunk
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idat = Buffer.concat([idatLen, compressed, Buffer.from([0x49, 0x44, 0x41, 0x54])]); // length + data + "IDAT"
  
  // IEND chunk
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44]);
  
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1B, 0x0A]);
  
  // Combine IHDR chunk (length + type + data + CRC)
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // length
    Buffer.from([0x49, 0x48, 0x44, 0x52]), // "IDHR"
    ihdr,
    Buffer.alloc(4) // CRC placeholder
  ]);

  const png = Buffer.concat([sig, ihdrChunk, idat, iend]);
  return png;
}

const sizes = [72, 96, 128, 192, 512];
const outputDir = 'icons';

for (const size of sizes) {
  // Gradient from pink to purple based on size
  const t = size / 512;
  const r = Math.floor(255 * (1 - t) + 188 * t);
  const g = Math.floor(0 * (1 - t) + 19 * t);
  const b = Math.floor(255 * (1 - t) + 254 * t);
  
  const png = createPNG(size, size, r, g, b);
  fs.writeFileSync(`${outputDir}/icon-${size}.png`, png);
  console.log(`Created icon-${size}.png (${png.length} bytes)`);
}

console.log('Done!');
