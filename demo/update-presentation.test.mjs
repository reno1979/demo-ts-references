import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('refreshes values without changing sidebar stages or the blank slide', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsc-presentation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const demo = path.join(root, 'demo');
  fs.mkdirSync(demo);
  for (const file of ['update-presentation.mjs', 'presentation-data.mjs']) {
    fs.copyFileSync(path.join(import.meta.dirname, file), path.join(demo, file));
  }
  for (const dir of ['01-monolith', '02-npm-workspaces/apps/app']) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
    fs.writeFileSync(path.join(root, dir, 'package.json'), JSON.stringify({
      devDependencies: { typescript: '7.0.2', zod: '4.6.7', '@types/react': '19.3.0' },
    }));
  }
  const rows = [
    { step: '01', scenario: 'cold', wallMs: 100 },
    { step: '02', scenario: 'cold', wallMs: 110 },
    { step: '03', scenario: 'cold', wallMs: 170 },
    { step: '03', scenario: 'warm', wallMs: 20 },
  ].map((row) => ({ ...row, runs: 7, files: 164, memKB: 102400 }));
  fs.writeFileSync(path.join(demo, 'results.jsonl'), rows.map(JSON.stringify).join('\n'));
  const deck = path.join(root, 'presentatie-ts-project-references.md');
  const card = (label) => `<div class="c"><b>${label}</b><div class="r"><em>old</em></div></div>`;
  const vanilla = card('00 vanilla');
  const blank = "---\n<!-- footer: '' -->\n<!-- _paginate: false -->\n\n---";
  fs.writeFileSync(deck, [
    '/* GENERATED_WIDTHS_START */\n.w24 { width: 24%; }\n/* GENERATED_WIDTHS_END */',
    `<!-- footer: '<div class="tick">${vanilla}</div>' -->`,
    `<!-- footer: '<div class="tick">${card('01 monoliet')}</div>' -->`,
    '<span data-var="demo.refsWarm.timeIndex">old</span>',
    blank,
  ].join('\n'));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [path.join(demo, 'update-presentation.mjs'), ...args], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
  };
  run();
  const updated = fs.readFileSync(deck, 'utf8');
  assert.ok(updated.includes(vanilla));
  assert.ok(updated.includes(blank));
  assert.match(updated, /\.w24 \{ width: 24%; \}/);
  assert.match(updated, /<span data-var="demo.refsWarm.timeIndex">20<\/span>/);
  assert.match(updated, /<b>01 monoliet<\/b>.*<em>164<\/em>/);
  assert.equal((updated.match(/<div class="c">/g) ?? []).length, 2);
  assert.ok(!updated.includes('<b>02 workspaces</b>'));
  run('--check');
  assert.equal(fs.readFileSync(deck, 'utf8'), updated);
});
