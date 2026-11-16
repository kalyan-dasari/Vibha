import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import esbuild from 'esbuild';

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateAppIcons(iconsDir) {
  const size = 256;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter None
    for (let x = 0; x < size; x += 1) {
      const idx = rowStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded icon background mask
      const rx = Math.max(0, Math.abs(dx) - 72);
      const ry = Math.max(0, Math.abs(dy) - 72);
      const rDist = Math.sqrt(rx * rx + ry * ry);

      if (rDist > 56) {
        raw[idx] = 0;
        raw[idx + 1] = 0;
        raw[idx + 2] = 0;
        raw[idx + 3] = 0;
        continue;
      }

      // Base slate #0B0F17
      let r = 11;
      let g = 15;
      let b = 23;

      // Outer sky ring
      if (dist >= 70 && dist <= 82) {
        r = 56;
        g = 189;
        b = 248;
      } else if (dist >= 33 && dist <= 43) {
        // Inner white ring
        r = 248;
        g = 250;
        b = 252;
      } else if (dist <= 15) {
        // Core aperture dot
        r = 56;
        g = 189;
        b = 248;
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });
  const pngBuffer = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  fs.mkdirSync(iconsDir, { recursive: true });
  fs.writeFileSync(path.join(iconsDir, 'icon.png'), pngBuffer);

  // Wrap 256x256 PNG into a valid Windows .ico container
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // type: ICO
  icoHeader.writeUInt16LE(1, 4); // count: 1 image

  const dirEntry = Buffer.alloc(16);
  dirEntry[0] = 0; // 0 represents 256px
  dirEntry[1] = 0; // 0 represents 256px
  dirEntry[2] = 0; // color palette
  dirEntry[3] = 0; // reserved
  dirEntry.writeUInt16LE(1, 4); // color planes
  dirEntry.writeUInt16LE(32, 6); // bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8);
  dirEntry.writeUInt32LE(22, 12); // offset = 6 + 16

  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), Buffer.concat([icoHeader, dirEntry, pngBuffer]));
}

async function build() {
  const iconsDir = path.resolve('resources/icons');
  const icoPath = path.join(iconsDir, 'icon.ico');
  const pngPath = path.join(iconsDir, 'icon.png');

  // If icon.png exists but icon.ico is missing on Windows, generate multi-resolution ICO from icon.png
  if (fs.existsSync(pngPath) && !fs.existsSync(icoPath) && process.platform === 'win32') {
    try {
      const { spawnSync } = await import('node:child_process');
      const psScript = path.resolve('scripts/generate-ico.ps1');
      if (fs.existsSync(psScript)) {
        spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', psScript], { stdio: 'inherit' });
      }
    } catch {
      generateAppIcons(iconsDir);
    }
  } else if (!fs.existsSync(icoPath) && !fs.existsSync(pngPath)) {
    generateAppIcons(iconsDir);
  }

  await Promise.all([
    esbuild.build({
      entryPoints: ['electron/main/index.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      outfile: 'dist-electron/main/index.cjs',
      external: ['electron'],
      sourcemap: false,
      minify: false,
    }),
    esbuild.build({
      entryPoints: ['electron/preload/index.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      outfile: 'dist-electron/preload/index.cjs',
      external: ['electron'],
      sourcemap: false,
      minify: false,
    }),
  ]);

  console.log('Built Electron main, preload, and Windows icons.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
