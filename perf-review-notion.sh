#!/bin/bash

# Generate a performance review and export to Notion (with AI summary)
# Usage: ./perf-review-notion.sh <start-date> <end-date>
# Example: ./perf-review-notion.sh 2025-09-01 2026-01-23

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./perf-review-notion.sh <start-date> <end-date>"
  echo "Example: ./perf-review-notion.sh 2025-09-01 2026-01-23"
  exit 1
fi

echo "📊 Generating performance review and exporting to Notion..."
./node_modules/.bin/tsx src/index.ts generate -s "$1" -e "$2" --notion
