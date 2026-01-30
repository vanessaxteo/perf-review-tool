import fs from "fs";
import type { ReviewData } from "./types.js";

export function generateSyncMarkdown(data: ReviewData): string {
  const lines: string[] = [];

  // Header
  lines.push(`# 📋 Team Sync Update - ${data.summary.period}`);
  lines.push("");

  // Quick stats
  lines.push(`**${data.summary.ticketsCompleted} tickets** completed · **${data.summary.prsMerged} PRs** merged`);
  lines.push("");

  // AI Summary at the top
  if (data.aiSummary) {
    lines.push("## ✨ Summary");
    lines.push("");
    lines.push(data.aiSummary);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Linear Tickets - compact format
  if (data.tickets.length > 0) {
    lines.push("## ✅ Completed");
    lines.push("");
    for (const ticket of data.tickets) {
      lines.push(`- [${ticket.id}](${ticket.url}) ${ticket.title}`);
    }
    lines.push("");
  }

  // PRs - compact format grouped by repo
  if (data.prs.length > 0) {
    lines.push("## 🔀 PRs Merged");
    lines.push("");
    
    const prsByRepo = new Map<string, typeof data.prs>();
    for (const pr of data.prs) {
      if (!prsByRepo.has(pr.repo)) {
        prsByRepo.set(pr.repo, []);
      }
      prsByRepo.get(pr.repo)!.push(pr);
    }

    for (const [repo, prs] of prsByRepo) {
      lines.push(`**${repo}**`);
      for (const pr of prs) {
        lines.push(`- [${pr.title}](${pr.url})`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function exportToSyncMarkdown(data: ReviewData, filename?: string): string {
  const md = generateSyncMarkdown(data);
  
  if (!filename) {
    // Return the markdown content directly (for console output)
    return md;
  }
  
  fs.writeFileSync(filename, md, "utf-8");
  return filename;
}

export function generateMarkdown(data: ReviewData): string {
  const lines: string[] = [];

  // Header
  lines.push(`# 📊 Performance Review - ${data.summary.period}`);
  lines.push("");
  lines.push(`> Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
  lines.push("");

  // Summary Stats
  lines.push("## 🎯 Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Tickets Completed | ${data.summary.ticketsCompleted} |`);
  lines.push(`| PRs Merged | ${data.summary.prsMerged} |`);
  lines.push(`| Lines Added | +${data.summary.totalAdditions.toLocaleString()} |`);
  lines.push(`| Lines Removed | -${data.summary.totalDeletions.toLocaleString()} |`);
  lines.push("");

  // AI Summary Section (if available)
  if (data.aiSummary) {
    lines.push("---");
    lines.push("");
    lines.push("## ✨ AI-Generated Accomplishments");
    lines.push("");
    lines.push(data.aiSummary);
    lines.push("");
  }

  // Linear Tickets Section
  lines.push("---");
  lines.push("");
  lines.push("## 🎫 Linear Tickets Completed");
  lines.push("");

  if (data.tickets.length === 0) {
    lines.push("_No tickets found for this period._");
  } else {
    // Group by labels if possible
    const ticketsByLabel = new Map<string, typeof data.tickets>();
    
    for (const ticket of data.tickets) {
      const primaryLabel = ticket.labels[0] || "Other";
      if (!ticketsByLabel.has(primaryLabel)) {
        ticketsByLabel.set(primaryLabel, []);
      }
      ticketsByLabel.get(primaryLabel)!.push(ticket);
    }

    // If we have meaningful labels, group by them
    if (ticketsByLabel.size > 1 && !ticketsByLabel.has("Other")) {
      for (const [label, tickets] of ticketsByLabel) {
        lines.push(`### ${label}`);
        lines.push("");
        for (const ticket of tickets) {
          lines.push(`- **[${ticket.id}](${ticket.url})**: ${ticket.title}`);
        }
        lines.push("");
      }
    } else {
      // Otherwise just list them
      for (const ticket of data.tickets) {
        const labels = ticket.labels.length > 0 ? ` _(${ticket.labels.join(", ")})_` : "";
        lines.push(`- **[${ticket.id}](${ticket.url})**: ${ticket.title}${labels}`);
      }
    }
  }
  lines.push("");

  // GitHub PRs Section
  lines.push("---");
  lines.push("");
  lines.push("## 🔀 GitHub PRs Merged");
  lines.push("");

  if (data.prs.length === 0) {
    lines.push("_No PRs found for this period._");
  } else {
    // Group by repo
    const prsByRepo = new Map<string, typeof data.prs>();
    
    for (const pr of data.prs) {
      if (!prsByRepo.has(pr.repo)) {
        prsByRepo.set(pr.repo, []);
      }
      prsByRepo.get(pr.repo)!.push(pr);
    }

    for (const [repo, prs] of prsByRepo) {
      lines.push(`### ${repo}`);
      lines.push("");
      for (const pr of prs) {
        const stats = pr.additions || pr.deletions 
          ? ` _(+${pr.additions}/-${pr.deletions})_`
          : "";
        lines.push(`- [${pr.title}](${pr.url})${stats}`);
      }
      lines.push("");
    }
  }

  // Footer - only show manual notes section if no AI summary
  if (!data.aiSummary) {
    lines.push("---");
    lines.push("");
    lines.push("## ✍️ Notes");
    lines.push("");
    lines.push("_Add your own notes and highlights here..._");
    lines.push("");
    lines.push("### Key Accomplishments");
    lines.push("");
    lines.push("- ");
    lines.push("");
    lines.push("### Challenges Overcome");
    lines.push("");
    lines.push("- ");
    lines.push("");
    lines.push("### Areas of Growth");
    lines.push("");
    lines.push("- ");
    lines.push("");
  }

  return lines.join("\n");
}

export function exportToMarkdown(data: ReviewData, filename?: string): string {
  const md = generateMarkdown(data);
  const outputFile = filename || `perf-review-${data.summary.period.replace(/\s+/g, "-").toLowerCase()}.md`;
  
  fs.writeFileSync(outputFile, md, "utf-8");
  
  return outputFile;
}
