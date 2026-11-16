const fs = require('node:fs');
const path = require('node:path');
const { app, nativeImage } = require('electron');

app.whenReady().then(() => {
  const srcPath = path.resolve(__dirname, '../resources/icons/icon.png');
  if (!fs.existsSync(srcPath)) {
    console.error('Source icon.png not found at:', srcPath);
    app.exit(1);
    return;
  }

  const img = nativeImage.createFromPath(srcPath);
  const origSize = img.getSize();
  console.log('Original image size:', origSize.width, 'x', origSize.height);

  const sizes = [256, 128, 64, 48, 32, 16];
  const images = [];

  for (const s of sizes) {
    const resized = img.resize({ width: s, height: s, quality: 'best' });
    const png = resized.toPNG();
    images.push({ size: s, data: png });
    console.log(`Resized ${s}x${s}: ${png.length} bytes`);
  }

  // Build multi-resolution ICO file
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(count, 4); // count of images

  let offset = 6 + count * 16;
  const dirEntries = [];
  const dataBuffers = [];

  for (const item of images) {
    const entry = Buffer.alloc(16);
    const dim = item.size >= 256 ? 0 : item.size;
    entry.writeUInt8(dim, 0); // width (0 = 256)
    entry.writeUInt8(dim, 1); // height (0 = 256)
    entry.writeUInt8(0, 2);   // color palette
    entry.writeUInt8(0, 3);   // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.data.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data

    dirEntries.push(entry);
    dataBuffers.push(item.data);
    offset += item.data.length;
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...dataBuffers]);
  const outPath = path.resolve(__dirname, '../resources/icons/icon.ico');
  fs.writeFileSync(outPath, icoBuffer);
  console.log(`Successfully generated multi-resolution icon.ico: ${outPath} (${icoBuffer.length} bytes, sizes: ${sizes.join(', ')})`);
  app.exit(0);
});
