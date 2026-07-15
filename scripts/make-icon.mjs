// Build build/icon.ico from the GasPrint brand logo, cropped to the compact "G"
// mark on a rounded purple square. Uses Electron's renderer (already a dev dep;
// no external downloads, no fonts). The vector geometry is reused as-is (no redraw).
import { app, BrowserWindow } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

// Square crop framing the "G" (source logo viewBox is 0 0 2508 627).
const CROP_X = 117;
const CROP_SIZE = 627;

function extract(svg, tag) {
  const matches = [...svg.matchAll(new RegExp(`<${tag}\\b[\\s\\S]*?(?:/>|</${tag}>)`, 'g'))];
  return matches.map((m) => m[0]);
}

/** Compose a rounded-square SVG that reuses the logo's gradient + paths, cropped to the G. */
function buildSquareSvg(logo) {
  const defs = (logo.match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];
  const gradient = (defs.match(/<radialGradient[\s\S]*?<\/radialGradient>/) || [''])[0];
  const rect = extract(logo, 'rect')[0] || '';
  const paths = extract(logo, 'path').join('\n    ');
  const radius = Math.round(CROP_SIZE * 0.21);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="${CROP_X} 0 ${CROP_SIZE} ${CROP_SIZE}">
  <defs>
    ${gradient}
    <clipPath id="gpclip"><rect x="${CROP_X}" y="0" width="${CROP_SIZE}" height="${CROP_SIZE}" rx="${radius}"/></clipPath>
  </defs>
  <g clip-path="url(#gpclip)">
    ${rect}
    ${paths}
  </g>
</svg>
`;
}

function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  pngBuffers.forEach((png, i) => {
    const size = SIZES[i];
    const e = 16 * i;
    entries.writeUInt8(size >= 256 ? 0 : size, e + 0);
    entries.writeUInt8(size >= 256 ? 0 : size, e + 1);
    entries.writeUInt8(0, e + 2);
    entries.writeUInt8(0, e + 3);
    entries.writeUInt16LE(1, e + 4);
    entries.writeUInt16LE(32, e + 6);
    entries.writeUInt32LE(png.length, e + 8);
    entries.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([header, entries, ...pngBuffers]);
}

async function run() {
  const logo = await readFile(join(root, 'src', 'renderer', 'assets', 'branding', 'gasprint-logo.svg'), 'utf8');
  const squareSvg = buildSquareSvg(logo);
  // Persist the square mark as the build resource source (vector, reused geometry).
  await writeFile(join(root, 'build', 'icon.svg'), squareSvg, 'utf8');

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent}
    svg{display:block;width:256px;height:256px}
  </style></head><body>${squareSvg}</body></html>`;

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
