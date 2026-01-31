import { Client } from "@notionhq/client";
import type { ReviewData } from "./types.js";

const NOTION_BLOCK_LIMIT = 100;

// Helper to append blocks in batches of 100
async function appendBlocksInBatches(
  notion: Client,
  blockId: string,
  blocks: any[]
): Promise<void> {
  for (let i = 0; i < blocks.length; i += NOTION_BLOCK_LIMIT) {
    const batch = blocks.slice(i, i + NOTION_BLOCK_LIMIT);
    await notion.blocks.children.append({
      block_id: blockId,
      children: batch,
    });
  }
}

async function findYearBlock(
  notion: Client,
  pageId: string,
  year: string
): Promise<{ id: string; type: "toggle" | "heading" } | null> {
  // Get the blocks on the page
  const { results } = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });

  // First, look for a toggle with the year
  for (const block of results) {
    const b = block as any;
    if (b.type === "toggle" && b.toggle?.rich_text?.[0]?.plain_text?.includes(year)) {
      console.log(`   Found toggle: "${b.toggle.rich_text[0].plain_text}"`);
      return { id: block.id, type: "toggle" };
    }
  }

  // If no toggle, look for a heading with the year
  for (const block of results) {
    const b = block as any;
    const headingTypes = ["heading_1", "heading_2", "heading_3"];
    if (headingTypes.includes(b.type)) {
      const text = b[b.type]?.rich_text?.[0]?.plain_text;
      if (text?.includes(year)) {
        console.log(`   Found heading: "${text}"`);
        return { id: block.id, type: "heading" };
      }
    }
  }

  // Also check for bulleted list items that might be year headers
  for (const block of results) {
    const b = block as any;
    if (b.type === "bulleted_list_item") {
      const text = b.bulleted_list_item?.rich_text?.[0]?.plain_text;
      if (text?.trim() === year) {
        console.log(`   Found bullet: "${text}"`);
        return { id: block.id, type: "toggle" }; // treat as toggle (can have children)
      }
    }
  }

  return null;
}

export async function exportToNotion(
  data: ReviewData,
  notionApiKey: string,
  notionPageId: string
): Promise<string> {
  console.log("📤 Exporting to Notion...");

  const notion = new Client({ auth: notionApiKey });

  // Find the current year's toggle or heading (e.g., "2026")
  const currentYear = new Date().getFullYear().toString();
  const yearBlock = await findYearBlock(notion, notionPageId, currentYear);
  
  // Determine where to add the content
  // - If it's a toggle, add as a child of the toggle
  // - If it's a heading or not found, add to the page directly
  const parentBlockId = yearBlock?.type === "toggle" ? yearBlock.id : notionPageId;

  // Build the toggle children (content inside the toggle)
  const toggleChildren: any[] = [];

  // AI Summary as italicized text
  if (data.aiSummary) {
    const summaryLines = data.aiSummary.split("\n").filter((line) => line.trim());
    for (const line of summaryLines) {
      toggleChildren.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: line }, annotations: { italic: true } }],
        },
      });
    }
  }

  // Linear Tickets section
  if (data.tickets.length > 0) {
    toggleChildren.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "Linear Tickets" }, annotations: { bold: true } }],
      },
    });

    for (const ticket of data.tickets) {
      toggleChildren.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: ticket.id, link: { url: ticket.url } },
            },
            {
              type: "text",
              text: { content: ` ${ticket.title}` },
            },
          ],
        },
      });
    }
  }

  // PRs section - combine merged and open PRs, sorted by creation date
  const allPrs = [
    ...data.prs.map((pr) => ({ ...pr, isOpen: false })),
    ...(data.openPrs || []).map((pr) => ({ ...pr, isOpen: true })),
  ].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  if (allPrs.length > 0) {
    toggleChildren.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "PRs" }, annotations: { bold: true } }],
      },
    });

    for (const pr of allPrs) {
      const stats = pr.additions || pr.deletions ? ` +${pr.additions}/−${pr.deletions}` : "";
      const openIndicator = pr.isOpen ? " (open)" : "";
      toggleChildren.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: `[${pr.repo}] ` },
            },
            {
              type: "text",
              text: { content: pr.title, link: { url: pr.url } },
            },
            {
              type: "text",
              text: { content: `${stats}${openIndicator}` },
            },
          ],
        },
      });
    }
  }

  // Append the toggle to the year toggle (or page if not found)
  // Notion limits toggle children to 100, so we create with first batch and append rest
  const firstBatch = toggleChildren.slice(0, NOTION_BLOCK_LIMIT);
  const remainingBatches = toggleChildren.slice(NOTION_BLOCK_LIMIT);

  const response = await notion.blocks.children.append({
    block_id: parentBlockId,
    children: [
      {
        object: "block" as const,
        type: "toggle" as const,
        toggle: {
          rich_text: [{ type: "text" as const, text: { content: data.summary.period } }],
          children: firstBatch,
        },
      },
    ],
  });

  // If there are more blocks, append them to the toggle we just created
  if (remainingBatches.length > 0) {
    const toggleBlock = (response.results as any[])[0];
    await appendBlocksInBatches(notion, toggleBlock.id, remainingBatches);
  }

  const pageUrl = `https://notion.so/${notionPageId.replace(/-/g, "")}`;
  if (yearBlock?.type === "toggle") {
    console.log(`   ✅ Added toggle inside ${currentYear} section`);
  } else if (yearBlock?.type === "heading") {
    console.log(`   ✅ Added toggle to page (${currentYear} is a heading, not a toggle)`);
  } else {
    console.log(`   ✅ Added toggle to page (no ${currentYear} section found)`);
  }

  return pageUrl;
}

export async function exportPerfReviewToNotion(
  data: ReviewData,
  notionApiKey: string,
  notionPageId: string
): Promise<string> {
  console.log("📤 Exporting performance review to Notion...");

  const notion = new Client({ auth: notionApiKey });

  // Build the page content
  const blocks: any[] = [];

  // Summary callout
  blocks.push({
    object: "block",
    type: "callout",
    callout: {
      rich_text: [
        {
          type: "text",
          text: {
            content: `📊 ${data.summary.ticketsCompleted} tickets · ${data.summary.prsMerged} PRs · +${data.summary.totalAdditions.toLocaleString()}/-${data.summary.totalDeletions.toLocaleString()} lines`,
          },
        },
      ],
      icon: { emoji: "🎯" },
    },
  });

  // AI Summary section - parse markdown into Notion blocks
  if (data.aiSummary) {
    const summaryLines = data.aiSummary.split("\n");
    
    for (const line of summaryLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Parse markdown headers and bullets
      if (trimmed.startsWith("#### ")) {
        // H4 -> Notion heading_3
        blocks.push({
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [{ type: "text", text: { content: trimmed.replace("#### ", "") } }],
          },
        });
      } else if (trimmed.startsWith("### ")) {
        // H3 -> Notion heading_2
        blocks.push({
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: trimmed.replace("### ", "") } }],
          },
        });
      } else if (trimmed.startsWith("- ")) {
        // Bullet point
        blocks.push({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ type: "text", text: { content: trimmed.replace("- ", "") } }],
          },
        });
      } else {
        // Regular paragraph
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: trimmed } }],
          },
        });
      }
    }

    blocks.push({ object: "block", type: "divider", divider: {} });
  }

  // Linear Tickets section
  blocks.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: "Linear Tickets Completed" } }],
    },
  });

  if (data.tickets.length === 0) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "No tickets found for this period." }, annotations: { italic: true } }],
      },
    });
  } else {
    for (const ticket of data.tickets) {
      const labels = ticket.labels.length > 0 ? ` (${ticket.labels.join(", ")})` : "";
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: `${ticket.id}`, link: { url: ticket.url } },
              annotations: { bold: true },
            },
            {
              type: "text",
              text: { content: `: ${ticket.title}${labels}` },
            },
          ],
        },
      });
    }
  }

  blocks.push({ object: "block", type: "divider", divider: {} });

  // PRs section grouped by repo
  blocks.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: "GitHub PRs Merged" } }],
    },
  });

  if (data.prs.length === 0) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "No PRs found for this period." }, annotations: { italic: true } }],
      },
    });
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
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: repo } }],
        },
      });

      for (const pr of prs) {
        const stats = pr.additions || pr.deletions ? ` (+${pr.additions}/-${pr.deletions})` : "";
        blocks.push({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: { content: pr.title, link: { url: pr.url } },
              },
              {
                type: "text",
                text: { content: stats },
                annotations: { color: "gray" },
              },
            ],
          },
        });
      }
    }
  }

  // Create as a subpage - Notion limits to 100 blocks on creation
  const firstBatch = blocks.slice(0, NOTION_BLOCK_LIMIT);
  const remainingBlocks = blocks.slice(NOTION_BLOCK_LIMIT);

  const response = await notion.pages.create({
    parent: { page_id: notionPageId },
    properties: {
      title: {
        title: [{ text: { content: `Performance Review - ${data.summary.period}` } }],
      },
    },
    children: firstBatch,
  });

  // Append remaining blocks in batches
  if (remainingBlocks.length > 0) {
    await appendBlocksInBatches(notion, response.id, remainingBlocks);
  }

  const pageUrl = (response as any).url;
  console.log(`   ✅ Created Notion page (${blocks.length} blocks)`);

  return pageUrl;
}
