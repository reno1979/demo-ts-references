#!/usr/bin/env node
// Renders demo/results.jsonl as bar charts in the terminal (no dependencies).
//   node demo/chart.mjs --present                   presentation: overlaid time/memory bars (40 columns, 16 lines)
//   node demo/chart.mjs --dash                      dashboard: cold | warm side by side (default metrics: wall,mem,types)
//   node demo/chart.mjs --dash wall,mem,nodes,types the metrics you want in the dashboard
//   node demo/chart.mjs --metric nodes              one metric, stacked cold + warm
//   node demo/chart.mjs --compact                   smallest single-metric view (warm only)
//   --scenario cold|warm|both|any                   (single-metric views)
import fs from 'node:fs';
import path from 'node:path';
import { fmtMs, fmtN } from './lib.mjs';

const RESULTS = path.join(import.meta.dirname, 'results.jsonl');
const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const COMPACT = argv.includes('--compact');
const DASH = argv.includes('--dash');

const METRICS = {
  wall:  { key: 'wallMs',  title: '⏱  Wall time',                        fmt: fmtMs, time: true },
  check: { key: 'checkMs', title: '⏱  Compiler check time',              fmt: fmtMs, time: true },
  mem:   { key: 'memKB',   title: '🧠 Peak memory',                       fmt: (v) => Math.round(v / 1024) + ' MB' },
  nodes: { key: 'nodes',   title: '🌳 AST nodes parsed (identifiers)',   fmt: fmtN },
  types: { key: 'types',   title: '🧊 Types computed (the iceberg)',     fmt: fmtN },
  files: { key: 'files',   title: '📄 Files processed',                   fmt: fmtN },
};
const SHORT = { '01': 'monolith', '02': 'workspaces', '03': '+ references', '04': '+ automation' };
const FULL = { '01': 'Monolith (paths)', '02': 'npm workspaces', '03': '+ Project References', '04': '+ Zero-touch automation' };

const rows = fs.existsSync(RESULTS) ? fs.readFileSync(RESULTS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const latest = new Map();                                    // last measurement wins; old name "edit" == "warm"
for (const r of rows) { const sc = r.scenario === 'edit' ? 'warm' : r.scenario; latest.set(r.step + '/' + sc, r); latest.set(r.step + '/any', r); }
if (!latest.size) { console.log('No data yet. Run: npm run typecheck (in 01-monolith, …)'); process.exit(0); }

const c = (n, s) => `\x1b[${n}m${s}\x1b[0m`;
const EIGHTHS = ' ▏▎▍▌▋▊▉█';
const bar = (frac, width) => {
  const e = Math.max(1, Math.round(frac * width * 8));
  return '█'.repeat(Math.floor(e / 8)) + EIGHTHS[e % 8].trim();
};

if (argv.includes('--present')) {
  const steps = Object.keys(SHORT);
  const metrics = [['Time', METRICS.wall], ['Mem', METRICS.mem]];
  const maxima = metrics.map(([, metric]) => Math.max(1, ...steps.flatMap((step) =>
    ['cold', 'warm'].map((sc) => latest.get(step + '/' + sc)?.[metric.key] ?? 0))));
  console.log(c('1', 'TIME + PEAK MEMORY - lower is better'));
  console.log('COLD ' + c('36;2', '░') + ' no cache / WARM ' + c('32;1', '█') + ' body edit');
  for (const step of steps) {
    console.log(c('1', `${step} ${SHORT[step]}`));
    metrics.forEach(([label, metric], index) => {
      const cold = latest.get(step + '/cold')?.[metric.key];
      const warm = latest.get(step + '/warm')?.[metric.key];
      const delta = cold > 0 && warm !== undefined ? Math.round((warm / cold - 1) * 100) : null;
      const color = delta > 0 ? '31;1' : '32;1';
      const length = (value) => value > 0 ? Math.max(1, Math.round(value / maxima[index] * 10)) : 0;
      const coldWidth = length(cold), warmWidth = length(warm);
      const graph = c(color, '█'.repeat(warmWidth))
        + c('36;2', '░'.repeat(Math.max(0, coldWidth - warmWidth)))
        + ' '.repeat(10 - Math.max(coldWidth, warmWidth));
      const format = (value) => value === undefined ? '--' : metric.fmt(value);
      const values = `${format(cold)}>${format(warm)}`;
      const percent = delta === null ? '--' : `${delta > 0 ? '+' : ''}${delta}%`;
      console.log(label.padEnd(5) + graph + ' ' + c('1', values.padStart(17)) + ' ' + c(color, percent.padStart(5)));
    });
  }
  console.log('COLD>WARM; % vs COLD; -- = unavailable');
  console.log('01/02: no cache; differences are noise.');
  process.exit(0);
}

const column = (sc, M, o, maxAll) => {                                // -> array of strings (one per step), each exactly o.width wide (visible)
  const list = ['01', '02', '03', '04'].map((s) => latest.get(s + '/' + sc));
  const present = list.filter(Boolean);
  const base = present[0]?.[M.key];
  const max = maxAll ?? Math.max(...present.map((r) => r[M.key]), 1);
  return list.map((r, i) => {
    const step = ['01', '02', '03', '04'][i];
    const label = `${step} ${SHORT[step]}`.padEnd(o.label);
    if (!r) return label + c('2', ' —').padEnd(o.width - o.label + 9);
    const v = r[M.key], ratio = base ? v / base : 1;
    const col = ratio > 1.15 ? '31' : ratio > 0.8 ? '33' : '32';
    const tail = r === present[0] ? '' : Math.abs(ratio - 1) < 0.1 ? '≈' : ratio < 1 ? '−' + Math.floor((1 - ratio) * 100) + '%' : '+' + Math.round((ratio - 1) * 100) + '%';
    const tcol = tail === '≈' ? '2' : ratio < 1 ? '32;1' : '31;1';
    const barW = o.width - o.label - o.value - o.tail - 2;
    return `${label} ${c(col, bar(v / max, barW).padEnd(barW))} ${c('1', M.fmt(v).padStart(o.value))} ${c(tcol, tail.padStart(o.tail))}`;
  });
};

if (DASH) {
  const names = (opt('--dash', '') && !opt('--dash', '').startsWith('--') ? opt('--dash') : 'wall,mem,types').split(',');
  const W = Math.min(process.stdout.columns || 110, 120);
  const half = Math.floor((W - 4) / 2);
  const o = { width: half, label: 15, value: 8, tail: 5 };
  console.log();
  console.log('  ' + c('36;1', 'COLD'.padEnd(half)) + '  ' + c('36;1', 'WARM'), c('2', ' (cold = fresh clone, warm = 1 line changed)'));
  for (const name of names) {
    const M = METRICS[name]; if (!M) continue;
    console.log('  ' + c('1', M.title));
    const all = ['cold', 'warm'].flatMap((sc) => ['01', '02', '03', '04'].map((st) => latest.get(st + '/' + sc)?.[M.key] ?? 0));
    const shared = Math.max(...all, 1);                       // one scale for both columns: warm bars really look smaller
    const L = column('cold', M, o, shared), R = column('warm', M, o, shared);
    L.forEach((l, i) => console.log('  ' + l + '  ' + R[i]));
  }
  console.log();
  process.exit(0);
}

// ---- single-metric views
const M = METRICS[opt('--metric', 'wall')];
if (!M) { console.error('unknown --metric (wall|check|mem|nodes|types|files)'); process.exit(1); }
const W = COMPACT ? Math.min(process.stdout.columns || 64, 64) : Math.min(process.stdout.columns || 100, 110);
const o = { width: W - 2, label: COMPACT ? 15 : 26, value: 9, tail: 5 };
const scen = opt('--scenario', COMPACT ? 'warm' : 'both');
if (!COMPACT) console.log();
console.log('  ' + c('1', M.title));
for (const sc of scen === 'both' ? ['cold', 'warm'] : [scen]) {
  console.log((COMPACT ? '' : '\n') + '  ' + c('36;1', { cold: 'COLD — fresh clone / CI', warm: 'WARM — 1 line changed', any: 'LATEST RUN PER STEP' }[sc]));
  column(sc, M, o).forEach((l) => console.log('  ' + l));
}
if (!COMPACT) console.log();
