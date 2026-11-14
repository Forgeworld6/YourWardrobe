import { cp, mkdir, rm } from 'node:fs/promises';

const files = ['index.html', 'styles.css', 'app.js', 'manifest.json', 'sw.js'];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

for (const file of files) {
  await cp(file, `dist/${file}`);
}

await cp('assets', 'dist/assets', { recursive: true });

console.log('YourWardrobe web files prepared in dist/ for Capacitor.');
