---
marp: true
theme: default
paginate: true
size: 16:9
style: |
  section { font-size: 25px; padding: 40px 56px 48px 56px; }
  section > h2 { position:absolute; top: 30px;}
  section h1 { font-size: 40px; color: #1864ab; }
  section h2 { font-size: 32px; color: #1864ab; margin-bottom: 8px; }
  section pre { font-size: 16px; line-height: 1.3; }
  section code { font-size: 0.9em; }
  section table { font-size: 21px; }
  section blockquote { font-size: 22px; border-left: 5px solid #ff922b; background: #fff4e6; padding: 4px 16px; }
  section.compact { font-size: 22px; }
  section.compact table { font-size: 18px; }
  section footer { left:auto; right: 24px; top:24px; bottom: 32px; width: 400px; font-size: 16px; color: #222; }
  section.split,
  section:has(.tick) { padding-right: 456px; }

  .tick { display: grid; grid-template-columns: minmax(0, 1fr); align-content: start; gap: 6px; height: 100%; }
  .tick::before { content: "DEMO · lokaal · tijdindex: 01 koud = 100"; grid-column: 1 / -1; font-size: 15px; font-weight: 700; color: #495057; letter-spacing: .04em; }
  .c { min-width: 0; border-top: 3px solid #ced4da; padding: 5px 7px; background: #f8f9fa; border-radius: 4px; }
  .c.hot { border-top-color: #e03131; background: #fff5f5; }
  .c b { display: block; font-size: 15px; margin-bottom: 1px; white-space: nowrap; overflow: hidden; }
  .r { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 42px; align-items: center; gap: 5px; height: 20px; }
  .tick > .c > .r:nth-child(2)::before,
  .tick > .c > .r:nth-child(3)::before,
  .tick > .c > .r:nth-child(4)::before { position: absolute; z-index: 1; left: 6px; font-size: 11px; color: #212529; pointer-events: none; }
  .tick > .c > .r:nth-child(2)::before { content: "Files"; font-weight:700; }
  .tick > .c > .r:nth-child(3)::before { content: "Memory"; font-weight:700;}
  .tick > .c > .r:nth-child(4)::before { content: "Tijdindex"; font-weight:700;}
  .t { width: 100%; height: 12px; background: #f1f3f5; border-radius: 2px; overflow: hidden; }
  .t span { display: block; height: 12px; border-radius: 2px; }
  /* GENERATED_WIDTHS_START */
    .w10 { width: 10%; } .w13 { width: 13%; } .w17 { width: 17%; } .w24 { width: 24%; } .w35 { width: 35%; } .w42 { width: 42%; } .w58 { width: 58%; } .w60 { width: 60%; } .w100 { width: 100%; }
  /* GENERATED_WIDTHS_END */
  .r em { font-style: normal; margin-left: 0; font-size: 12px; text-align: right; white-space: nowrap; }
  .barWithText { color: transparent; line-height: 1; padding-left: 0; font-size: 0; }
  .fl { background: #339af0; } .me { background: #ff922b; } .ti { background: #40c057; }
  .k { display: inline-block; height: 14px; width:14px; border-radius: 3px; vertical-align: middle; margin-right: 6px; }
  .small { font-size: 20px; color: #495057; }
---

<!-- _paginate: false -->
# Van trage CI naar snellere TypeScript-feedback

**Hoe TypeScript onthoudt wat het al weet — en wanneer dat tijd scheelt**
npm workspaces · hoisting · Project References · `.tsbuildinfo`

---

## Het probleem

- CI typecheck per Pull Request: **~<span data-var="team.currentCiMinutes">23</span> min** in de grote codebase
- Team: **<span data-var="team.developers">4</span> devs · <span data-var="team.prsPerDeveloperPerWorkday">1,5</span> PR/dev/werkdag** → **<span data-var="team.checksPerMonth">252</span> checks/maand**
- Elke run: iemand **wacht** → flow weg, context-switch

> Vandaag: *waar* zit die tijd, wat helpt **niet**, wat helpt wél — en wat kost het ons aan onderhoud?
---

<!-- footer: '<div class="tick"><div class="c"><b>00 vanilla</b><div class="r"><div class="t"><span class="fl barWithText w17"></span></div><em>66</em></div><div class="r"><div class="t"><span class="me barWithText w42"></span></div><em>61,8 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w24"></span></div><em>X</em></div></div></div>' -->

## Hoe we meten: één commando, drie meters

```bash
tsc --noEmit --extendedDiagnostics      # losse repo's 01, 02
tsc -b --extendedDiagnostics            # met Project References
```

<span class="k fl" ></span>**Bestanden** — wat tsc moet inlezen
<span class="k me"></span>**Geheugen** — piek tijdens de check
<span class="k ti"></span>**Tijdindex** — zelfde-machine verhouding

Elke demo-meting is de mediaan van <span data-var="demo.runs">7</span> runs. 


---
<!-- footer: '<div class="tick"><div class="c"><b>00 vanilla</b><div class="r"><div class="t"><span class="fl barWithText w35"></span></div><em>66</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>61,8 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w42"></span></div><em>X</em></div></div><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div></div>' -->
## De ijsberg: wat voegen imports toe?

```ts
import { z } from 'zod';
import type { ComponentProps } from 'react';

const UserSchema = z.object({ name: z.string() });
type User = z.infer<typeof UserSchema>;

type ButtonProps = ComponentProps<'button'>;
```

- Demo gebruikt **Zod <span data-var="versions.zod">undefined</span>** en **@types/react <span data-var="versions.reactTypes">19.3.0</span>** 
- React is hier een **type-only** voorbeeld;
- Eén import kan een grote transitieve type-graaf activeren;

> Bewijs zien, probeer `npx tsc --noEmit --listFiles` bekijk `zod`, `@types/react` en hun afhankelijkheden

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div></div>' -->

## Stap 1 — De monoliet (`paths`)

```json
{ "compilerOptions": { "paths": { "@myrepo/utils": ["./packages/utils/src/index.ts"] } },
  "include": ["apps/**/*", "packages/**/*"] }
```

- `paths` = alleen een **alias** voor imports; voor tsc blijft het **één groot programma**
- Elke check: alle bestanden parsen, binden, checken

**Lokale baseline: <span data-var="demo.monolith.files">164</span> bestanden · <span data-var="demo.monolith.memory">190,0</span> MB · tijdindex <span data-var="demo.monolith.timeIndex">100</span>**

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div></div>' -->

## Stap 2 — npm workspaces

```json
{ "workspaces": ["apps/*", "packages/*"] }
```

`npm install` maakt van elke workspace een **symlink** in de root-`node_modules`:

```bash
ls -l node_modules/@myrepo/      # utils -> ../../packages/utils
```

- Daardoor werkt `import … from '@myrepo/utils'` zonder publiceren
- `tsc` volgt de symlink naar de **bronmap** → leest dezelfde `.ts`-bestanden

**De compilergrens verandert niet:** beide varianten blijven één TypeScript-programma. Kleine lokale tijdverschillen zijn geen betrouwbare snelheidsclaim.

<!-- In de echte root staat ook "private": true (npm publish blokkeren). Voor hoisting niet relevant. -->

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div></div>' -->

## Stap 3 — Project References

Een **`.d.ts`** beschrijft de publieke types van een pakket, zonder de implementatie.

```json
// packages/utils/tsconfig.json
{ "compilerOptions": { "composite": true, "declaration": true, "outDir": "dist", "rootDir": "src" } }
// apps/app/tsconfig.json
{ "references": [{ "path": "../../packages/utils" }] }
```

`tsc -b` bouwt per project, **in volgorde van de graaf**, en leest van afhankelijkheden alleen de **`.d.ts`-uitvoer** — niet hun broncode.

> **In deze demo is de koude build trager.**

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div></div>' -->

## Wat is een DAG? (gewoon Nederlands)

**D**irected · **A**cyclic · **G**raph = *pijlen tussen pakketten, zonder kringloop*

```text
        app            pijl  A ──► B  =  "A gebruikt B"
       ╱    ╲
      ▼      ▼         bouwvolgorde: eerst dependencies, dan consumers
 validation  utils     →  validation / utils (onderling willekeurig), app
```

```bash
tsc -b --verbose     # Projects in this build:  validation → utils → app → (root)
```

- Net als **bouwen**: eerst fundering, dan muren, dan dak
- **Cirkel** (`A ⇄ B`) = kip-en-ei: geen eerste stap → `tsc -b` weigert (TS6202)

**Leaf package** = pakket dat geen ander intern pakket gebruikt. Het kan wél externe dependencies hebben — `validation` gebruikt bijvoorbeeld Zod. Begin met zulke bladeren; daarna kunnen consumers er via referenties op bouwen.

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div><div class="c"><b>03 refs · koud</b><div class="r"><div class="t"><span class="fl barWithText w100"></span></div><em>387</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,6 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w100"></span></div><em>172</em></div></div></div>' -->

## Waarom koud juist *duurder* is

- `tsc -b` bouwt meerdere projecten en genereert `.d.ts`-uitvoer; een koude build doet dus extra werk
- In deze demo: **<span data-var="demo.refsCold.files">387</span> project-bestandsvermeldingen · <span data-var="demo.refsCold.memory">190,6</span> MB** tegen **<span data-var="demo.monolith.files">164</span> · <span data-var="demo.monolith.memory">190,0</span> MB** voor de monoliet
- Waarom 387? `tsc -b` rapporteert bestanden per project; de benchmark telt de drie rapporten (`validation`, `utils`, `app`) op. Gedeelde `.d.ts`- en bibliotheekbestanden tellen dus per project mee: geen 387 unieke bronbestanden.


**De winst ontstaat als volgende runs eerder werk kunnen hergebruiken.**

```bash
tsc -b --clean && tsc -b --extendedDiagnostics   # koud
```

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div><div class="c"><b>03 refs · koud</b><div class="r"><div class="t"><span class="fl barWithText w100"></span></div><em>387</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,6 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w100"></span></div><em>172</em></div></div><div class="c hot"><b>03 refs · na body-edit</b><div class="r"><div class="t"><span class="fl barWithText w17"></span></div><em>64</em></div><div class="r"><div class="t"><span class="me barWithText w13"></span></div><em>24,7 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w10"></span></div><em>18</em></div></div></div>' -->

## `.tsbuildinfo`: het geheugen van tsc

Na `tsc -b` staat naast elk project een klein bestand (hier 7–18 KB):

```text
packages/utils/tsconfig.tsbuildinfo       {"version":"…","root":[64],
packages/validation/tsconfig.tsbuildinfo   "fileNames":["lib.es5.d.ts", …
apps/app/tsconfig.tsbuildinfo              (+ hashes, signatures, diagnostics, referenced projects)
```

- Bevat: **welke bestanden, hun hash/signature, eerdere diagnostics**
- tsc vergelijkt je bron met dit bestand → *"moet dit project opnieuw?"*
- **Na een body-only edit: <span data-var="demo.refsWarm.files">64</span> bestanden · <span data-var="demo.refsWarm.memory">24,7</span> MB · tijdindex <span data-var="demo.refsWarm.timeIndex">18</span>** (alleen het gewijzigde project in deze meting)

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div><div class="c"><b>03 refs · koud</b><div class="r"><div class="t"><span class="fl barWithText w100"></span></div><em>387</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,6 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w100"></span></div><em>172</em></div></div><div class="c hot"><b>03 refs · na body-edit</b><div class="r"><div class="t"><span class="fl barWithText w17"></span></div><em>64</em></div><div class="r"><div class="t"><span class="me barWithText w13"></span></div><em>24,7 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w10"></span></div><em>18</em></div></div></div>' -->

## Bewijs: tsc legt uit waarom hij wel/niet bouwt

```bash
tsc -b --verbose      # niets gewijzigd
```
```text
Project 'packages/utils/tsconfig.json' is up to date because newest input
  'packages/utils/src/index.ts' is older than output 'packages/utils/tsconfig.tsbuildinfo'
```
```text
# 1 functie-body in utils aangepast (publieke signatuur gelijk):
Project 'packages/utils/…' is out of date because output '…tsbuildinfo' is older than input …
Building project 'packages/utils/tsconfig.json'...
Project 'apps/app/tsconfig.json' is up to date with .d.ts files from its dependencies
```

→ utils opnieuw, **app overgeslagen**: de `.d.ts` is niet veranderd.

---

## Twee wijzigingen, twee uitkomsten

**1 · Implementatie wijzigt, publieke signatuur blijft gelijk**

```ts
export function formatDate(date: Date): string {
  return date.toISOString().slice(0); // alleen de body wijzigt
}
```

`utils` wordt opnieuw gebouwd. De `.d.ts` blijft gelijk, dus `app` hoeft niet opnieuw getypecheckt te worden.

**2 · Publieke signatuur wijzigt**

```ts
export function formatDate(date: string): string { /* ... */ }
```

De declaration verandert; afhankelijke projecten worden opnieuw gecontroleerd. De bestaande `app`-aanroep met `Date` wordt nu terecht een typefout.

> De warmmeting in de grafiek is alleen scenario 1. Een API-wijziging is een ander scenario en kan downstream werk triggeren.

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div><div class="c"><b>03 refs · koud</b><div class="r"><div class="t"><span class="fl barWithText w100"></span></div><em>387</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,6 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w100"></span></div><em>172</em></div></div><div class="c hot"><b>03 refs · na body-edit</b><div class="r"><div class="t"><span class="fl barWithText w17"></span></div><em>64</em></div><div class="r"><div class="t"><span class="me barWithText w13"></span></div><em>24,7 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w10"></span></div><em>18</em></div></div></div>' -->

## "Waarom niet gewoon `--incremental`?"

```bash
tsc --noEmit --incremental --tsBuildInfoFile .cache/mono.tsbuildinfo
```

**Wat tsc doet:**
1. Schrijft na de run een `.tsbuildinfo` (bestandslijst, **hash** + **signature** per bestand, diagnostics)
2. Volgende run: vergelijkt de hashes met de huidige bestanden
3. Hergebruikt waar mogelijk werk uit de vorige check

`--incremental` bewaart informatie voor één groot programma. Het helpt herhaalchecks, maar maakt niet vanzelf interne projectgrenzen of een build-graaf.

> **Incremental builds helpen ook zonder references.** References voegen projectgrenzen, volgorde en per-project invalidatie toe.

De grafiek vergelijkt met een monoliet **zonder `--incremental`**; de extra snelheidswinst van references daarbovenop is nog niet gemeten.

<!--
Dit is het eerlijke antwoord: incremental builds helpen óók zonder project references.
-->

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div><div class="c"><b>03 refs · koud</b><div class="r"><div class="t"><span class="fl barWithText w100"></span></div><em>387</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,6 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w100"></span></div><em>172</em></div></div><div class="c hot"><b>03 refs · na body-edit</b><div class="r"><div class="t"><span class="fl barWithText w17"></span></div><em>64</em></div><div class="r"><div class="t"><span class="me barWithText w13"></span></div><em>24,7 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w10"></span></div><em>18</em></div></div></div>' -->

## Waarom dan toch Project References?

`composite` maakt een project geschikt om naar te verwijzen; `references` legt de relaties tussen projecten vast. Elk project heeft zijn eigen build-info.

| Eigenschap | Monoliet + incremental | Project References |
| :-- | :-- | :-- |
| TypeScript-projecten | Eén groot programma | Meerdere projecten met expliciete grenzen |
| Cache / herhaalbouw | `.tsbuildinfo` voor het programma | `.tsbuildinfo` per project |
| Afhankelijk project | Blijft onderdeel van hetzelfde programma | Kan worden overgeslagen als de `.d.ts` niet wijzigt |

`incremental` en `references` zijn geen keuze tussen "cache" en "geen cache": references gebruiken ook build-info, met extra projectgrenzen en volgorde.

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div><div class="c"><b>03 refs · koud</b><div class="r"><div class="t"><span class="fl barWithText w100"></span></div><em>387</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,6 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w100"></span></div><em>172</em></div></div><div class="c hot"><b>03 refs · na body-edit</b><div class="r"><div class="t"><span class="fl barWithText w17"></span></div><em>64</em></div><div class="r"><div class="t"><span class="me barWithText w13"></span></div><em>24,7 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w10"></span></div><em>18</em></div></div></div>' -->

## CI: koud vs. warm met pipeline-cache

- **Koud:** `tsc -b` bouwt de benodigde projecten en genereert declarations
- **Warm:** herstel `dist/` + `*.tsbuildinfo`; tsc vergelijkt inhoud en kan ongewijzigde projecten overslaan
- Cache alleen als de outputs betrouwbaar passen bij commit, compiler en configuratie

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div><div class="c"><b>03 refs · koud</b><div class="r"><div class="t"><span class="fl barWithText w100"></span></div><em>387</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,6 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w100"></span></div><em>172</em></div></div><div class="c hot"><b>03 refs · na body-edit</b><div class="r"><div class="t"><span class="fl barWithText w17"></span></div><em>64</em></div><div class="r"><div class="t"><span class="me barWithText w13"></span></div><em>24,7 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w10"></span></div><em>18</em></div></div></div>' -->

## Circulaire afhankelijkheden: de blocker

`Lib A ⇄ Lib B` → er is geen "eerste" pakket om te bouwen:

```text
error TS6202: Project references may not form a circular graph. Cycle detected: …
```

1. **Opsporen:** `madge --circular`, `dpdm`, of de Nx-graph / module-boundary-regels
2. **Splitsen:** gedeelde types naar kleine **leaf packages** (`@myrepo/shared-types`) → pijlen weer één kant op
3. **Borgen:** regel in CI zodat het niet terugkomt

<!-- Foutcode en tekst gecontroleerd met de vastgepinde compiler (let op: "circular graph", niet "closed loop"). Biome detecteert geen cirkels. -->

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div><div class="c"><b>03 refs · koud</b><div class="r"><div class="t"><span class="fl barWithText w100"></span></div><em>387</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,6 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w100"></span></div><em>172</em></div></div><div class="c hot"><b>03 refs · na body-edit</b><div class="r"><div class="t"><span class="fl barWithText w17"></span></div><em>64</em></div><div class="r"><div class="t"><span class="me barWithText w13"></span></div><em>24,7 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w10"></span></div><em>18</em></div></div></div>' -->

## De "double administration" footgun

Elke interne dependency staat op **twee plekken**: `package.json` **én** `tsconfig.json › references`.

| Vergeten referentie | Gevolg (gemeten) |
| :-- | :-- |
| `tsc -b` op schone checkout, alleen de app | ❌ `TS2307 Cannot find module '@myrepo/utils'` |
| utils-export gewijzigd, app apart gebouwd | ⚠️ **groen, terwijl het stuk is** (oude `.d.ts`) |
| mét referentie, zelfde scenario | ✅ `TS2724 … has no exported member` |

Zelfde familie als *ghost dependencies* (zie backup): **declaratie ≠ werkelijkheid**.

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div><div class="c"><b>03 refs · koud</b><div class="r"><div class="t"><span class="fl barWithText w100"></span></div><em>387</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,6 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w100"></span></div><em>172</em></div></div><div class="c hot"><b>03 refs · na body-edit</b><div class="r"><div class="t"><span class="fl barWithText w17"></span></div><em>64</em></div><div class="r"><div class="t"><span class="me barWithText w13"></span></div><em>24,7 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w10"></span></div><em>18</em></div></div></div>' -->

## Oplossing: tooling laten synchroniseren

```bash
npx update-ts-references            # package.json-dependencies  →  tsconfig references
npx update-ts-references --check    # pre-commit / CI: exit ≠ 0 als ze uit sync zijn
npx syncpack fix-mismatches         # externe versies overal gelijk
```

- Getest op de demo: referentie weggehaald → `--check` **faalt** → de fix zet hem terug
- Packages **zonder** tsconfig worden overgeslagen *(handig tijdens de migratie)*
- Husky pre-commit + dezelfde check in CI
- Nog niet gedekt: *ghost dependencies* → ESLint-regel / `knip`

<!--
Geen eigen script nodig voor het principe: package.json is de bron, tsconfig volgt.
In onze eigen repo gebruiken we tijdelijk een eigen variant, vanwege de overgang (libs met én zonder references, nx sync is voor ons alles-of-niets, cirkels).
-->

---
<!-- footer: '<div class="tick"><div class="c"><b>01 monoliet</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w58"></span></div><em>100</em></div></div><div class="c"><b>02 workspaces</b><div class="r"><div class="t"><span class="fl barWithText w42"></span></div><em>164</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,0 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w60"></span></div><em>103</em></div></div><div class="c"><b>03 refs · koud</b><div class="r"><div class="t"><span class="fl barWithText w100"></span></div><em>387</em></div><div class="r"><div class="t"><span class="me barWithText w100"></span></div><em>190,6 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w100"></span></div><em>172</em></div></div><div class="c hot"><b>03 refs · na body-edit</b><div class="r"><div class="t"><span class="fl barWithText w17"></span></div><em>64</em></div><div class="r"><div class="t"><span class="me barWithText w13"></span></div><em>24,7 MB</em></div><div class="r"><div class="t"><span class="ti barWithText w10"></span></div><em>18</em></div></div></div>' -->

## Overgang: libs mét en zónder references

**Leaf-first**, in kleine stappen — niet alles tegelijk:

1. **Cirkels eruit** (splitsen naar leaf packages)
2. **`composite` op de leaves** (pakketten zonder interne dependencies)
3. **Afnemers verwijzen** naar die leaves — de rest blijft voorlopig "oud"
4. Herhaal naar boven; de `.tsbuildinfo` groeit mee

- Een referentie wijst altijd naar een **composite** project
- Pakketten in een cirkel blijven "oud" tot ze zijn gesplitst

<!-- Onze ervaring: nx sync werkt voor ons alleen alles-of-niets. . -->

---

## Wat betekent dit voor onze CI?

**TS-check nu: ~<span data-var="team.currentCiMinutes">23</span> min, zonder references of cache.**

- **Zonder cache:** references geven geen gegarandeerde tijdwinst.
- **Met build-cache:** ongewijzigde projecten kunnen worden overgeslagen.

**Volgende stap:** test caching in GitHub Actions na een representatieve wijziging; meet inclusief cache-overhead.

> **Demowinst is nog geen CI-winst.**

---

## En VS Code / de IDE?

- Project References kunnen de TypeScript-projecten en hun grenzen explicieter maken; dat **kan** helpen bij grote projecten
- VS Code's source redirects/in-memory declarations hebben zelf ook performancekosten bij zeer grote graphs
- `declarationMap` ondersteunt navigatie over projectgrenzen

> **Geen performancebelofte:** editorrespons hangt af van repo, TypeScript-versie, projectconfiguratie en machine. Meet de echte workspace met en zonder references.

---

## Actieplan

0. **Meten** — `tsc --extendedDiagnostics` + `--listFiles` op de échte repo; pipeline-runs en duur uit Analytics
1. **Cirkels opruimen** — madge/dpdm/Nx-graph → leaf packages
2. **Bottom-up `composite`** — leaf packages eerst; `.tsbuildinfo` in `.gitignore`
3. **Afdwingen** — `update-ts-references --check` + `syncpack` + ghost-dep lint in CI
4. **CI-cache** — `dist/` + `*.tsbuildinfo`; meet koud vs. warm

> Rode draad: **TS wordt snel als het kan *onthouden* — en als wij de grenzen eerlijk houden.**

---

## Backup — demo-commando's

```bash
node demo/watch.mjs                         # tab 1: live dashboard
cd 01-monolith && npm run -s typecheck      # tab 2: koud + warm, per repo
cd 01-monolith && npx tsc --noEmit --listFiles | grep -E 'node_modules/(zod|@types/react)'
npm ls zod ; ls -l node_modules/@myrepo     # hoisting
tsc -b --verbose ; tsc -b --dry             # bouwvolgorde + waarom (niet) bouwen
npm run check-sync                          # update-ts-references --check (04)
node demo/bench.mjs all --runs 3             # lokale benchmark; append naar results.jsonl
node demo/update-presentation.mjs            # ververs alle grafieken en teamcijfers
```

---
<!-- footer: '' -->
<!-- _paginate: false -->

---

## Backup — Hoisting: zonder vs. met workspaces

`npm i zod` in `packages/a` én `packages/b`:

| | ~~workspaces~~ | workspaces |
| :-- | :-- | :-- |
| `a/node_modules/zod` | ✔ | ✘ |
| `b/node_modules/zod` | ✔ | ✘ |
| `node_modules/zod` (root) | ✘ | ✔ **1 kopie** |
| `npm ls zod` | *(leeg)* | `a → zod` · `b → zod` *(deduped)* |

- **Hoisting** = npm tilt gedeelde dependencies naar de root → **schijfruimte** + **één instantie** (belangrijk bij singletons zoals React)
- Conflicterende versies? Eén wint de root, de ander wordt **genest** in de workspace die hem nodig heeft
- Het is een **install/runtime-feature** — geen compilerwinst

---

## Backup — Hoisting: de schaduwkant — "ghost dependencies"

`packages/utils` declareert **geen enkele dependency**… maar:

```ts
// packages/utils/src/index.ts
import { z } from 'zod';            // niet in utils/package.json!
export const ghost = z.string();
```

```bash
tsc --noEmit ; echo $?                # 0  → compileert gewoon. Niemand merkt iets.
```

- Werkt alleen omdat Zod **toevallig** hoger in de boom ligt (hoisting)
- Breekt bij: publiceren, package extraheren, andere installer (pnpm), versie-conflict
- Vangen: ESLint `import/no-extraneous-dependencies`, `knip`, `depcheck`
