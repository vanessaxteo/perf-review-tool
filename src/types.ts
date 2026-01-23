export interface Config {
  linearApiKey: string;
  githubToken: string;
  githubUsername: string;
  startDate: Date;
  endDate: Date;
}

export interface LinearTicket {
  id: string;
  title: string;
  description?: string;
  completedAt?: Date;
  state: string;
  labels: string[];
  url: string;
}

export interface GitHubPR {
  title: string;
  url: string;
  repo: string;
  mergedAt?: string;
  body?: string;
  additions: number;
  deletions: number;
}

export interface ReviewData {
  summary: {
    ticketsCompleted: number;
    prsMerged: number;
    period: string;
    totalAdditions: number;
    totalDeletions: number;
  };
  tickets: LinearTicket[];
  prs: GitHubPR[];
  aiSummary?: string;
}
