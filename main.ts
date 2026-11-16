// VOIDSTORM — entry program for the make.fun "Make the best game" bounty.
//
// The game itself is the static site under game/ (open game/index.html in a
// desktop browser and play). This program is only the courier: it copies
// game/ and screenshots/ into the output directory and writes the dossier
// the scorer expects, built by the kit's own library so the bytes match
// what the gate rebuilds on its side, byte for byte.
//
// Runs on Node 22 with the standard library alone. Outside the grader the
// output directory comes from MAKEFUN_OUTPUT_DIR; inside it is /output.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps the bounty's gate rebuilds the dossier with. Only the text cap
// shapes the bytes; the rest only refuse, so passing them all makes this
// program fail in exactly the places the scorer would refuse the entry.
const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function stage(name) {
  const target = join(outputDir, name);
  rmSync(target, { recursive: true, force: true });
  cpSync(join(repoRoot, name), target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
stage('game');
stage('screenshots');

const dossier = buildDossier(outputDir, GATE_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);
