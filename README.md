# 📊 Performance Review Tool

Automatically aggregate Linear tickets and GitHub PRs to help write performance reviews and weekly updates.

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

# Notion Integration
NOTION_API_KEY=secret_xxx
NOTION_PAGE_ID=your-page-id
```

## 📝 Usage

### This Week's Update

Export your week's work directly to Notion:
```bash
./this-week.sh
```

This will:
- Fetch Linear tickets and PRs from the current week (Mon-Sun)
- Generate an AI summary
- Add a toggle to your Notion page under the current year

Other options:
```bash
./this-week.sh -d 14            # Look back 14 days instead
./this-week.sh --no-ai          # Skip AI summary
```

### Performance Review (Full Period)

Export a full performance review to Notion with AI summary:
```bash
./perf-review-notion.sh 2025-09-01 2026-01-23
```

Or generate a markdown file instead:
```bash
npm start -- generate -s 2025-09-01 -e 2026-01-23
```

## 🎯 Features

- ✅ Fetches completed Linear tickets in date range
- ✅ Fetches merged GitHub PRs with line stats
- ✅ Fetches open PRs (for weekly updates)
- ✅ Supports multiple GitHub tokens (SSO + personal repos)
- ✅ AI-generated accomplishment summary using GPT-4o
- ✅ **Notion integration** - Export directly to Notion
- ✅ Groups PRs by repository
- ✅ Includes stats (lines added/removed)

## 📋 Output Format

### This Week (Notion)
Creates a toggle inside your year section:
```
> 2026
  > 1/26-2/1
    *AI summary...*
    **Linear Tickets**
    - TICKET-123 Title
    **PRs**
    - [repo] PR title +100/-50
    - [repo] Open PR +50/-10 (open)
```

### Performance Review (Notion)
Creates a subpage with:
- Summary callout (tickets, PRs, lines changed)
- AI-generated themes and accomplishments
- Linear tickets with links
- PRs grouped by repo

## 🔧 Advanced Options

```bash
# Fetch only Linear tickets
npm start -- generate -s 2025-09-01 -e 2026-01-23 --linear-only

# Fetch only GitHub PRs
npm start -- generate -s 2025-09-01 -e 2026-01-23 --github-only

# Custom output filename
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
3. Give repository access with your organization
4. Add scopes: `contents`, `pull requests`, `metadata`

**For personal repos:**
1. Go to https://github.com/settings/tokens
2. Create a classic token
3. Add scopes: `repo`, `read:user`

### Vercel AI Gateway Key
1. Go to your Vercel AI Gateway dashboard
2. Copy your API key (starts with `vck_`)
3. Add to `.env` as `AI_GATEWAY_API_KEY`

### Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Copy the "Internal Integration Secret" to `NOTION_API_KEY`
4. Open your Notion page, click `...` → **Connections** → Add your integration
5. Get the page ID from the URL: `notion.so/workspace/PAGE_ID`
6. Add to `.env` as `NOTION_PAGE_ID`

**Note:** For weekly updates to nest inside a year toggle, make sure your Notion page has a toggle (not a heading) named "2026" (or current year).

## 📁 Project Structure

```
perf-review-tool/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types.ts              # TypeScript interfaces
│   ├── fetchLinear.ts        # Linear API integration
│   ├── fetchGithub.ts        # GitHub API integration
│   ├── generateSummary.ts    # AI summary generation
│   ├── exportMarkdown.ts     # Markdown output
│   └── notionExport.ts       # Notion integration
├── package.json
├── tsconfig.json
├── .env                      # Your API keys (git-ignored)
├── this-week.sh              # 🌟 Weekly update (with Notion)
└── perf-review-notion.sh     # 🌟 Full review to Notion (with AI)
```

## 🐛 Troubleshooting

### "Missing AI_GATEWAY_API_KEY"
Make sure your `.env` file has `AI_GATEWAY_API_KEY` (not `AI_GATEWAY_KEY`)

### GitHub 403 errors
Make sure your fine-grained token is authorized for your SAML SSO organization

### Inaccurate line counts
Some PRs may show 0 lines if the token doesn't have access to that repo. Add `PERSONAL_GITHUB_TOKEN` for non-SSO repos.

### Notion toggle not found
Make sure "2026" (or current year) is a **toggle**, not a heading. In Notion, click the block and use "Turn into" → "Toggle list".

### This week shows wrong dates
The `--notion` flag uses the current week (Mon-Sun). Without it, it defaults to the past 7 days.

## 📄 License

MIT
