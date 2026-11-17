import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

function fixture(t, rows = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsc-chart-'));
  const demo = path.join(root, 'demo');
  fs.mkdirSync(demo);
  for (const file of ['chart.mjs', 'lib.mjs', 'watch.mjs']) {
    fs.copyFileSync(path.join(import.meta.dirname, file), path.join(demo, file));
  }
  fs.writeFileSync(path.join(demo, 'results.jsonl'), rows.map((row) => JSON.stringify(row)).join('\n'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, demo };
}

const plain = (text) => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
const row = (step, scenario, wallMs, memKB) => ({ step, scenario, wallMs, memKB });

function chart(demo, ...args) {
  const result = spawnSync(process.execPath, [path.join(demo, 'chart.mjs'), ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return plain(result.stdout).trimEnd();
}

test('presentation fits 40 columns and 16 lines with overlaid time/memory bars and latest percentages', (t) => {
  const { demo } = fixture(t, [
    row('01', 'cold', 1200, 131072), row('01', 'warm', 1100, 131072),
    row('02', 'cold', 1300, 163840), row('02', 'warm', 1250, 163840),
    row('03', 'cold', 2200, 196608), row('03', 'warm', 800, 65536), row('03', 'warm', 85, 25600),
    row('04', 'cold', 2100, 196608), row('04', 'warm', 93, 25600),
  ]);
  const output = chart(demo, '--present');
  const lines = output.split('\n');
  assert.equal(lines.length, 16);
  assert.ok(lines.every((line) => line.length <= 40), output);
  assert.match(output, /01 monolith\nTime █{5}\s+1\.20 s>1\.10 s\s+-8%\nMem\s+█{7}\s+128 MB>128 MB\s+0%/);
  assert.match(output, /03 \+ references\nTime █░{9}\s+2\.20 s>85 ms\s+-96%\nMem\s+█░{9}\s+192 MB>25 MB\s+-87%/);
  assert.match(output, /04 \+ automation\nTime █░{9}\s+2\.10 s>93 ms\s+-96%/);
  const bars = [...output.matchAll(/^(?:Time|Mem) +([█░]*)/gm)].map((match) => match[1]);
  assert.equal(bars.length, 8);
  assert.ok(bars[0].length < bars[4].length, 'bars share a scale across setups');
  assert.equal(bars[5], '█░░░░░░░░░', 'warm memory overlays cold, leaving the savings shaded');
  assert.match(output, /COLD ░ no cache \/ WARM █ body edit/);
});

test('presentation distinguishes missing measurements from zero and supports legacy edit runs', (t) => {
  const { demo } = fixture(t, [row('03', 'cold', 0), row('03', 'edit', 90)]);
  const output = chart(demo, '--present');
  assert.match(output, /01 monolith\nTime +-->--\s+--\nMem +-->--\s+--/);
  assert.match(output, /03 \+ references\nTime █{10}\s+0 ms>90 ms\s+--\nMem +-->--\s+--/);
});

test('percentages show slower and unchanged warm runs rather than claiming savings', (t) => {
  const { demo } = fixture(t, [
    row('01', 'cold', 100, 1024), row('01', 'warm', 125, 2048),
    row('02', 'cold', 100, 1024), row('02', 'warm', 100, 1024),
    row('03', 'cold', 100), row('03', 'warm', 0),
  ]);
  const output = chart(demo, '--present');
  assert.match(output, /Time █{10}\s+100 ms>125 ms\s+\+25%/);
  assert.match(output, /Mem\s+█{10}\s+1 MB>2 MB\s+\+100%/);
  assert.match(output, /Time █{8}\s+100 ms>100 ms\s+0%/);
  assert.match(output, /Time ░{8}\s+100 ms>0 ms\s+-100%/);
});

test('watch defaults to presentation bars and redraws when new results arrive', async (t) => {
  const { root, demo } = fixture(t);
  const log = path.join(root, 'tsc-bench.txt');
  fs.writeFileSync(log, '### step=03 scenario=cold\nMemory used: 196608K\n### wall=2200\n');
  const child = spawn(process.execPath, [path.join(demo, 'watch.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = new Promise((resolve) => child.once('exit', resolve));
  t.after(async () => {
    child.kill();
    await exited;
  });
  await new Promise((resolve, reject) => {
    let output = '';
    let errors = '';
    let appended = false;
    const timer = setTimeout(() => reject(new Error(`watch timed out:\n${output}\n${errors}`)), 5000);
    t.after(() => clearTimeout(timer));
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`watch exited (${code}): ${errors}`)));
    child.stderr.on('data', (data) => { errors += data; });
    child.stdout.on('data', (data) => {
      output += plain(data.toString());
      if (!appended && /03 \+ references\nTime ░{10}\s+2\.20 s>--\s+--/.test(output)) {
        appended = true;
        const appendTimer = setTimeout(() => {
          fs.appendFileSync(log, '### step=03 scenario=warm\nMemory used: 25600K\n### wall=85\n');
        }, 400);
        t.after(() => clearTimeout(appendTimer));
      }
      if (/03 \+ references\nTime █░{9}\s+2\.20 s>85 ms\s+-96%\nMem\s+█░{9}\s+192 MB>25 MB\s+-87%/.test(output)) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
});
