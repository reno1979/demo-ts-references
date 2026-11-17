#!/usr/bin/env node
// Runs the typecheck for one (or all) demo steps and APPENDS a JSON line to demo/results.jsonl
//
//   node demo/bench.mjs 01            -> measure step 01 (cold + after-edit)
//   node demo/bench.mjs all           -> measure 01..04
//   node demo/bench.mjs 03 --runs 5   -> median of 5 runs (default 3)
//   node demo/bench.mjs 03 --verbose  -> also print the raw --extendedDiagnostics output
//   node demo/bench.mjs --reset       -> empty results.jsonl
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseDiagnostics as parse, fmtMs, fmtN, clearScreen } from './lib.mjs';

const HERE = import.meta.dirname;
const ROOT = path.resolve(HERE, '..');
const RESULTS = path.join(HERE, 'results.jsonl');

const NOEMIT = ['--noEmit', '--extendedDiagnostics'];
const BUILD = ['-b', '--extendedDiagnostics'];
const STEPS = {
  '01': { dir: '01-monolith',           label: 'Monolith (paths)',        args: NOEMIT, refs: false, edit: 'src/utils/index.ts' },
  '02': { dir: '02-npm-workspaces',      label: 'npm workspaces',          args: NOEMIT, refs: false, edit: 'packages/utils/src/index.ts' },
  '03': { dir: '03-project-references',  label: '+ Project References',    args: BUILD,  refs: true,  edit: 'packages/utils/src/index.ts' },
  '04': { dir: '04-automated-monorepo',  label: '+ Zero-touch automation', args: BUILD,  refs: true,  edit: 'packages/utils/src/index.ts' },
};

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const RUNS = Number(opt('--runs', 3));
const VERBOSE = flag('--verbose');

if (flag('--reset')) { fs.writeFileSync(RESULTS, ''); console.log('results.jsonl emptied'); process.exit(0); }

const which = argv.find((a) => /^(0[1-4]|all)$/.test(a));
if (!which) { console.error('usage: bench.mjs <01|02|03|04|all> [--runs N] [--verbose] | --reset'); process.exit(1); }

const tscArgs = (s) => [path.join(ROOT, s.dir, 'node_modules/typescript/bin/tsc'), ...s.args];
const tsc = (s, extra = []) => spawnSync('node', [...tscArgs(s).slice(0, 1), ...extra], { cwd: path.join(ROOT, s.dir), encoding: 'utf8' });

function run(s) {
  const cwd = path.join(ROOT, s.dir);
  const t0 = performance.now();
  const r = spawnSync('node', tscArgs(s), { cwd, encoding: 'utf8' });
  const wallMs = performance.now() - t0;
  const out = (r.stdout || '') + (r.stderr || '');
  const errors = (out.match(/error TS\d+/g) || []).length;
  return { wallMs, out, errors, ...parse(out) };
}

const median = (arr, key) => [...arr].sort((a, b) => a[key] - b[key])[Math.floor(arr.length / 2)];
const clean = (s) => { if (s.refs) tsc(s, ['-b', '--clean']); };
const build = (s) => { if (s.refs) tsc(s, ['-b']); };

// A real edit: change a function BODY in utils (public signature -> .d.ts stays identical).
function withEdit(s, fn) {
  const file = path.join(ROOT, s.dir, s.edit);
  const original = fs.readFileSync(file, 'utf8');
  try {
    fs.writeFileSync(file, original.replace('d.toISOString()', 'd.toISOString().slice(0)'));
    return fn();
  } finally { fs.writeFileSync(file, original); }
}

function measure(stepId, scenario) {
  const s = STEPS[stepId];
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    if (scenario === 'cold') { clean(s); runs.push(run(s)); }
    else { clean(s); build(s); runs.push(withEdit(s, () => run(s))); }   // warm cache -> edit -> measure
  }
  clean(s); // leave things tidy
  const best = median(runs, 'wallMs');
  if (VERBOSE) console.log(best.out.split('\n').map((l) => '     ' + l).join('\n'));
  if (best.errors) {
    console.error(`\n   ✖ ${best.errors} TypeScript error(s) — NOT recorded (an errored run looks "fast" but checked nothing):\n` + best.out.split('\n').filter((l) => /error TS/.test(l)).slice(0, 5).map((l) => '     ' + l).join('\n'));
    process.exit(1);
  }
  const rec = { ts: new Date().toISOString(), step: stepId, label: s.label, scenario,
    cmd: 'tsc ' + s.args.join(' '), runs: RUNS,
    wallMs: Math.round(best.wallMs), files: best.files, nodes: best.nodes, types: best.types, checkMs: best.checkMs, memKB: best.memKB };
  fs.appendFileSync(RESULTS, JSON.stringify(rec) + '\n');
  return rec;
}

if (which !== 'all') clearScreen();
for (const id of which === 'all' ? Object.keys(STEPS) : [which]) {
  const s = STEPS[id];
  if (!fs.existsSync(path.join(ROOT, s.dir, 'node_modules/typescript'))) {
    console.error(`${s.dir}: run "npm install" first`); process.exit(1);
  }
  console.log(`\n▶ ${id} ${s.label}   $ tsc ${s.args.join(' ')}   (median of ${RUNS})`);
  for (const [sc, title] of [['cold', 'cold  (fresh clone / CI)'], ['warm', 'warm  (1 line changed in utils)']]) {
    const r = measure(id, sc);
    console.log(`   ${title.padEnd(32)} wall ${fmtMs(r.wallMs).padStart(8)}   files ${String(r.files).padStart(4)}   nodes ${fmtN(r.nodes).padStart(5)}   check ${fmtMs(r.checkMs).padStart(8)}   mem ${(r.memKB / 1024).toFixed(0).padStart(4)} MB`);
  }
}
