#!/bin/bash

# Add AI summary to performance review markdown file
# Usage: ./add-summary.sh <filename>

if [ -z "$1" ]; then
  echo "Usage: ./add-summary.sh <markdown-file>"
  echo "Example: ./add-summary.sh perf-review-sep-2025---jan-2026.md"
  exit 1
fi

echo "🤖 Adding AI summary to $1..."
./node_modules/.bin/tsx src/index.ts add-ai "$1"
