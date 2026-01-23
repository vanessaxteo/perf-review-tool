import { LinearClient } from "@linear/sdk";
import type { Config, LinearTicket } from "./types.js";

export async function fetchLinearTickets(config: Config): Promise<LinearTicket[]> {
  const linear = new LinearClient({ apiKey: config.linearApiKey });

  console.log("📥 Fetching Linear tickets...");

  const me = await linear.viewer;

  const issues = await me.assignedIssues({
    filter: {
      completedAt: {
        gte: config.startDate,
        lte: config.endDate,
      },
    },
    first: 250,
  });

  const tickets: LinearTicket[] = [];

  for (const issue of issues.nodes) {
    const state = await issue.state;
    const labels = await issue.labels();

    tickets.push({
      id: issue.identifier,
      title: issue.title,
      description: issue.description || undefined,
      completedAt: issue.completedAt || undefined,
      state: state?.name || "Unknown",
      labels: labels.nodes.map((l) => l.name),
      url: issue.url,
    });
  }

  console.log(`   ✅ Found ${tickets.length} completed tickets`);
  return tickets;
}
