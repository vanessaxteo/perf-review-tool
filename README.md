# 📊 Performance Review Tool

Automatically aggregate Linear tickets and GitHub PRs to help write performance reviews.

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Create a `.env` file with:
```bash
# Linear API Key (from https://linear.app/settings/api)
LINEAR_API_KEY=lin_api_xxx

# GitHub Token (from https://github.com/settings/tokens)
GITHUB_TOKEN=github_pat_xxx
GITHUB_USERNAME=your-username

# Optional: Personal GitHub token for non-SSO repos
PERSONAL_GITHUB_TOKEN=ghp_xxx

# Vercel AI Gateway (for AI summaries)
AI_GATEWAY_API_KEY=vck_xxx
```

## 📝 Usage

### Generate review with AI summary (all-in-one)
```bash
./review-with-ai.sh 2025-09-01 2026-01-23
```

Or with custom filename:
```bash
./review-with-ai.sh 2025-09-01 2026-01-23 my-review.md
```

### Generate a new performance review (without AI)
```bash
./generate-review.sh 2025-09-01 2026-01-23
```

Or use npm directly:
```bash
npm start -- generate -s 2025-09-01 -e 2026-01-23
```

### Add AI summary to existing file
```bash
./add-summary.sh perf-review-sep-2025---jan-2026.md
```

Or use npm directly:
```bash
npm start add-ai perf-review-sep-2025---jan-2026.md
```

## 🎯 Features

- ✅ Fetches completed Linear tickets in date range
- ✅ Fetches merged GitHub PRs with line stats
- ✅ Supports multiple GitHub tokens (SSO + personal repos)
- ✅ AI-generated accomplishment summary using GPT-4o
- ✅ Generates clean Markdown output
- ✅ Groups PRs by repository
- ✅ Includes stats (lines added/removed)

## 📋 Output Format

The generated Markdown file includes:

1. **Summary Table** - Key metrics (tickets, PRs, lines changed)
2. **AI-Generated Accomplishments** - Themes and impact (optional)
3. **Linear Tickets** - All completed tickets with links
4. **GitHub PRs** - All merged PRs grouped by repo

## 🔧 Advanced Options

### Fetch only Linear tickets
```bash
npm start -- generate -s 2025-09-01 -e 2026-01-23 --linear-only
```

### Fetch only GitHub PRs
```bash
npm start -- generate -s 2025-09-01 -e 2026-01-23 --github-only
```

### Custom output filename
```bash
npm start -- generate -s 2025-09-01 -e 2026-01-23 -o my-review.md
```

## 🔑 Getting API Keys

### Linear API Key
1. Go to https://linear.app/settings/api
2. Create a new Personal API Key
3. Copy and paste into `.env`

### GitHub Token
**For SAML SSO orgs (like Vercel):**
1. Go to https://github.com/settings/tokens?type=beta
2. Create a fine-grained token
3. Give repository access with the Vercel organization
4. Add scopes: `contents`, `pull requests`, `metadata`

**For personal repos:**
1. Go to https://github.com/settings/tokens
2. Create a classic token
3. Add scopes: `repo`, `read:user`

### Vercel AI Gateway Key
1. Go to your Vercel AI Gateway dashboard
2. Copy your API key (starts with `vck_`)
3. Add to `.env` as `AI_GATEWAY_API_KEY`

## 📁 Project Structure

```
vteo-perf-review/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript interfaces
│   ├── fetchLinear.ts        # Linear API integration
│   ├── fetchGithub.ts        # GitHub API integration
│   ├── generateSummary.ts    # AI summary generation
│   └── exportMarkdown.ts     # Markdown output
├── package.json
├── tsconfig.json
├── .env                      # Your API keys (git-ignored)
├── review-with-ai.sh         # 🌟 Generate review + AI (all-in-one)
├── generate-review.sh        # Generate review only
└── add-summary.sh            # Add AI summary to existing file
```

## 🐛 Troubleshooting

### "Missing AI_GATEWAY_API_KEY"
Make sure your `.env` file has `AI_GATEWAY_API_KEY` (not `AI_GATEWAY_KEY`)

### GitHub 403 errors
Make sure your fine-grained token is authorized for your SAML SSO organization

### Inaccurate line counts
Some PRs may show 0 lines if the token doesn't have access to that repo. Add `PERSONAL_GITHUB_TOKEN` for non-SSO repos.

## 📄 License

MIT
