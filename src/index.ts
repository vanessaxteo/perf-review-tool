import { Command } from "commander";
import fs from "fs";
import dotenv from "dotenv";
import { fetchLinearTickets } from "./fetchLinear.js";
import { fetchGitHubPRs, fetchOpenGitHubPRs } from "./fetchGithub.js";
import { generateAISummaryFromMarkdown, generateThisWeekSummary, generatePerfReviewSummary } from "./generateSummary.js";
import { exportToMarkdown, exportToSyncMarkdown } from "./exportMarkdown.js";
import { exportToNotion, exportPerfReviewToNotion } from "./notionExport.js";
import type { Config, ReviewData } from "./types.js";

dotenv.config();

// Parse YYYY-MM-DD as local time (not UTC)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Get the past 7 days (with buffer for timezone safety)
function getPast7Days(): { start: Date; end: Date; displayEnd: Date } {
  const end = new Date();
  // Add 1 day buffer to ensure today is fully included after UTC conversion
  end.setDate(end.getDate() + 1);
  end.setHours(23, 59, 59, 999);
  
  const displayEnd = new Date();
  displayEnd.setHours(23, 59, 59, 999);
  
  const start = new Date();
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  
  return { start, end, displayEnd };
}

// Get current week Monday through Sunday (for weekly team syncs)
function getCurrentWeekMonSun(): { start: Date; end: Date; displayEnd: Date } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to go back to get to THIS Monday
  // If today is Sunday (0), this Monday was 6 days ago
  // If today is Monday (1), this Monday is today (0 days ago)
  // If today is Thursday (4), this Monday was 3 days ago
  const daysToThisMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysToThisMonday);
  thisMonday.setHours(0, 0, 0, 0);
  
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  thisSunday.setHours(23, 59, 59, 999);
  
  // End date with buffer for API queries (to include today fully)
  const endWithBuffer = new Date(today);
  endWithBuffer.setDate(endWithBuffer.getDate() + 1);
  endWithBuffer.setHours(23, 59, 59, 999);
  
  return { start: thisMonday, end: endWithBuffer, displayEnd: thisSunday };
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
  .option("--notion", "Export to Notion as a subpage")
  .action(async (options) => {
    const linearApiKey = process.env.LINEAR_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;
    const githubUsername = process.env.GITHUB_USERNAME;
    const notionApiKey = process.env.NOTION_API_KEY;
    const notionPageId = process.env.NOTION_PAGE_ID;

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

    if (options.notion) {
      if (!notionApiKey) {
        console.error("Missing NOTION_API_KEY in .env file");
        process.exit(1);
      }
      if (!notionPageId) {
        console.error("Missing NOTION_PAGE_ID in .env file");
        process.exit(1);
      }
      if (!process.env.AI_GATEWAY_API_KEY) {
        console.error("Missing AI_GATEWAY_API_KEY in .env file");
        process.exit(1);
      }
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

    // Generate AI summary for Notion export
    if (options.notion && (tickets.length > 0 || prs.length > 0)) {
      try {
        reviewData.aiSummary = await generatePerfReviewSummary(reviewData);
      } catch (error) {
        console.error("⚠️  AI summary generation failed, continuing without it");
        if (error instanceof Error) {
          console.error(`   ${error.message}`);
        }
      }
    }

    console.log("\n================================");
    console.log("📊 Summary:");
    console.log(`   • ${tickets.length} Linear tickets completed`);
    console.log(`   • ${prs.length} GitHub PRs merged`);
    console.log(`   • +${totalAdditions.toLocaleString()} / -${totalDeletions.toLocaleString()} lines changed`);

    if (options.notion && notionApiKey && notionPageId) {
      // Export to Notion
      try {
        const notionUrl = await exportPerfReviewToNotion(reviewData, notionApiKey, notionPageId);
        console.log(`\n📝 Notion: ${notionUrl}\n`);
      } catch (error) {
        console.error("\n⚠️  Notion export failed:");
        if (error instanceof Error) {
          console.error(`   ${error.message}`);
        }
        process.exit(1);
      }
    } else {
      // Export to markdown file
      const outputFile = exportToMarkdown(reviewData, options.output);
      console.log(`\n📄 Output: ${outputFile}\n`);
    }
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

// Team sync update - quick summary of past week's work
program
  .command("sync")
  .description("Generate a team sync update for the past 7 days")
  .option("-d, --days <number>", "Number of days to look back (default: 7)")
  .option("-o, --output <filename>", "Output filename")
  .option("--no-file", "Print to console only, don't save to file")
  .option("--no-ai", "Skip AI summary generation")
  .option("--notion", "Export to Notion")
  .action(async (options) => {
    const linearApiKey = process.env.LINEAR_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;
    const githubUsername = process.env.GITHUB_USERNAME;
    const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
    const notionApiKey = process.env.NOTION_API_KEY;
    const notionPageId = process.env.NOTION_PAGE_ID;

    if (!linearApiKey) {
      console.error("Missing LINEAR_API_KEY in .env file");
      process.exit(1);
    }

    if (!githubToken) {
      console.error("Missing GITHUB_TOKEN in .env file");
      process.exit(1);
    }

    if (!githubUsername) {
      console.error("Missing GITHUB_USERNAME in .env file");
      process.exit(1);
    }

    if (options.ai !== false && !aiGatewayKey) {
      console.error("Missing AI_GATEWAY_API_KEY in .env file (use --no-ai to skip AI summary)");
      process.exit(1);
    }

    if (options.notion) {
      if (!notionApiKey) {
        console.error("Missing NOTION_API_KEY in .env file");
        process.exit(1);
      }
      if (!notionPageId) {
        console.error("Missing NOTION_PAGE_ID in .env file");
        process.exit(1);
      }
    }

    let startDate: Date;
    let endDate: Date;
    let displayEndDate: Date;

    if (options.days) {
      // Custom number of days
      const days = parseInt(options.days, 10);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      
      displayEndDate = new Date();
      displayEndDate.setHours(23, 59, 59, 999);
      
      // End date with buffer for timezone safety
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (options.notion) {
      // Use Mon-Sun of current week for Notion export
      const range = getCurrentWeekMonSun();
      startDate = range.start;
      endDate = range.end;
      displayEndDate = range.displayEnd;
    } else {
      // Default: past 7 days
      const range = getPast7Days();
      startDate = range.start;
      endDate = range.end;
      displayEndDate = range.displayEnd;
    }

    // Format for display (e.g., "Wed, Jan 22")
    const formatDateLong = (d: Date) => d.toLocaleDateString("en-US", { 
      weekday: "short", 
      month: "short", 
      day: "numeric" 
    });

    // Format for Notion toggle (e.g., "1/22-1/28")
    const formatDateShort = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

    console.log(`\n📅 Team Sync Update: ${formatDateLong(startDate)} - ${formatDateLong(displayEndDate)}\n`);

    const config: Config = {
      linearApiKey,
      githubToken,
      githubUsername,
      startDate,
      endDate,
    };

    const tickets = await fetchLinearTickets(config);
    const prs = await fetchGitHubPRs(config);

    // Fetch open PRs if exporting to Notion
    let openPrs: typeof prs = [];
    if (options.notion) {
      openPrs = await fetchOpenGitHubPRs(config);
    }

    const totalAdditions = prs.reduce((sum, pr) => sum + pr.additions, 0);
    const totalDeletions = prs.reduce((sum, pr) => sum + pr.deletions, 0);

    // Use short format for Notion, long format otherwise
    const period = options.notion 
      ? `${formatDateShort(startDate)}-${formatDateShort(displayEndDate)}`
      : `${formatDateLong(startDate)} - ${formatDateLong(displayEndDate)}`;

    const reviewData: ReviewData = {
      summary: {
        ticketsCompleted: tickets.length,
        prsMerged: prs.length,
        prsOpen: openPrs.length,
        period,
        totalAdditions,
        totalDeletions,
      },
      tickets,
      prs,
      openPrs: openPrs.length > 0 ? openPrs : undefined,
    };

    // Generate AI summary
    if (options.ai !== false && (tickets.length > 0 || prs.length > 0)) {
      try {
        reviewData.aiSummary = await generateThisWeekSummary(reviewData);
      } catch (error) {
        console.error("⚠️  AI summary generation failed, continuing without it");
        if (error instanceof Error) {
          console.error(`   ${error.message}`);
        }
      }
    }

    // Export to Notion if requested
    let notionUrl: string | undefined;
    if (options.notion && notionApiKey && notionPageId) {
      try {
        notionUrl = await exportToNotion(reviewData, notionApiKey, notionPageId);
      } catch (error) {
        console.error("⚠️  Notion export failed:");
        if (error instanceof Error) {
          console.error(`   ${error.message}`);
        }
      }
    }

    console.log("\n================================");
    console.log("📊 This Week:");
    console.log(`   • ${tickets.length} Linear tickets completed`);
    console.log(`   • ${prs.length} GitHub PRs merged`);
    if (openPrs.length > 0) {
      console.log(`   • ${openPrs.length} GitHub PRs open`);
    }

    if (notionUrl) {
      // Notion export - no markdown file needed
      console.log(`\n📝 Notion: ${notionUrl}\n`);
    } else if (options.file === false) {
      // Print to console only
      const output = exportToSyncMarkdown(reviewData);
      console.log("\n" + output);
    } else {
      // Save to markdown file
      const dateStr = startDate.toISOString().split("T")[0];
      const defaultFilename = `team-sync-${dateStr}.md`;
      const outputFile = exportToSyncMarkdown(reviewData, options.output || defaultFilename);
      console.log(`\n📄 Output: ${outputFile}\n`);
    }
  });

program.parse();
