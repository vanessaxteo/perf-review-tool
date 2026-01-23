#!/bin/bash

# Generate a new performance review
# Usage: ./generate-review.sh <start-date> <end-date>
# Example: ./generate-review.sh 2025-09-01 2026-01-23

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./generate-review.sh <start-date> <end-date>"
  echo "Example: ./generate-review.sh 2025-09-01 2026-01-23"
  exit 1
fi

echo "📊 Generating performance review from $1 to $2..."
./node_modules/.bin/tsx src/index.ts generate -s "$1" -e "$2"
