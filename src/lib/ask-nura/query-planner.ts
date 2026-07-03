/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type AskNuraIntent =
  | "GITHUB_REPO_LIST"
  | "GITHUB_REPO_LANGUAGE"
  | "GITHUB_ACTIVITY_SUMMARY"
  | "SLACK_CHANNEL_LIST"
  | "SLACK_RECENT_MESSAGES"
  | "SLACK_PERSON_CHAT_SUMMARY"
  | "GMAIL_RECENT_EMAILS"
  | "GMAIL_SUMMARY"
  | "MULTI_SOURCE_WORK_SUMMARY"
  | "SEMANTIC_SEARCH";

export type AskNuraProvider =
  | "GITHUB"
  | "SLACK"
  | "GMAIL"
  | "NOTION"
  | "GOOGLE_DRIVE"
  | "JIRA"
  | "LINEAR"
  | "CONFLUENCE"
  | "ZOOM"
  | "HUBSPOT";

export type AskNuraQueryPlan = {
  intent: AskNuraIntent;
  providers: AskNuraProvider[];
  recordTypes: string[];
  filters: {
    person?: string | null;
    people?: string[];
    from?: string | null;
    to?: string | null;
    keyword?: string | null;
    repo?: string | null;
    repos?: string[];
    language?: string | null;
    sender?: string | null;
    mentionedPerson?: string | null;
  };
  timeRange: "recent" | "today" | "week" | "month" | "all";
  needsVectorSearch: boolean;
  needsDirectDb: boolean;
  answerStyle: "summary" | "list" | "comparison" | "work_report" | "direct";
  confidence: number;
  rewrittenQuestion: string;
};

export type QueryPlannerUsage = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AskNuraQueryPlanResult = {
  plan: AskNuraQueryPlan;
  usage: QueryPlannerUsage | null;
};

const ALLOWED_PROVIDERS: AskNuraProvider[] = [
  "GITHUB",
  "SLACK",
  "GMAIL",
  "NOTION",
  "GOOGLE_DRIVE",
  "JIRA",
  "LINEAR",
  "CONFLUENCE",
  "ZOOM",
  "HUBSPOT",
];

const DEFAULT_PLAN: AskNuraQueryPlan = {
  intent: "SEMANTIC_SEARCH",
  providers: [],
  recordTypes: [],
  filters: {
    person: null,
    people: [],
    from: null,
    to: null,
    keyword: null,
    repo: null,
    repos:[],
    language: null,
    sender: null,
    mentionedPerson: null,
  },
  timeRange: "recent",
  needsVectorSearch: true,
  needsDirectDb: false,
  answerStyle: "summary",
  confidence: 0.4,
  rewrittenQuestion: "",
};

function safeJsonParse(value: string) {
  const cleaned = value
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in query planner response.");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function normalizePlan(raw: any, question: string): AskNuraQueryPlan {
  const providers = Array.isArray(raw.providers)
    ? raw.providers.filter((provider: string) =>
        ALLOWED_PROVIDERS.includes(provider as AskNuraProvider)
      )
    : [];

  const confidence = Number(raw.confidence);

  return {
    intent: raw.intent || "SEMANTIC_SEARCH",
    providers,
    // recordTypes: Array.isArray(raw.recordTypes) ? raw.recordTypes : [],
    recordTypes: Array.isArray(raw.recordTypes)
  ? normalizeRecordTypes(raw.recordTypes)
  : [],
    filters: {
      person: raw.filters?.person || null,
      people: Array.isArray(raw.filters?.people) ? raw.filters.people : [],
      from: raw.filters?.from || null,
      to: raw.filters?.to || null,
      keyword: raw.filters?.keyword || null,
     repo: Array.isArray(raw.filters?.repo)
  ? raw.filters.repo[0] || null
  : raw.filters?.repo || null,

repos: Array.isArray(raw.filters?.repos)
  ? raw.filters.repos
  : Array.isArray(raw.filters?.repo)
    ? raw.filters.repo
    : raw.filters?.repo
      ? [raw.filters.repo]
      : [],
        language: raw.filters?.language || null,
      sender: raw.filters?.sender || null,
      mentionedPerson: raw.filters?.mentionedPerson || null,
    },
    timeRange: raw.timeRange || "recent",
    needsVectorSearch:
  raw.intent === "MULTI_SOURCE_WORK_SUMMARY"
    ? true
    : Boolean(raw.needsVectorSearch),
    needsDirectDb:
  raw.intent === "MULTI_SOURCE_WORK_SUMMARY"
    ? true
    : Boolean(raw.needsDirectDb),
    answerStyle: raw.answerStyle || "summary",
    confidence: Number.isFinite(confidence)
      ? Math.min(Math.max(confidence, 0), 1)
      : 0.5,
    rewrittenQuestion: raw.rewrittenQuestion || question,
  };
}

function uniqueValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function isBadRepoToken(value: string) {
  const v = value.toLowerCase();

  return [
    "repo",
    "repository",
    "repositories",
    "commit",
    "commits",
    "pull",
    "pulls",
    "request",
    "requests",
    "pr",
    "prs",
    "and",
    "or",
    "what",
    "which",
    "done",
    "by",
    "both",
    "work",
    "has",
    "any",
  ].includes(v);
}

function extractRepoNames(question: string) {
  const repos: string[] = [];

  const patterns = [
    /\bgithub\s+([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?)\s+repo\b/gi,
    /\bgithub\s+([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?)\s+repository\b/gi,
    /\b([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?)\s+repo\b/gi,
    /\b([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?)\s+repository\b/gi,
    /\brepo\s+([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?)/gi,
    /\brepository\s+([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?)/gi,
  ];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(question)) !== null) {
      const value = match[1]?.trim();

      if (value && !isBadRepoToken(value)) {
        repos.push(value);
      }
    }
  }

  return uniqueValues(repos);
}

function extractPeopleNames(question: string) {
  const people: string[] = [];

  const betweenMatch = question.match(
    /\bbetween\s+(.+?)\s+and\s+(.+?)(?:,|\?|$)/i
  );

  if (betweenMatch?.[1]) people.push(betweenMatch[1].trim());
  if (betweenMatch?.[2]) people.push(betweenMatch[2].trim());

  const withMatch = question.match(/\bwith\s+(.+?)(?:\s+chat|,|\?|$)/i);

  if (withMatch?.[1]) people.push(withMatch[1].trim());

  const andMatch = question.match(/\bme\s+and\s+([a-zA-Z\s]+?)(?:\s|,|\?|$)/i);

  if (andMatch?.[1]) {
    people.push("me");
    people.push(andMatch[1].trim());
  }

  return uniqueValues(people);
}

function extractMentionedPerson(question: string) {
  const patterns = [
    /\btasks?\s+(.+?)\s+give\s+to/i,
    /\btasks?\s+(.+?)\s+gave\s+to/i,
    /\bgiven\s+by\s+(.+?)(?:,|\?|$)/i,
    /\bassigned\s+by\s+(.+?)(?:,|\?|$)/i,
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function detectRecordTypes(question: string) {
  const q = question.toLowerCase();
  const recordTypes: string[] = [];

  if (q.includes("slack") || q.includes("message") || q.includes("chat")) {
    recordTypes.push("message");
  }

  if (q.includes("gmail") || q.includes("email") || q.includes("inbox")) {
    recordTypes.push("email");
  }

  if (
    q.includes("github") ||
    q.includes("repo") ||
    q.includes("repository") ||
    q.includes("repositories")
  ) {
    recordTypes.push("repository");
  }

  if (q.includes("commit") || q.includes("commits") || q.includes("work")) {
    recordTypes.push("commit");
  }

  if (
    q.includes("pull request") ||
    q.includes("pull requests") ||
    q.includes(" pr ") ||
    q.includes("prs") ||
    q.includes("work")
  ) {
    recordTypes.push("pull_request");
  }

  return uniqueValues(recordTypes);
}

function extractGithubActors(question: string) {
  const actors = question.match(/\b[a-zA-Z0-9]+-[a-zA-Z0-9]+\b/g) || [];

  return uniqueValues(
    actors.filter((actor) => {
      const lower = actor.toLowerCase();

      return ![
        "front-end",
        "back-end",
        "full-stack",
      ].includes(lower);
    })
  );
}

function normalizeRecordTypes(recordTypes: string[]) {
  const map: Record<string, string> = {
    messages: "message",
    chats: "message",
    chat: "message",
    message: "message",

    emails: "email",
    email: "email",

    repositories: "repository",
    repository: "repository",
    repos: "repository",
    repo: "repository",

    commits: "commit",
    commit: "commit",

    prs: "pull_request",
    pr: "pull_request",
    "pull requests": "pull_request",
    "pull request": "pull_request",
    pull_request: "pull_request",
  };

  return Array.from(
    new Set(
      recordTypes
        .map((type) => map[String(type).toLowerCase()] || type)
        .filter(Boolean)
    )
  );
}

function detectProvidersFromText(question: string): AskNuraProvider[] {
  const q = question.toLowerCase();
  const providers = new Set<AskNuraProvider>();

  if (
    q.includes("github") ||
    q.includes("repo") ||
    q.includes("repository") ||
    q.includes("commit") ||
    q.includes("pull request") ||
    q.includes(" pr ")
  ) {
    providers.add("GITHUB");
  }

  if (
    q.includes("slack") ||
    q.includes("channel") ||
    q.includes("chat") ||
    q.includes("message")
  ) {
    providers.add("SLACK");
  }

  if (
    q.includes("gmail") ||
    q.includes("email") ||
    q.includes("emails") ||
    q.includes("mail") ||
    q.includes("inbox")
  ) {
    providers.add("GMAIL");
  }

  if (q.includes("notion")) providers.add("NOTION");
  if (q.includes("drive") || q.includes("google drive")) providers.add("GOOGLE_DRIVE");
  if (q.includes("jira")) providers.add("JIRA");
  if (q.includes("linear")) providers.add("LINEAR");
  if (q.includes("confluence")) providers.add("CONFLUENCE");
  if (q.includes("zoom")) providers.add("ZOOM");
  if (q.includes("hubspot")) providers.add("HUBSPOT");

  return Array.from(providers);
}

export function ruleBasedQueryPlan(question: string): AskNuraQueryPlan {
  const q = question.toLowerCase();
  const providers = detectProvidersFromText(question);

  const plan: AskNuraQueryPlan = {
    ...DEFAULT_PLAN,
    providers,
    rewrittenQuestion: question,
  };

  if (providers.length > 1) {
  plan.intent = "MULTI_SOURCE_WORK_SUMMARY";
  plan.needsDirectDb = true;
  plan.needsVectorSearch = true;
  plan.answerStyle = "work_report";
  plan.confidence = 0.78;

  const repos = extractRepoNames(question);
  const people = extractPeopleNames(question);
  const githubActors = extractGithubActors(question);
  const mentionedPerson = extractMentionedPerson(question);
  const recordTypes = detectRecordTypes(question);

  plan.filters.repos = repos;
  plan.filters.repo = repos[0] || null;
  plan.filters.people = uniqueValues([...people, ...githubActors]);
  plan.filters.mentionedPerson = mentionedPerson;
  plan.recordTypes = normalizeRecordTypes(recordTypes);

  const aboutMatch = question.match(/\babout\s+(.+?)(?:,|\?|$)/i);

  if (aboutMatch?.[1]) {
    plan.filters.keyword = aboutMatch[1].trim();
  }

  return plan;
}

  if (providers.includes("GMAIL")) {
    plan.intent = "GMAIL_SUMMARY";
    plan.recordTypes = ["email"];
    plan.needsDirectDb = true;
    plan.needsVectorSearch = false;
    plan.confidence = 0.72;

    const fromMatch = question.match(/\bfrom\s+(.+?)(?:\?|$)/i);
    const aboutMatch = question.match(/\babout\s+(.+?)(?:\?|$)/i);
    const mentionMatch = question.match(/\bmentions?\s+(.+?)(?:\?|$)/i);

    if (fromMatch?.[1]) {
      plan.filters.from = fromMatch[1].trim();
      plan.confidence = 0.9;
    }

    if (aboutMatch?.[1]) {
      plan.filters.keyword = aboutMatch[1].trim();
      plan.confidence = 0.88;
    }

    if (mentionMatch?.[1]) {
      plan.filters.keyword = mentionMatch[1].trim();
      plan.confidence = 0.88;
    }

    return plan;
  }

  if (providers.includes("GITHUB")) {
    plan.needsDirectDb = true;
    plan.needsVectorSearch = false;

    if (q.includes("typescript")) {
      plan.intent = "GITHUB_REPO_LANGUAGE";
      plan.recordTypes = ["repository"];
      plan.filters.language = "TypeScript";
      plan.confidence = 0.92;
      return plan;
    }

    if (q.includes("javascript")) {
      plan.intent = "GITHUB_REPO_LANGUAGE";
      plan.recordTypes = ["repository"];
      plan.filters.language = "JavaScript";
      plan.confidence = 0.92;
      return plan;
    }

    if (q.includes("php")) {
      plan.intent = "GITHUB_REPO_LANGUAGE";
      plan.recordTypes = ["repository"];
      plan.filters.language = "PHP";
      plan.confidence = 0.92;
      return plan;
    }

    if (
      q.includes("connected") ||
      q.includes("list") ||
      q.includes("what repositories") ||
      q.includes("which repositories")
    ) {
      plan.intent = "GITHUB_REPO_LIST";
      plan.recordTypes = ["repository"];
      plan.confidence = 0.86;
      return plan;
    }

    if (q.includes("commit") || q.includes("pull request") || q.includes("pr")) {
      plan.intent = "GITHUB_ACTIVITY_SUMMARY";
      plan.recordTypes = ["commit", "pull_request"];
      plan.needsVectorSearch = true;
      plan.confidence = 0.8;
      return plan;
    }
  }

  if (providers.includes("SLACK")) {
    plan.recordTypes = ["message"];
    plan.intent = "SLACK_RECENT_MESSAGES";
    plan.needsDirectDb = true;
    plan.needsVectorSearch = true;
    plan.confidence = 0.72;

    const personMatch = question.match(/\b(?:from|with|of)\s+(.+?)(?:\?|$)/i);
    if (personMatch?.[1]) {
      plan.filters.person = personMatch[1].trim();
      plan.intent = "SLACK_PERSON_CHAT_SUMMARY";
      plan.confidence = 0.82;
    }

    if (
      q.includes("channel") &&
      (q.includes("list") || q.includes("which") || q.includes("indexed"))
    ) {
      plan.intent = "SLACK_CHANNEL_LIST";
      plan.recordTypes = ["channel"];
      plan.needsVectorSearch = false;
      plan.confidence = 0.88;
    }

    return plan;
  }

  return plan;
}

async function callQueryPlannerModel({
  prompt,
  apiKey,
  model,
}: {
  prompt: string;
  apiKey: string;
  model: string;
}) {
  const provider = (process.env.QUERY_AI_PROVIDER || "gemini").toLowerCase();

  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 600,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You are a query planner. Return valid JSON only. Do not include markdown.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        `Groq query planner failed: ${JSON.stringify(data)}`
      );
    }

    return {
  text: data.choices?.[0]?.message?.content || "",
  usage: normalizeOpenAiPlannerUsage(data.usage, provider, model),
};
  }

  if (provider === "openrouter") {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Nura Query Planner",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 600,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You are a query planner. Return valid JSON only. Do not include markdown.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        `OpenRouter query planner failed: ${JSON.stringify(data)}`
      );
    }

    return data.choices?.[0]?.message?.content || "";
  }

  // Default Gemini
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 600,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Gemini query planner failed: ${JSON.stringify(data)}`
    );
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function emptyPlannerUsage(provider: string, model: string): QueryPlannerUsage {
  return {
    provider,
    model,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
}

function normalizeOpenAiPlannerUsage(
  usage: any,
  provider: string,
  model: string
): QueryPlannerUsage {
  const inputTokens = Number(usage?.prompt_tokens || 0);
  const outputTokens = Number(usage?.completion_tokens || 0);
  const totalTokens =
    Number(usage?.total_tokens || 0) || inputTokens + outputTokens;

  return {
    provider,
    model,
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

function normalizeGeminiPlannerUsage(
  usage: any,
  provider: string,
  model: string
): QueryPlannerUsage {
  const inputTokens = Number(usage?.promptTokenCount || 0);
  const outputTokens = Number(usage?.candidatesTokenCount || 0);
  const totalTokens =
    Number(usage?.totalTokenCount || 0) || inputTokens + outputTokens;

  return {
    provider,
    model,
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export async function planAskNuraQueryWithUsage(
  question: string
): Promise<AskNuraQueryPlanResult> {
  const rulePlan = ruleBasedQueryPlan(question);

  if (process.env.QUERY_PLANNER_ENABLED !== "true") {
    return {
  plan: rulePlan,
  usage: null,
};
  }

  if (rulePlan.confidence >= 0.88) {
    return {
  plan: rulePlan,
  usage: null,
};
  }

  const apiKey = process.env.QUERY_AI_API_KEY;
  const model = process.env.QUERY_AI_MODEL || "gemini-2.5-flash-lite";

  if (!apiKey) {
    return {
  plan: rulePlan,
  usage: null,
};
  }

  const prompt = `
You are a query planner for an internal company assistant called Ask Nura.

Your job:
Convert the user's question into a small JSON query plan.
Do not answer the user.
Do not include markdown.
Return JSON only.

Available providers:
- GMAIL: emails
- SLACK: channels, messages, chats
- GITHUB: repositories, commits, pull requests
- NOTION: pages, docs, notes
- GOOGLE_DRIVE: documents, sheets, files
- JIRA: issues, tickets, sprints
- LINEAR: issues, projects, cycles
- CONFLUENCE: docs, pages, knowledge base
- ZOOM: meetings, transcripts
- HUBSPOT: contacts, deals, notes

Intent options:
- GITHUB_REPO_LIST
- GITHUB_REPO_LANGUAGE
- GITHUB_ACTIVITY_SUMMARY
- SLACK_CHANNEL_LIST
- SLACK_RECENT_MESSAGES
- SLACK_PERSON_CHAT_SUMMARY
- GMAIL_RECENT_EMAILS
- GMAIL_SUMMARY
- MULTI_SOURCE_WORK_SUMMARY
- SEMANTIC_SEARCH

Rules:
- If user asks from multiple tools/providers, include all mentioned providers.
- Multi-source is not limited to Slack and GitHub.
- If user asks "from Aizaz" for emails, set filters.from = "Aizaz".
- If user asks "about X" or "mentions X", set filters.keyword = "X".
- If user asks "which repositories use TypeScript", use GITHUB_REPO_LANGUAGE and language TypeScript.
- If user asks about Slack + GitHub + Gmail together, use MULTI_SOURCE_WORK_SUMMARY and include all three providers.
- filters.repo must be a single string or null.
- If multiple repositories are mentioned, put them in filters.repos array.
- Never return filters.repo as an array.
- "me" should stay as "me"; do not guess the user's real name.
- Use direct DB for structured/list/filter questions.
- Use vector search for semantic meaning, chat context, tasks, summaries, and cross-source work reports.

Return JSON in this exact shape:
{
  "intent": "SEMANTIC_SEARCH",
  "providers": [],
  "recordTypes": [],
  "filters": {
    "person": null,
    "people": [],
    "from": null,
    "to": null,
    "keyword": null,
    "repo": null,
    "language": null,
    "sender": null,
    "mentionedPerson": null
  },
  "timeRange": "recent",
  "needsVectorSearch": true,
  "needsDirectDb": false,
  "answerStyle": "summary",
  "confidence": 0.5,
  "rewrittenQuestion": ""
}

User question:
${question}
`;

  try {
 const result = await callQueryPlannerModel({
  prompt,
  apiKey,
  model,
});

if (!result.text) {
  return {
    plan: rulePlan,
    usage: result.usage || emptyPlannerUsage(
      (process.env.QUERY_AI_PROVIDER || "gemini").toLowerCase(),
      model
    ),
  };
}

const parsed = safeJsonParse(result.text);
const modelPlan = normalizePlan(parsed, question);

if (modelPlan.confidence < 0.45) {
  return {
    plan: rulePlan,
    usage: result.usage,
  };
}

return {
  plan: modelPlan,
  usage: result.usage,
};
} catch (error) {
  console.error("Query planner model failed, using rule plan:", {
    provider: process.env.QUERY_AI_PROVIDER,
    model,
    error: error instanceof Error ? error.message : String(error),
  });

 return {
  plan: rulePlan,
  usage: null,
};
}
}

export async function planAskNuraQuery(
  question: string
): Promise<AskNuraQueryPlan> {
  const result = await planAskNuraQueryWithUsage(question);
  return result.plan;
}