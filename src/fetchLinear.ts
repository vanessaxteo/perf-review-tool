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

  // Fetch ticket details in parallel for better performance
  const ticketPromises = issues.nodes.map(async (issue) => {
    const [state, labels] = await Promise.all([
      issue.state,
      issue.labels(),
    ]);

    return {
      id: issue.identifier,
      title: issue.title,
      description: issue.description || undefined,
      completedAt: issue.completedAt || undefined,
      state: state?.name || "Unknown",
      labels: labels.nodes.map((l) => l.name),
      url: issue.url,
    };
  });

  const tickets = await Promise.all(ticketPromises);

  console.log(`   ✅ Found ${tickets.length} completed tickets`);
  return tickets;
}
