#!/usr/bin/env bash
# Guided live demo — everything happens in ONE terminal.
#   ./demo/run-demo.sh          pauses between steps (press Enter)
#   ./demo/run-demo.sh --auto   no pauses (dry run)
set -euo pipefail
cd "$(dirname "$0")/.."
AUTO=${1:-}
RUNS=${RUNS:-1}                       # use RUNS=3 for steadier numbers
STEPS=(01-monolith 02-npm-workspaces 03-project-references 04-automated-monorepo)
IDS=(01 02 03 04)
b=$'\e[1m'; d=$'\e[2m'; y=$'\e[33m'; n=$'\e[0m'

pause() { [[ "$AUTO" == "--auto" ]] || read -rp "${d}  ⏎ ${n}" _; }
title() { clear; echo; echo "  ${b}${y}$1${n}"; echo "  ${d}$2${n}"; echo; }

node demo/bench.mjs --reset >/dev/null

for i in 0 1 2 3; do
  case $i in
    0) title "STEP 1 — The monolith" "one tsconfig, path aliases. Baseline." ;;
    1) title "STEP 2 — npm workspaces" "nicer structure… does tsc care?" ;;
    2) title "STEP 3 — TypeScript Project References" "composite + tsc -b : what changed in the config?" ;;
    3) title "STEP 4 — Zero-touch automation" "same speed as step 3 — but now nobody can forget a reference" ;;
  esac
  if (( i > 0 )); then
    echo "${d}  \$ diff -ru ${STEPS[i-1]} ${STEPS[i]}  (configs only)${n}"
    diff -ru --exclude=node_modules --exclude=dist --exclude=gen --exclude='*.tsbuildinfo' --exclude=package-lock.json \
      "${STEPS[i-1]}" "${STEPS[i]}" | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | head -${DIFF_LINES:-18} || true
    echo; pause
  fi
  node demo/bench.mjs "${IDS[i]}" --runs "$RUNS"
  node demo/chart.mjs --dash
  pause
done

title "BONUS — the guardrail (step 4)" "someone adds a dependency but forgets the tsconfig reference"
cp 04-automated-monorepo/apps/app/tsconfig.json /tmp/app-tsconfig.bak
node -e "
const f='04-automated-monorepo/apps/app/tsconfig.json',j=JSON.parse(require('fs').readFileSync(f));
j.references=j.references.slice(0,1);require('fs').writeFileSync(f,JSON.stringify(j,null,2)+'\n')"
echo "${d}  (I just removed one reference from apps/app/tsconfig.json)${n}"; echo
echo "${d}  \$ npm run check-sync${n}"
(cd 04-automated-monorepo && npm run -s check-sync) || true
pause
echo "${d}  \$ npm run sync${n}"
(cd 04-automated-monorepo && npm run -s sync)
cp /tmp/app-tsconfig.bak 04-automated-monorepo/apps/app/tsconfig.json
echo; echo "  ${b}Done.${n}  Re-draw any chart:  node demo/chart.mjs --metric files|mem|check"
