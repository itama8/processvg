#!/bin/sh
# Run Plotter's checker on every drawing; fail on any error.
set -e
cd "$(dirname "$0")/.."
status=0
for f in drawings/*.svg drawings/symbols/*.svg; do
  python3 vendor/plotter/scripts/check.py "$f" || status=1
done
exit $status
