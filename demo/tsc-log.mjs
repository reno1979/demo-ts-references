#!/usr/bin/env node
// `npm run typecheck` -> runs a COLD and a WARM typecheck and appends the raw tsc output of both to ../tsc-bench.txt
//   cold = clean state (fresh clone / CI)      warm = after changing 1 line in utils (the developer loop)
//   node ../demo/tsc-log.mjs 03 -b --extendedDiagnostics
//   ONLY=cold ...   only the cold run        VERBOSE=1 ...   print the raw tsc output as well
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseDiagnostics, fmtMs, fmtN, clearScreen } from './lib.mjs';

const [step, ...tscArgs] = process.argv.slice(2);
const refs = tscArgs.includes('-b');
const cwd = process.cwd();
const LOG = path.resolve(cwd, '..', 'tsc-bench.txt');

// Plain file lookup on purpose: require.resolve('typescript/bin/tsc') fails when package "exports" hides it.
function findTsc() {
  for (let dir = cwd; ; dir = path.dirname(dir)) {
    const f = path.join(dir, 'node_modules', 'typescript', 'bin', 'tsc');
    if (fs.existsSync(f)) return f;
    if (path.dirname(dir) === dir) break;
  }
  console.error('typescript not found - run "npm install" first'); process.exit(1);
}
const tsc = findTsc();
const run = (args) => spawnSync(process.execPath, [tsc, ...args], { cwd, encoding: 'utf8' });

function measure(scenario) {
  const t0 = performance.now();
  const r = run(tscArgs);
  const wall = Math.round(performance.now() - t0);
  const out = (r.stdout || '') + (r.stderr || '');
  fs.appendFileSync(LOG, `### step=${step} scenario=${scenario} ts=${new Date().toISOString()}\n${out}\n### wall=${wall}\n`);
  const d = parseDiagnostics(out);
  const err = out.match(/error TS\d+: .*/);
  if (process.env.VERBOSE) process.stdout.write(out);
  console.log(`  ${scenario.padEnd(5)} wall ${fmtMs(wall).padStart(8)} | files ${String(d.files).padStart(3)} | nodes ${fmtN(d.nodes).padStart(5)} | types ${fmtN(d.types).padStart(5)} | mem ${String(Math.round(d.memKB / 1024)).padStart(3)} MB`);
  if (err) console.log(`  \x1b[31m✖ ${err[0].slice(0, 90)}\x1b[0m`);
  return r.status;
}

const only = process.env.ONLY;
clearScreen();
console.log(`\n▶ ${step}  tsc ${tscArgs.join(' ')}`);
let status = 0;
if (refs) run(['-b', '--clean']);                        // cold = no build cache
if (only !== 'warm') status = measure('cold') || status;
if (only !== 'cold') {
  // warm = change ONE function body in utils (public signature, so its .d.ts stays identical), then re-check
  const file = path.join(cwd, step === '01' ? 'src/utils/index.ts' : 'packages/utils/src/index.ts');
  const original = fs.readFileSync(file, 'utf8').split('.slice(0)').join('');
  try {
    fs.writeFileSync(file, original.replace('d.toISOString()', 'd.toISOString().slice(0)'));
    status = measure('warm') || status;
  } finally { fs.writeFileSync(file, original); }
}
console.log(`  → appended to ${path.relative(cwd, LOG)}`);
process.exit(status);
