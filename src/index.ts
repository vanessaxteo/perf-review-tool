import { Command } from "commander";
import fs from "fs";
import dotenv from "dotenv";
import { fetchLinearTickets } from "./fetchLinear.js";
import { fetchGitHubPRs } from "./fetchGithub.js";
import { generateAISummaryFromMarkdown } from "./generateSummary.js";
import { exportToMarkdown } from "./exportMarkdown.js";
import type { Config, ReviewData } from "./types.js";

dotenv.config();

// Parse YYYY-MM-DD as local time (not UTC)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const program = new Command();

program
  .name("perf-review")
  .description("Aggregate Linear tickets & GitHub PRs for performance reviews")
  .version("1.0.0");

// Main command - fetch and generate
program
  .command("generate", { isDefault: true })
  .description("Fetch data and generate performance review markdown")
  .requiredOption("-s, --start <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("-e, --end <date>", "End date (YYYY-MM-DD)")
  .option("-o, --output <filename>", "Output filename (default: perf-review-<period>.md)")
  .option("--linear-only", "Only fetch Linear tickets")
  .option("--github-only", "Only fetch GitHub PRs")
  .action(async (options) => {
    const linearApiKey = process.env.LINEAR_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;
    const githubUsername = process.env.GITHUB_USERNAME;

    if (!options.githubOnly && !linearApiKey) {
      console.error("Missing LINEAR_API_KEY in .env file");
      process.exit(1);
    }

    if (!options.linearOnly && !githubToken) {
      console.error("Missing GITHUB_TOKEN in .env file");
      process.exit(1);
    }

    if (!options.linearOnly && !githubUsername) {
      console.error("Missing GITHUB_USERNAME in .env file");
      process.exit(1);
    }

    const startDate = parseLocalDate(options.start);
    const endDate = parseLocalDate(options.end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("Invalid date format. Use YYYY-MM-DD");
      process.exit(1);
    }

    endDate.setHours(23, 59, 59, 999);

    console.log(`\n📅 Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n`);

    const config: Config = {
      linearApiKey: linearApiKey || "",
      githubToken: githubToken || "",
      githubUsername: githubUsername || "",
      startDate,
      endDate,
    };

    const tickets = options.githubOnly ? [] : await fetchLinearTickets(config);
    const prs = options.linearOnly ? [] : await fetchGitHubPRs(config);

    const totalAdditions = prs.reduce((sum, pr) => sum + pr.additions, 0);
    const totalDeletions = prs.reduce((sum, pr) => sum + pr.deletions, 0);

    const period = `${startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

    const reviewData: ReviewData = {
      summary: {
        ticketsCompleted: tickets.length,
        prsMerged: prs.length,
        period,
        totalAdditions,
        totalDeletions,
      },
      tickets,
      prs,
    };

    const outputFile = exportToMarkdown(reviewData, options.output);

    console.log("\n================================");
    console.log("📊 Summary:");
    console.log(`   • ${tickets.length} Linear tickets completed`);
    console.log(`   • ${prs.length} GitHub PRs merged`);
    console.log(`   • +${totalAdditions.toLocaleString()} / -${totalDeletions.toLocaleString()} lines changed`);
    console.log(`\n📄 Output: ${outputFile}\n`);
  });

// Add AI summary to existing file
program
  .command("add-ai <file>")
  .description("Add AI-generated summary to an existing markdown file")
  .action(async (file) => {
    if (!fs.existsSync(file)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }

    if (!process.env.AI_GATEWAY_API_KEY) {
      console.error("Missing AI_GATEWAY_API_KEY in .env file");
      process.exit(1);
    }

    console.log(`\n📄 Reading ${file}...`);
    const content = fs.readFileSync(file, "utf-8");

    // Check if AI summary already exists
    if (content.includes("## ✨ AI-Generated Accomplishments")) {
      console.log("⚠️  File already has an AI summary. Remove it first to regenerate.");
      process.exit(1);
    }

    try {
      const aiSummary = await generateAISummaryFromMarkdown(content);

      // Insert AI summary after the Summary table (after the first "---")
      const insertPoint = content.indexOf("---");
      if (insertPoint === -1) {
        console.error("Could not find insertion point in markdown");
        process.exit(1);
      }

      const newContent =
        content.slice(0, insertPoint) +
        "---\n\n## ✨ AI-Generated Accomplishments\n\n" +
        aiSummary +
        "\n\n" +
        content.slice(insertPoint);

      fs.writeFileSync(file, newContent, "utf-8");
      console.log(`\n✅ Added AI summary to ${file}\n`);
    } catch (error) {
      console.error("❌ AI summary generation failed:");
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      }
      process.exit(1);
    }
  });

program.parse();
