const fs = require('fs');
const zlib = require('zlib');

function createPNG(width, height, r, g, b) {
  const ihdr = Buffer.alloc(16);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  
  const rawSize = 1 + width * 3;
  const rawData = Buffer.alloc(rawSize * height);
  for (let y = 0; y < height; y++) {
    rawData[y * rawSize] = 0x00;
    for (let x = 0; x < width; x++) {
      const px = y * rawSize + 1 + x * 3;
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  
  const idatLen = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idat = Buffer.concat([idatLen, compressed, Buffer.from([0x49, 0x44, 0x41, 0x54])]);
  
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44]);
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1B, 0x0A]);
  
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]),
    Buffer.from([0x49, 0x48, 0x44, 0x52]),
    ihdr,
    Buffer.alloc(4)
  ]);

  return Buffer.concat([sig, ihdrChunk, idat, iend]);
}

const png = createPNG(1080, 1920, 10, 10, 15);
fs.writeFileSync('screenshots/terminal-view.png', png);
console.log(`Created screenshots/terminal-view.png (${png.length} bytes)`);
