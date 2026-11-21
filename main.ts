// Leonida Platinum Atlas — hand-in program for the gta6-trophy-guide-01 bounty.
// Node 22, standard library only. The guide itself is the static web app in
// app/ (open app/index.html in a browser; it works fully offline). This
// program delivers it: it copies app/ and screenshots/ into the output
// directory and writes dossier.json there with the vendored make.fun library,
// after checking the entry against the gate's own caps so a bad hand-in
// fails here, loudly, instead of at the scorer.
//
// Run locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The gate's caps, mirrored from the competition rules.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function walk(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...walk(path));
    else found.push(path);
  }
  return found;
}

function checkScreenshots(dir) {
  if (!existsSync(dir)) throw new Error('screenshots/ is missing');
  const shots = readdirSync(dir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
    throw new Error(`screenshots/: expected 3 to ${CAPS.screenshots.max} images, found ${shots.length}`);
  }
  for (const name of shots) {
    const size = statSync(join(dir, name)).size;
    if (size > CAPS.screenshots.max_bytes) {
      throw new Error(`screenshots/${name} is ${size} bytes, over the ${CAPS.screenshots.max_bytes}-byte cap`);
    }
  }
  return shots;
}

function checkApp(dir) {
  const files = walk(dir);
  const bytes = files.reduce((sum, path) => sum + statSync(path).size, 0);
  if (files.length > CAPS.app_max_files) {
    throw new Error(`app/: ${files.length} files, over the ${CAPS.app_max_files}-file cap`);
  }
  if (bytes > CAPS.app_max_bytes) {
    throw new Error(`app/: ${bytes} bytes, over the ${CAPS.app_max_bytes}-byte cap`);
  }
  return { files: files.length, bytes };
}

const shots = checkScreenshots(join(here, 'screenshots'));
const appStats = checkApp(join(here, 'app'));

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));

console.log(
  `Leonida Platinum Atlas handed in: app/ ${appStats.files} files, ${appStats.bytes} bytes; ` +
    `screenshots/ ${shots.length} images (${shots.join(', ')}); dossier.json written to ${out}`,
);
