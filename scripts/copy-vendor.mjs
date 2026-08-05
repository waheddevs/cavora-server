import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'public', 'vendor');

const assets = [
  ['sweetalert2/dist/sweetalert2.min.js', 'sweetalert2.min.js'],
  ['sweetalert2/dist/sweetalert2.min.css', 'sweetalert2.min.css'],
];

await mkdir(target, { recursive: true });

for (const [source, name] of assets) {
  await copyFile(path.join(root, 'node_modules', source), path.join(target, name));
  console.log(`vendored public/vendor/${name}`);
}
