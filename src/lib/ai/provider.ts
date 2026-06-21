import { GoogleGenAI } from "@google/genai";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiProvider = "mock" | "openai-compatible" | "gemini";

function getAiConfig() {
  return {
    provider: (process.env.AI_PROVIDER || "mock") as AiProvider,

    // OpenAI-compatible providers: OpenRouter, xAI, OpenAI, etc.
    baseUrl: (process.env.AI_BASE_URL || "").replace(/\/$/, ""),
    apiKey: process.env.AI_API_KEY || "",

    // Gemini direct
    geminiApiKey: process.env.GEMINI_API_KEY || "",

    chatModel: process.env.AI_CHAT_MODEL || "mock-chat",
    embeddingModel: process.env.AI_EMBEDDING_MODEL || "mock-embedding",
    dimensions: Number(process.env.AI_EMBEDDING_DIMENSIONS || "1536"),

    // Optional OpenRouter headers
    siteUrl: process.env.OPENROUTER_SITE_URL || "http://127.0.0.1:3000",
    appName: process.env.OPENROUTER_APP_NAME || "Nura",
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

function validateEmbedding(embedding: unknown): number[] {
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding response did not include a valid vector array");
  }

  if (!embedding.every((value) => typeof value === "number")) {
    throw new Error("Embedding vector contains non-number values");
  }

  return embedding;
}

function validateEmbeddingDimension(vector: number[]) {
  const expected = Number(process.env.AI_EMBEDDING_DIMENSIONS || "1536");

  if (vector.length !== expected) {
    throw new Error(
      `Embedding dimension mismatch. Expected ${expected}, got ${vector.length}. Update AI_EMBEDDING_DIMENSIONS and recreate Qdrant collection.`
    );
  }
}

function openAiCompatibleHeaders(config: ReturnType<typeof getAiConfig>) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  // OpenRouter optional headers
  if (config.baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = config.siteUrl;
    headers["X-Title"] = config.appName;
  }

  return headers;
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  return new GoogleGenAI({ apiKey });
}

export async function createEmbedding(text: string): Promise<number[]> {
  const config = getAiConfig();

  if (config.provider === "mock") {
    const vector = createMockEmbedding(text, config.dimensions);
    validateEmbeddingDimension(vector);
    return vector;
  }

  if (config.provider === "gemini") {
    const ai = getGeminiClient();

    const response = await ai.models.embedContent({
      model: config.embeddingModel,
      contents: text,
    });

    const vector = validateEmbedding(response.embeddings?.[0]?.values);
    validateEmbeddingDimension(vector);
    return vector;
  }

  if (config.provider === "openai-compatible") {
    if (!config.baseUrl) throw new Error("AI_BASE_URL is missing");
    if (!config.apiKey) throw new Error("AI_API_KEY is missing");
    if (!config.embeddingModel) throw new Error("AI_EMBEDDING_MODEL is missing");

    const body: Record<string, unknown> = {
      model: config.embeddingModel,
      input: text,
    };

    // OpenRouter supports dimensions for compatible embedding models.
    if (config.baseUrl.includes("openrouter.ai")) {
      body.dimensions = config.dimensions;
    }

    const res = await fetch(`${config.baseUrl}/embeddings`, {
      method: "POST",
      headers: openAiCompatibleHeaders(config),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Embedding failed: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    const vector = validateEmbedding(data.data?.[0]?.embedding);
    validateEmbeddingDimension(vector);
    return vector;
  }

  throw new Error(`Unsupported AI_PROVIDER: ${config.provider}`);
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

  if (config.provider === "gemini") {
    const ai = getGeminiClient();

    const systemMessage = messages.find((message) => message.role === "system");

    const userMessages = messages
      .filter((message) => message.role !== "system")
      .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
      .join("\n\n");

    const response = await ai.models.generateContent({
      model: config.chatModel,
      contents: `${systemMessage?.content || ""}\n\n${userMessages}`,
    });

    return response.text || "";
  }

  if (config.provider === "openai-compatible") {
    if (!config.baseUrl) throw new Error("AI_BASE_URL is missing");
    if (!config.apiKey) throw new Error("AI_API_KEY is missing");
    if (!config.chatModel) throw new Error("AI_CHAT_MODEL is missing");

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: openAiCompatibleHeaders(config),
      body: JSON.stringify({
        model: config.chatModel,
        messages,
        temperature: 0.2,
         max_tokens: Number(process.env.AI_MAX_TOKENS || "1500"),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Chat completion failed: ${res.status} ${errorText}`);
    }

    const data = await res.json();

    return data.choices?.[0]?.message?.content ?? "";
  }

  throw new Error(`Unsupported AI_PROVIDER: ${config.provider}`);
}
// type ChatMessage = {
//   role: "system" | "user" | "assistant";
//   content: string;
// };

// function getAiConfig() {
//   return {
//     provider: process.env.AI_PROVIDER ,
//     baseUrl: (process.env.AI_BASE_URL || "").replace(/\/$/, ""),
//     apiKey: process.env.AI_API_KEY || "",
//     chatModel: process.env.AI_CHAT_MODEL ,
//     embeddingModel: process.env.AI_EMBEDDING_MODEL || "mock-embedding",
//     dimensions: Number(process.env.AI_EMBEDDING_DIMENSIONS || "1536"),
//   };
// }

// function createMockEmbedding(text: string, dimensions: number) {
//   const vector = new Array(dimensions).fill(0);

//   let hash = 2166136261;

//   for (let i = 0; i < text.length; i++) {
//     hash ^= text.charCodeAt(i);
//     hash = Math.imul(hash, 16777619);
//   }

//   for (let i = 0; i < dimensions; i++) {
//     hash ^= i + 0x9e3779b9;
//     hash = Math.imul(hash, 16777619);

//     const value = ((hash >>> 0) % 2000) / 1000 - 1;
//     vector[i] = Number(value.toFixed(6));
//   }

//   return vector;
// }

// export async function createEmbedding(text: string): Promise<number[]> {
//   const config = getAiConfig();

//   if (config.provider === "mock") {
//     return createMockEmbedding(text, config.dimensions);
//   }

//   if (!config.baseUrl) throw new Error("AI_BASE_URL is missing");
//   if (!config.apiKey) throw new Error("AI_API_KEY is missing");
//   if (!config.embeddingModel) throw new Error("AI_EMBEDDING_MODEL is missing");

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

//   if (config.provider === "mock") {
//     const userMessage = messages.findLast((message) => message.role === "user");
//     const content = userMessage?.content || "";

//     return [
//       "Mock Ask Nura answer:",
//       "",
//       "The knowledge search is working. I found relevant context from your local knowledge base.",
//       "",
//       content.slice(0, 1200),
//     ].join("\n");
//   }

//   if (!config.baseUrl) throw new Error("AI_BASE_URL is missing");
//   if (!config.apiKey) throw new Error("AI_API_KEY is missing");
//   if (!config.chatModel) throw new Error("AI_CHAT_MODEL is missing");

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
// // type ChatMessage = {
// //   role: "system" | "user" | "assistant";
// //   content: string;
// // };

// // function getAiConfig() {
// //   const baseUrl = process.env.AI_BASE_URL;
// //   const apiKey = process.env.AI_API_KEY;
// //   const chatModel = process.env.AI_CHAT_MODEL;
// //   const embeddingModel = process.env.AI_EMBEDDING_MODEL;

// //   if (!baseUrl) throw new Error("AI_BASE_URL is missing");
// //   if (!apiKey) throw new Error("AI_API_KEY is missing");
// //   if (!chatModel) throw new Error("AI_CHAT_MODEL is missing");
// //   if (!embeddingModel) throw new Error("AI_EMBEDDING_MODEL is missing");

// //   return {
// //     baseUrl: baseUrl.replace(/\/$/, ""),
// //     apiKey,
// //     chatModel,
// //     embeddingModel,
// //   };
// // }

// // export async function createEmbedding(text: string): Promise<number[]> {
// //   const config = getAiConfig();

// //   const res = await fetch(`${config.baseUrl}/embeddings`, {
// //     method: "POST",
// //     headers: {
// //       Authorization: `Bearer ${config.apiKey}`,
// //       "Content-Type": "application/json",
// //     },
// //     body: JSON.stringify({
// //       model: config.embeddingModel,
// //       input: text,
// //     }),
// //   });

// //   if (!res.ok) {
// //     const errorText = await res.text();
// //     throw new Error(`Embedding failed: ${res.status} ${errorText}`);
// //   }

// //   const data = await res.json();
// //   const embedding = data.data?.[0]?.embedding;

// //   if (!Array.isArray(embedding)) {
// //     throw new Error("Embedding response did not include data[0].embedding");
// //   }

// //   return embedding;
// // }

// // export async function generateChatAnswer(messages: ChatMessage[]) {
// //   const config = getAiConfig();

// //   const res = await fetch(`${config.baseUrl}/chat/completions`, {
// //     method: "POST",
// //     headers: {
// //       Authorization: `Bearer ${config.apiKey}`,
// //       "Content-Type": "application/json",
// //     },
// //     body: JSON.stringify({
// //       model: config.chatModel,
// //       messages,
// //       temperature: 0.2,
// //     }),
// //   });

// //   if (!res.ok) {
// //     const errorText = await res.text();
// //     throw new Error(`Chat completion failed: ${res.status} ${errorText}`);
// //   }

// //   const data = await res.json();

// //   return data.choices?.[0]?.message?.content ?? "";
// // }