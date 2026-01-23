#!/bin/bash

# Generate performance review with AI summary in one step
# Usage: ./review-with-ai.sh <start-date> <end-date> [output-filename]
# Example: ./review-with-ai.sh 2025-09-01 2026-01-23
# Example: ./review-with-ai.sh 2025-09-01 2026-01-23 my-review.md

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./review-with-ai.sh <start-date> <end-date> [output-filename]"
  echo "Example: ./review-with-ai.sh 2025-09-01 2026-01-23"
  echo "Example: ./review-with-ai.sh 2025-09-01 2026-01-23 my-review.md"
  exit 1
fi

START_DATE=$1
END_DATE=$2
OUTPUT_FILE=$3

echo "🚀 Starting performance review generation..."
echo ""

# Step 1: Generate the review
if [ -z "$OUTPUT_FILE" ]; then
  echo "📊 Generating performance review from $START_DATE to $END_DATE..."
  OUTPUT=$(./node_modules/.bin/tsx src/index.ts generate -s "$START_DATE" -e "$END_DATE" 2>&1 | tee /dev/tty | grep -o 'perf-review-[^[:space:]]*\.md' | tail -1)
else
  echo "📊 Generating performance review from $START_DATE to $END_DATE..."
  ./node_modules/.bin/tsx src/index.ts generate -s "$START_DATE" -e "$END_DATE" -o "$OUTPUT_FILE"
  OUTPUT=$OUTPUT_FILE
fi

echo ""

# Check if generation was successful
if [ -z "$OUTPUT" ] || [ ! -f "$OUTPUT" ]; then
  echo "❌ Failed to generate review file"
  exit 1
fi

# Step 2: Add AI summary
echo "🤖 Adding AI summary to $OUTPUT..."
echo ""
./node_modules/.bin/tsx src/index.ts add-ai "$OUTPUT"

echo ""
echo "✅ Done! Your performance review with AI summary is ready: $OUTPUT"
