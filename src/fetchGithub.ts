import { Octokit } from "@octokit/rest";
import type { Config, GitHubPR } from "./types.js";

// Orgs that require SSO (skip fetching details with personal token)
const SSO_ORGS = ["vercel"];

async function fetchPRsWithToken(
  token: string,
  username: string,
  startStr: string,
  endStr: string,
  skipSSOOrgs: boolean
): Promise<GitHubPR[]> {
  const octokit = new Octokit({ auth: token });

  const query = `is:pr author:${username} is:merged merged:${startStr}..${endStr}`;
  const prs: GitHubPR[] = [];

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data } = await octokit.search.issuesAndPullRequests({
      q: query,
      per_page: 100,
      page,
      sort: "updated",
      order: "desc",
    });

    for (const item of data.items) {
      const repoUrlParts = item.repository_url.split("/");
      const owner = repoUrlParts[repoUrlParts.length - 2];
      const repo = repoUrlParts[repoUrlParts.length - 1];

      // Skip SSO orgs when using personal token (would get 403)
      if (skipSSOOrgs && SSO_ORGS.includes(owner)) {
        continue;
      }

      try {
        const { data: prDetails } = await octokit.pulls.get({
          owner,
          repo,
          pull_number: item.number,
        });

        prs.push({
          title: item.title,
          url: item.html_url,
          repo: `${owner}/${repo}`,
          mergedAt: item.closed_at || undefined,
          body: item.body || undefined,
          additions: prDetails.additions,
          deletions: prDetails.deletions,
        });
      } catch {
        prs.push({
          title: item.title,
          url: item.html_url,
          repo: `${owner}/${repo}`,
          mergedAt: item.closed_at || undefined,
          body: item.body || undefined,
          additions: 0,
          deletions: 0,
        });
      }
    }

    hasMore = data.items.length === 100 && page * 100 < data.total_count;
    page++;
  }

  return prs;
}

export async function fetchGitHubPRs(config: Config): Promise<GitHubPR[]> {
  console.log("📥 Fetching GitHub PRs...");

  const startStr = config.startDate.toISOString().split("T")[0];
  const endStr = config.endDate.toISOString().split("T")[0];

  const allPRs: GitHubPR[] = [];
  const seenUrls = new Set<string>();

  // Fetch with main token (SSO authorized - for org repos)
  const ssoResults = await fetchPRsWithToken(
    config.githubToken,
    config.githubUsername,
    startStr,
    endStr,
    false // don't skip any orgs
  );

  for (const pr of ssoResults) {
    seenUrls.add(pr.url);
    allPRs.push(pr);
  }

  // Fetch with personal token if configured (for non-SSO repos)
  const personalToken = process.env.PERSONAL_GITHUB_TOKEN;
  if (personalToken && personalToken !== config.githubToken) {
    const personalResults = await fetchPRsWithToken(
      personalToken,
      config.githubUsername,
      startStr,
      endStr,
      true // skip SSO orgs to avoid 403s
    );

    // Add only unique PRs (ones not already found by SSO token)
    for (const pr of personalResults) {
      if (!seenUrls.has(pr.url)) {
        seenUrls.add(pr.url);
        allPRs.push(pr);
      }
    }
  }

  // Sort by merged date (newest first)
  allPRs.sort((a, b) => {
    if (!a.mergedAt || !b.mergedAt) return 0;
    return new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime();
  });

  console.log(`   ✅ Found ${allPRs.length} PRs`);
  return allPRs;
}
