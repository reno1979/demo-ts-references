# Live terminal demo

```bash
# one-time (before the talk)
for d in 0*/; do (cd $d && npm install); done
node demo/gen-load.mjs 60        # make the repo realistically heavy (0 = remove again)

# the show (single terminal, pauses between steps)
./demo/run-demo.sh               # RUNS=3 ./demo/run-demo.sh  for steadier numbers

# building blocks
node demo/bench.mjs 03 --verbose # measure one step, append to demo/results.jsonl
node demo/chart.mjs              # redraw chart   (--metric wall|check|files|mem  --scenario cold|edit)
```
Tip: for the detailed graphs, keep the window ≥ 100 columns wide. For large presentation fonts, use the overlaid time/memory view below.

## Small terminal pane
```bash
node demo/chart.mjs --present          # overlaid time/memory bars (40 columns, 16 lines)
./demo/live.sh 03                      # measure step 03 + compact chart (~9 lines, 64 cols)
node demo/chart.mjs --compact          # redraw only (--scenario cold|edit  --metric files|mem)
```

## File-based flow (tsc-bench.txt + live dashboard)
```bash
# terminal tab 1 (stays open, redraws whenever tsc-bench.txt changes)
node demo/watch.mjs                     # presentation view: time + memory, WARM over COLD
node demo/watch.mjs --dash wall,mem,types # optional detailed dashboard

# terminal tab 2: SAME command in every step. It runs a COLD check (clean state) and a WARM check
# (1 line changed in utils, then restored) and appends the raw tsc output of both to ../tsc-bench.txt
cd 01-monolith && npm run typecheck
cd ../02-npm-workspaces && npm run typecheck
cd ../03-project-references && npm run typecheck
cd ../04-automated-monorepo && npm run typecheck
```
The screen is cleared at the start of every run (`NOCLEAR=1` disables). `ONLY=cold npm run typecheck` = cold run only · `VERBOSE=1` = also print raw tsc output · reset = delete tsc-bench.txt.
Windows PowerShell: `$env:ONLY="cold"; npm run typecheck`.
The default watcher shows wall time and peak compiler memory in 40 columns and 16 lines. Each setup has two rows: Time and Mem. COLD is a shaded background (`░`); WARM is solid (`█`) drawn over it. The shaded remainder highlights the savings; if warm equals or exceeds cold, the solid bar covers the cold bar completely. Time shares one scale across all setups, memory another. Positive values have at least one bar cell so small measurements remain visible.

COLD = clean build without cache; WARM = after a one-line function-body edit. Values read `COLD>WARM`. The percentage compares WARM against that setup's COLD measurement (e.g. `-91%` = 91% less time or memory, `+20%` = 20% more). Missing measurements or percentages without a positive cold baseline show `--`. Each metric uses the latest measurement for that setup and scenario.

Memory is TypeScript's reported `Memory used` (the maximum across project blocks), not total process/container RSS or a guarantee of fitting a CI memory limit.
The optional `--dash` view shows wall time, peak memory, types computed (the iceberg: work hidden under the surface) and optionally AST nodes parsed.
Note: for 01/02 cold == warm by nature (no cache exists); differences between them are just noise.

## TypeScript 7 notes
- `baseUrl` was removed in TS 7 (error TS5102) -> removed from 01-monolith/tsconfig.json; `paths` work without it.
- An errored run checks nothing and looks "instant": bench.mjs refuses to record it, watch.mjs ignores it and shows a red warning.
- `--builders N` / `--checkers N` are accepted by `tsc`/`tsc -b`; test them on a multi-core machine (`tsc -b --builders 4`).
