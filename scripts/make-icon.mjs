// Rasterize build/icon.svg into a multi-size build/icon.ico using Electron's
// renderer (already a dev dependency; no external downloads, no fonts).
import { app, BrowserWindow } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

function buildIco(pngBuffers) {
  // ICONDIR (6 bytes) + N * ICONDIRENTRY (16 bytes) + PNG payloads.
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  pngBuffers.forEach((png, i) => {
    const size = SIZES[i];
    const e = 16 * i;
    entries.writeUInt8(size >= 256 ? 0 : size, e + 0); // width (0 => 256)
    entries.writeUInt8(size >= 256 ? 0 : size, e + 1); // height (0 => 256)
    entries.writeUInt8(0, e + 2); // color palette
    entries.writeUInt8(0, e + 3); // reserved
    entries.writeUInt16LE(1, e + 4); // color planes
    entries.writeUInt16LE(32, e + 6); // bits per pixel
    entries.writeUInt32LE(png.length, e + 8); // size of image data
    entries.writeUInt32LE(offset, e + 12); // offset of image data
    offset += png.length;
  });

  return Buffer.concat([header, entries, ...pngBuffers]);
}

async function run() {
  const svg = await readFile(join(root, 'build', 'icon.svg'), 'utf8');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent}
    svg{display:block;width:256px;height:256px}
  </style></head><body>${svg}</body></html>`;

  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true }
  });

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((resolve) => setTimeout(resolve, 400));

  const base = await win.webContents.capturePage();
  const pngBuffers = SIZES.map((size) => base.resize({ width: size, height: size, quality: 'best' }).toPNG());

  if (pngBuffers.some((b) => b.length === 0)) {
    throw new Error('Rasterizacion vacia: capturePage no produjo pixeles.');
  }

  const ico = buildIco(pngBuffers);
  await writeFile(join(root, 'build', 'icon.ico'), ico);
  console.log(JSON.stringify({ ok: true, sizes: SIZES, bytes: ico.length }));
  win.destroy();
}

app.disableHardwareAcceleration();
app
  .whenReady()
  .then(run)
  .then(() => app.exit(0))
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    app.exit(1);
  });
