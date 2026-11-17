#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { team } from './presentation-data.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DECK = path.join(ROOT, 'presentatie-ts-project-references.md');
const RESULTS = path.join(ROOT, 'demo/results.jsonl');
const checkOnly = process.argv.includes('--check');

if (team.scenarioMinutes.length !== 2) {
  throw new Error('Exactly two scenarioMinutes values are required by the presentation.');
}

const records = fs.readFileSync(RESULTS, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const latest = new Map();
for (const record of records) latest.set(`${record.step}:${record.scenario}`, record);

const required = (step, scenario) => {
  const record = latest.get(`${step}:${scenario}`);
  if (!record) throw new Error(`Missing benchmark result for ${step} ${scenario}`);
  return record;
};

const metrics = {
  monolith: required('01', 'cold'),
  workspaces: required('02', 'cold'),
  refsCold: required('03', 'cold'),
  refsWarm: required('03', 'warm'),
};
if (new Set(Object.values(metrics).map((metric) => metric.runs)).size !== 1) {
  throw new Error('Latest comparison results use different run counts; benchmark all compared scenarios together.');
}
const baselineMs = metrics.monolith.wallMs;
for (const metric of Object.values(metrics)) {
  metric.timeIndex = Math.round(metric.wallMs / baselineMs * 100);
}

const max = (key) => Math.max(...Object.values(metrics).map((metric) => metric[key]));
const width = (value, key) => Math.round(value / max(key) * 100);
const mb = (kb) => (kb / 1024).toFixed(1).replace('.', ',');
const number = (value) => (Number.isInteger(value)
  ? String(value)
  : value.toFixed(1).replace('.', ','));
const hours = (minutes) => number(minutes / 60);
const checksPerMonth = team.developers * team.prsPerDeveloperPerWorkday
  * team.workdaysPerMonth * team.runsPerPR;
const currentMonthlyMinutes = checksPerMonth * team.currentCiMinutes;
const scenarioRows = team.scenarioMinutes.map((minutes) => ({
  minutes,
  monthlyHours: currentMonthlyMinutes / team.currentCiMinutes * minutes / 60,
  savedHours: currentMonthlyMinutes / 60
    - currentMonthlyMinutes / team.currentCiMinutes * minutes / 60,
}));

const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8'),
);
const monolithPackage = readJson('01-monolith/package.json');
const appPackage = readJson('02-npm-workspaces/apps/app/package.json');
const versions = {
  typescript: monolithPackage.devDependencies.typescript,
  zod: monolithPackage.devDependencies.zod,
  reactTypes: appPackage.devDependencies['@types/react'],
};

const replacements = {
  'team.developers': team.developers,
  'team.prsPerDeveloperPerWorkday': number(team.prsPerDeveloperPerWorkday),
  'team.workdaysPerMonth': team.workdaysPerMonth,
  'team.runsPerPR': team.runsPerPR,
  'team.checksPerMonth': number(checksPerMonth),
  'team.currentCiMinutes': number(team.currentCiMinutes),
  'team.currentMonthlyWaitHours': hours(currentMonthlyMinutes),
  'team.scenario1Minutes': number(scenarioRows[0].minutes),
  'team.scenario1MonthlyWaitHours': hours(scenarioRows[0].monthlyHours * 60),
  'team.scenario1SavedHours': hours(scenarioRows[0].savedHours * 60),
  'team.scenario2Minutes': number(scenarioRows[1].minutes),
  'team.scenario2MonthlyWaitHours': hours(scenarioRows[1].monthlyHours * 60),
  'team.scenario2SavedHours': hours(scenarioRows[1].savedHours * 60),
  'demo.runs': metrics.monolith.runs,
  'versions.typescript': versions.typescript,
  'versions.zod': versions.zod,
  'versions.reactTypes': versions.reactTypes,
};

for (const [name, metric] of Object.entries(metrics)) {
  replacements[`demo.${name}.files`] = metric.files;
  replacements[`demo.${name}.memory`] = mb(metric.memKB);
  replacements[`demo.${name}.timeIndex`] = metric.timeIndex;
}

const cards = [
  ['01 monoliet', metrics.monolith, false],
  ['02 workspaces', metrics.workspaces, false],
  ['03 refs · koud', metrics.refsCold, false],
  ['03 refs · na body-edit', metrics.refsWarm, true],
];
const renderedCards = new Map(cards.map(([label, metric, hot]) => [label, (
  `<div class="c${hot ? ' hot' : ''}"><b>${label}</b>`
  + `<div class="r"><div class="t"><span class="fl barWithText w${width(metric.files, 'files')}"></span></div><em>${metric.files}</em></div>`
  + `<div class="r"><div class="t"><span class="me barWithText w${width(metric.memKB, 'memKB')}"></span></div><em>${mb(metric.memKB)} MB</em></div>`
  + `<div class="r"><div class="t"><span class="ti barWithText w${width(metric.timeIndex, 'timeIndex')}"></span></div><em>${metric.timeIndex}</em></div></div>`
)]));

let markdown = fs.readFileSync(DECK, 'utf8');
markdown = markdown.replace(
  /\/\* GENERATED_WIDTHS_START \*\/[\s\S]*?\/\* GENERATED_WIDTHS_END \*\//,
  `/* GENERATED_WIDTHS_START */\n    ${[...new Set([...Array.from(markdown.matchAll(/\.w(\d+)\s*\{/g), (match) => Number(match[1])), ...Object.values(metrics).flatMap((metric) => [
    width(metric.files, 'files'),
    width(metric.memKB, 'memKB'),
    width(metric.timeIndex, 'timeIndex'),
  ])])].sort((a, b) => a - b).map((value) => `.w${value} { width: ${value}%; }`).join(' ')}\n  /* GENERATED_WIDTHS_END */`,
);

markdown = markdown.replace(/<!-- _?footer: '[^']*' -->/g, (footer) => (
  footer.replace(
    /<div class="c(?: hot)?"><b>([^<]+)<\/b>[\s\S]*?<\/em><\/div><\/div>/g,
    (card, label) => renderedCards.get(label) ?? card,
  )
));

markdown = markdown.replace(
  /<span data-var="([a-zA-Z0-9.]+)">[^<]*<\/span>/g,
  (span, key) => {
    if (!(key in replacements)) throw new Error(`Unknown presentation value: ${key}`);
    return `<span data-var="${key}">${replacements[key]}</span>`;
  },
);

markdown = markdown.replace(/\{\{([a-zA-Z0-9.]+)\}\}/g, (placeholder, key) => {
  if (!(key in replacements)) throw new Error(`Unknown presentation value: ${key}`);
  return replacements[key];
});

const unresolved = markdown.match(/\{\{[^}]+\}\}/);
if (unresolved) throw new Error(`Unresolved presentation value: ${unresolved[0]}`);

if (checkOnly) {
  const current = fs.readFileSync(DECK, 'utf8');
  if (current !== markdown) {
    console.error('Presentation is stale. Run: node demo/update-presentation.mjs');
    process.exitCode = 1;
  } else {
    console.log('Presentation values are up to date.');
  }
} else {
  fs.writeFileSync(DECK, markdown);
  console.log('Updated presentation from team assumptions and latest demo benchmarks.');
}
