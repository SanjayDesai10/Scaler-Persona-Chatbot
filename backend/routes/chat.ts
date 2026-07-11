import { Router } from "express";
import { ABHIMANYU_PROMPT, ANSHUMAN_PROMPT, KSHITIJ_PROMPT } from "../prompts/index.js";
import { sendMessage } from "../lib/openrouter.js";
import type { ChatMessages, ChatUserMessage } from "@openrouter/sdk/models";

const chatRouter = Router();

let messages = [
  {
    role: "system",
    content: ANSHUMAN_PROMPT,
  },
] as ChatMessages[];

let personas = ["ANSHUMAN", "ABHIMANYU", "KSHITIJ"] as string[];

chatRouter.post("/", async (req, res) => {
  try {
    const userQuery = typeof req.body?.userQuery === "string" ? req.body.userQuery.trim() : "";
    if (!userQuery) {
      return res.status(400).json({ error: "Message required" });
    }
    const newObject = {
      role: "user",
      content: userQuery,
    } as ChatUserMessage;
    messages.push(newObject);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const response = await sendMessage(messages, res);

    messages.push({
      role: "assistant",
      content: response,
    });

    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to process chat", details: (error as Error).message });
  }
});

chatRouter.patch("/", async (req, res) => {
  const { persona } = req.body;
  const key = persona?.toString().toUpperCase();
  if (!key || !personas.includes(key)) {
    return res.status(400).json({
      message: "New persona not correct",
    });
  }
  let prompt = "";
  switch (key) {
    case "ANSHUMAN":
      prompt = ANSHUMAN_PROMPT;
      break;
    case "ABHIMANYU":
      prompt = ABHIMANYU_PROMPT;
      break;
    case "KSHITIJ":
      prompt = KSHITIJ_PROMPT;
      break;
    default:
      return res.status(400).json({
        message: "New persona not correct",
      });
  }
  messages = [{ role: "system", content: prompt }] as ChatMessages[];
  return res.json({
    message: "Persona changed successfully.",
  });
});

export default chatRouter;