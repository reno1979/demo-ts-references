#!/usr/bin/env node
// Watches ../tsc-bench.txt and redraws the compact chart whenever it changes. Keep it open in a terminal pane/tab.
//   node demo/watch.mjs [--dash wall,mem,types,nodes,files]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseDiagnostics } from './lib.mjs';

const HERE = import.meta.dirname;
const SRC = path.resolve(HERE, '..', 'tsc-bench.txt');
const RESULTS = path.join(HERE, 'results.jsonl');
const LABELS = { '01': 'Monolith (paths)', '02': 'npm workspaces', '03': '+ Project References', '04': '+ Zero-touch automation' };
const extra = process.argv.slice(2);

const warnings = [];
function convert() {
  warnings.length = 0;
  if (!fs.existsSync(SRC)) return 0;
  const recs = [];
  for (const chunk of fs.readFileSync(SRC, 'utf8').split(/^### step=/m).slice(1)) {
    const head = chunk.split('\n')[0];
    const step = head.match(/^(\d+)/)?.[1];
    const scenario = head.match(/scenario=(\S+)/)?.[1] ?? 'run';
    const wall = chunk.match(/^### wall=(\d+)/m)?.[1];
    if (!step || !LABELS[step] || !wall) continue;
    const err = chunk.match(/error TS\d+: .*/);
    if (err) { warnings.push(`step ${step}: ${err[0].slice(0, 70)}`); continue; }   // errored run checked nothing -> ignore
    recs.push({ step, label: LABELS[step], scenario, wallMs: +wall, ...parseDiagnostics(chunk) });
  }
  fs.writeFileSync(RESULTS, recs.map((r) => JSON.stringify(r)).join('\n') + (recs.length ? '\n' : ''));
  return recs.length;
}

function draw() {
  const n = convert();
  process.stdout.write('\x1b[2J\x1b[H');
  if (!n) { for (const m of warnings) console.log('\x1b[31m  ✖ ignored (TS error) ' + m + '\x1b[0m'); console.log('\n  waiting for data in tsc-bench.txt …   (run: npm run typecheck)'); return; }
  spawnSync(process.execPath, [path.join(HERE, 'chart.mjs'), '--dash', ...extra], { stdio: 'inherit' });
  for (const m of warnings) console.log('\x1b[31m  ✖ ignored (TS error) ' + m + '\x1b[0m');
}
draw();
fs.watchFile(SRC, { interval: 300 }, draw);      // polling: also works on Windows / network drives
console.log('');
