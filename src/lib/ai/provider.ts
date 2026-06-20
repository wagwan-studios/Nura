type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getAiConfig() {
  return {
    provider: process.env.AI_PROVIDER ,
    baseUrl: (process.env.AI_BASE_URL || "").replace(/\/$/, ""),
    apiKey: process.env.AI_API_KEY || "",
    chatModel: process.env.AI_CHAT_MODEL ,
    embeddingModel: process.env.AI_EMBEDDING_MODEL || "mock-embedding",
    dimensions: Number(process.env.AI_EMBEDDING_DIMENSIONS || "1536"),
  };
}

function createMockEmbedding(text: string, dimensions: number) {
  const vector = new Array(dimensions).fill(0);

  let hash = 2166136261;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let i = 0; i < dimensions; i++) {
    hash ^= i + 0x9e3779b9;
    hash = Math.imul(hash, 16777619);

    const value = ((hash >>> 0) % 2000) / 1000 - 1;
    vector[i] = Number(value.toFixed(6));
  }

  return vector;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const config = getAiConfig();

  if (config.provider === "mock") {
    return createMockEmbedding(text, config.dimensions);
  }

  if (!config.baseUrl) throw new Error("AI_BASE_URL is missing");
  if (!config.apiKey) throw new Error("AI_API_KEY is missing");
  if (!config.embeddingModel) throw new Error("AI_EMBEDDING_MODEL is missing");

  const res = await fetch(`${config.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.embeddingModel,
      input: text,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Embedding failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const embedding = data.data?.[0]?.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error("Embedding response did not include data[0].embedding");
  }

  return embedding;
}

export async function generateChatAnswer(messages: ChatMessage[]) {
  const config = getAiConfig();

  if (config.provider === "mock") {
    const userMessage = messages.findLast((message) => message.role === "user");
    const content = userMessage?.content || "";

    return [
      "Mock Ask Nura answer:",
      "",
      "The knowledge search is working. I found relevant context from your local knowledge base.",
      "",
      content.slice(0, 1200),
    ].join("\n");
  }

  if (!config.baseUrl) throw new Error("AI_BASE_URL is missing");
  if (!config.apiKey) throw new Error("AI_API_KEY is missing");
  if (!config.chatModel) throw new Error("AI_CHAT_MODEL is missing");

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.chatModel,
      messages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Chat completion failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();

  return data.choices?.[0]?.message?.content ?? "";
}
// type ChatMessage = {
//   role: "system" | "user" | "assistant";
//   content: string;
// };

// function getAiConfig() {
//   const baseUrl = process.env.AI_BASE_URL;
//   const apiKey = process.env.AI_API_KEY;
//   const chatModel = process.env.AI_CHAT_MODEL;
//   const embeddingModel = process.env.AI_EMBEDDING_MODEL;

//   if (!baseUrl) throw new Error("AI_BASE_URL is missing");
//   if (!apiKey) throw new Error("AI_API_KEY is missing");
//   if (!chatModel) throw new Error("AI_CHAT_MODEL is missing");
//   if (!embeddingModel) throw new Error("AI_EMBEDDING_MODEL is missing");

//   return {
//     baseUrl: baseUrl.replace(/\/$/, ""),
//     apiKey,
//     chatModel,
//     embeddingModel,
//   };
// }

// export async function createEmbedding(text: string): Promise<number[]> {
//   const config = getAiConfig();

//   const res = await fetch(`${config.baseUrl}/embeddings`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${config.apiKey}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: config.embeddingModel,
//       input: text,
//     }),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     throw new Error(`Embedding failed: ${res.status} ${errorText}`);
//   }

//   const data = await res.json();
//   const embedding = data.data?.[0]?.embedding;

//   if (!Array.isArray(embedding)) {
//     throw new Error("Embedding response did not include data[0].embedding");
//   }

//   return embedding;
// }

// export async function generateChatAnswer(messages: ChatMessage[]) {
//   const config = getAiConfig();

//   const res = await fetch(`${config.baseUrl}/chat/completions`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${config.apiKey}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: config.chatModel,
//       messages,
//       temperature: 0.2,
//     }),
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     throw new Error(`Chat completion failed: ${res.status} ${errorText}`);
//   }

//   const data = await res.json();

//   return data.choices?.[0]?.message?.content ?? "";
// }