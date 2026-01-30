#!/bin/bash

# Generate this week's update and export to Notion
# Usage: ./this-week.sh [options]
# 
# Options:
#   -d, --days <n>    Look back N days (default: current week Mon-Sun)
#   --no-ai           Skip AI summary

echo "📋 Generating this week's update..."
./node_modules/.bin/tsx src/index.ts sync --notion "$@"
