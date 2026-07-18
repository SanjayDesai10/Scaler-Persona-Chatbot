import { OpenRouter } from "@openrouter/sdk";
import dotenv from "dotenv";
import type { ChatMessages } from "@openrouter/sdk/models";

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.warn("Warning: OPENROUTER_API_KEY is not defined in the environment.");
}

const client = new OpenRouter({
  apiKey: apiKey || "",
});

export const sendMessage = async (messages: ChatMessages[], res?: any) => {
  const stream = await client.chat.send({
    chatRequest: {
      model: "openai/gpt-oss-20b:free",
      messages,
      stream: true,
      temperature: 0.7,
      maxTokens: 1000,
    },
  });

  let response = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      response += content;
      if (res) {
        res.write(content);
      }
    }
  }
  return response;
};