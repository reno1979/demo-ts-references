#!/usr/bin/env bash
# One short command per step, made for a small terminal pane:   ./demo/live.sh 03
cd "$(dirname "$0")/.."
node demo/bench.mjs "$1" --runs "${RUNS:-1}" | sed '/^$/d'
node demo/chart.mjs --compact "${@:2}"
