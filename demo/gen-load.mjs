#!/usr/bin/env node
// Makes the demo repo "realistically heavy" by generating N zod-schema modules in the validation package
// of every step (01..04). Your 5 source files are too small for project references to matter;
// real monorepos have thousands of files. Same generated code in every step => fair comparison.
//
//   node demo/gen-load.mjs 150      -> generate 150 schema files in each step
//   node demo/gen-load.mjs 0        -> remove all generated files again
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const N = Number(process.argv[2] ?? 150);
const TARGETS = {
  '01-monolith': 'src/validation',
  '02-npm-workspaces': 'packages/validation/src',
  '03-project-references': 'packages/validation/src',
  '04-automated-monorepo': 'packages/validation/src',
};
const MARK = "export * from './gen/index.js'; // gen-load";

const schema = (i) => `import { z } from 'zod';

const Address${i} = z.object({
  street: z.string().min(1), city: z.string(), zip: z.string().regex(/^\\d{4}[A-Z]{2}$/),
  country: z.enum(['NL', 'BE', 'DE', 'FR']),
  geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
});

const Item${i} = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('product'), sku: z.string(), price: z.number().positive(), tags: z.array(z.string()) }),
  z.object({ kind: z.literal('service'), hours: z.number().int(), rate: z.number(), notes: z.string().optional() }),
  z.object({ kind: z.literal('bundle'), items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })) }),
]);

export const Order${i}Schema = z.object({
  id: z.string().uuid(),
  customer: z.object({ name: z.string(), email: z.string().email(), billing: Address${i}, shipping: Address${i}.partial() }),
  items: z.array(Item${i}).min(1),
  status: z.union([z.literal('open'), z.literal('paid'), z.literal('shipped'), z.literal('cancelled')]),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  createdAt: z.date(),
}).strict();

export type Order${i} = z.infer<typeof Order${i}Schema>;
export const validateOrder${i} = (x: unknown): Order${i} => Order${i}Schema.parse(x);
`;

for (const [dir, rel] of Object.entries(TARGETS)) {
  const base = path.join(ROOT, dir, rel);
  if (!fs.existsSync(base)) continue;
  const gen = path.join(base, 'gen');
  fs.rmSync(gen, { recursive: true, force: true });
  const index = path.join(base, 'index.ts');
  let src = fs.readFileSync(index, 'utf8').split('\n').filter((l) => !l.includes('// gen-load')).join('\n').trimEnd() + '\n';
  if (N > 0) {
    fs.mkdirSync(gen, { recursive: true });
    const names = [];
    for (let i = 1; i <= N; i++) { fs.writeFileSync(path.join(gen, `order${i}.ts`), schema(i)); names.push(`export * from './order${i}.js';`); }
    fs.writeFileSync(path.join(gen, 'index.ts'), names.join('\n') + '\n');
    src += MARK + '\n';
  }
  fs.writeFileSync(index, src);
  console.log(`${dir.padEnd(24)} ${N ? `+${N} generated schema modules` : 'generated files removed'}`);
}
