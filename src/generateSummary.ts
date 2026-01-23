import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import type { ReviewData } from "./types.js";

export async function generateAISummary(data: ReviewData): Promise<string> {
  console.log("🤖 Generating AI summary...");

  const gatewayKey = process.env.AI_GATEWAY_API_KEY;

  console.log(`   Gateway Key: ${gatewayKey ? gatewayKey.substring(0, 10) + "..." : "(not set)"}`);

  if (!gatewayKey) {
    throw new Error("AI_GATEWAY_API_KEY must be set");
  }

  // Create gateway using the same approach as abuse-evaluator
  const gateway = createGateway({ apiKey: gatewayKey });

  // Build context from tickets and PRs
  const ticketsList = data.tickets
    .map((t) => `- ${t.id}: ${t.title}${t.labels.length ? ` [${t.labels.join(", ")}]` : ""}`)
    .join("\n");

  const prsList = data.prs
    .map((pr) => `- ${pr.repo}: ${pr.title}`)
    .join("\n");

  const prompt = `You are helping an engineer write their performance review. Based on the following completed work, identify key accomplishments, themes, and value delivered.

## Review Period: ${data.summary.period}

## Completed Linear Tickets (${data.summary.ticketsCompleted} total):
${ticketsList || "None"}

## Merged GitHub PRs (${data.summary.prsMerged} total):
${prsList || "None"}

## Instructions:
1. Identify 3-5 major themes or project areas from the work
2. For each theme, write 2-3 bullet points highlighting specific accomplishments
3. Focus on impact and value delivered, not just tasks completed
4. Use action verbs and quantify where possible
5. Write in first person as if you are the engineer

Format your response as:

### Key Themes & Accomplishments

#### [Theme 1 Name]
- Accomplishment bullet point
- Accomplishment bullet point

#### [Theme 2 Name]
- Accomplishment bullet point
- Accomplishment bullet point

(continue for all themes)

### Summary Statement
Write a 2-3 sentence summary of overall impact and contributions.`;

  const { text } = await generateText({
    model: gateway("openai/gpt-4o"),
    prompt,
    maxTokens: 2000,
  });

  console.log("   ✅ AI summary generated");
  return text;
}

export async function generateAISummaryFromMarkdown(markdownContent: string): Promise<string> {
  console.log("🤖 Generating AI summary from existing file...");

  const gatewayKey = process.env.AI_GATEWAY_API_KEY;

  console.log(`   Gateway Key: ${gatewayKey ? gatewayKey.substring(0, 10) + "..." : "(not set)"}`);

  if (!gatewayKey) {
    throw new Error("AI_GATEWAY_API_KEY must be set");
  }

  const gateway = createGateway({ apiKey: gatewayKey });

  const prompt = `You are helping an engineer write their performance review. Based on the following performance review markdown document, identify key accomplishments, themes, and value delivered.

${markdownContent}

## Instructions:
1. Identify 3-5 major themes or project areas from the work
2. For each theme, write 2-3 bullet points highlighting specific accomplishments
3. Focus on impact and value delivered, not just tasks completed
4. Use action verbs and quantify where possible
5. Write in first person as if you are the engineer

Format your response as:

### Key Themes & Accomplishments

#### [Theme 1 Name]
- Accomplishment bullet point
- Accomplishment bullet point

#### [Theme 2 Name]
- Accomplishment bullet point
- Accomplishment bullet point

(continue for all themes)

### Summary Statement
Write a 2-3 sentence summary of overall impact and contributions.`;

  const { text } = await generateText({
    model: gateway("openai/gpt-4o"),
    prompt,
    maxTokens: 2000,
  });

  console.log("   ✅ AI summary generated");
  return text;
}
