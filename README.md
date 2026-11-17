# Demo: TS Project References & Monorepo Scaling

Deze repository bevat **4 opeenvolgende varianten** om het verschil te laten zien tussen een ouderwetse monolithische setup, npm workspaces, TypeScript Project References, en geautomatiseerde Zero-Touch Monorepo tooling.

## Mapstructuur
1. `01-monolith`: Monoliet met `tsconfig.json` `paths` aliases.
2. `02-npm-workspaces`: npm Workspaces zonder Project References.
3. `03-project-references`: npm Workspaces MET TypeScript Project References (`composite: true` + `tsc -b`).
4. `04-automated-monorepo`: Volledige **Zero-Touch setup** met Husky hooks, syncpack & geautomatiseerde TS references/version alignment script op basis van de dependency graaf.

## Hoe te testen
Run in elke map `npm install` en de respectievelijke `npm run typecheck` of `npm run build`.
In `04-automated-monorepo` kun je een `tsconfig.json` reference verwijderen en `npm run check-sync` of `npm run sync` testen!
