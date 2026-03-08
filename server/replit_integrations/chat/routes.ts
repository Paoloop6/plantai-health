import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import { chatStorage } from "./storage";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"));
    }
  },
});

// Helper to get user ID from either local session or Google OAuth
function getUserId(req: Request): string | null {
  // Check local auth session first
  if (req.session?.userId) {
    return req.session.userId;
  }
  // Check Google OAuth (Passport)
  const user = req.user as any;
  if (user?.claims?.sub) {
    return user.claims.sub;
  }
  if (user?.id) {
    return user.id;
  }
  return null;
}

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export function registerChatRoutes(app: Express): void {
  // Get all conversations (requires auth)
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const conversations = await chatStorage.getAllConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages (requires auth)
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const conversation = await chatStorage.getConversation(id, userId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation (requires auth)
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const parsed = createConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const conversation = await chatStorage.createConversation(parsed.data.title || "New Chat", userId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation (requires auth)
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      await chatStorage.deleteConversation(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming, requires auth)
  app.post("/api/conversations/:id/messages", chatUpload.single("image"), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      
      const conversation = await chatStorage.getConversation(conversationId, userId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const content = req.body.content;
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }

      let imageDataUrl: string | null = null;
      if (req.file) {
        if (req.file.buffer.length < 100) {
          return res.status(400).json({ error: "Image file is too small or invalid" });
        }
        const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        const mimeType = validMimeTypes.includes(req.file.mimetype) ? req.file.mimetype : "image/jpeg";
        const base64 = req.file.buffer.toString("base64");
        imageDataUrl = `data:${mimeType};base64,${base64}`;
      }

      await chatStorage.createMessage(conversationId, "user", content, imageDataUrl);

      const allMessages = await chatStorage.getMessagesByConversation(conversationId);
      
      const systemMessage = {
        role: "system" as const,
        content: "You are a helpful plant care assistant. You help users with plant identification, care tips, troubleshooting plant problems, and answering questions about gardening and botany. Be friendly, informative, and encouraging. When discussing plant care, provide practical and actionable advice. When a user sends an image, analyze the plant in the image and provide identification, health assessment, and care tips."
      };
      
      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [systemMessage];
      
      const lastMsgIndex = allMessages.length - 1;
      for (let i = 0; i < allMessages.length; i++) {
        const m = allMessages[i];
        if (m.role === "assistant") {
          chatMessages.push({ role: "assistant", content: m.content });
        } else {
          const isLatest = i === lastMsgIndex;
          if (m.imageUrl && isLatest) {
            chatMessages.push({
              role: "user",
              content: [
                { type: "text", text: m.content },
                { type: "image_url", image_url: { url: m.imageUrl } },
              ],
            });
          } else if (m.imageUrl) {
            chatMessages.push({ role: "user", content: `[User sent a plant photo] ${m.content}` });
          } else {
            chatMessages.push({ role: "user", content: m.content });
          }
        }
      }

      const sendStream = async (msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[], sseStarted: boolean) => {
        if (!sseStarted) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("X-Accel-Buffering", "no");
        }

        const stream = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: msgs,
          stream: true,
          max_completion_tokens: 2048,
        });

        let fullResponse = "";
        for await (const chunk of stream) {
          const chunkContent = chunk.choices[0]?.delta?.content || "";
          if (chunkContent) {
            fullResponse += chunkContent;
            res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
          }
        }
        return fullResponse;
      };

      try {
        const fullResponse = await sendStream(chatMessages, false);
        await chatStorage.createMessage(conversationId, "assistant", fullResponse);
      } catch (aiError: any) {
        if (imageDataUrl && aiError?.status === 400) {
          console.warn("OpenAI rejected image data, falling back to text-only:", aiError.message);
          const textOnlyMessages = chatMessages.map(m => {
            if (typeof m.content === "object" && Array.isArray(m.content)) {
              const textParts = m.content.filter((p: any) => p.type === "text");
              return { ...m, content: textParts.length > 0 ? `[Image could not be processed] ${(textParts[0] as any).text}` : "[Image could not be processed]" };
            }
            return m;
          });
          const prefix = "I couldn't analyze the image, but I'll help with your question:\n\n";
          if (!res.headersSent) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no");
          }
          res.write(`data: ${JSON.stringify({ content: prefix })}\n\n`);
          const fallbackResponse = await sendStream(textOnlyMessages as any, true);
          await chatStorage.createMessage(conversationId, "assistant", prefix + fallbackResponse);
        } else {
          throw aiError;
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message", done: true })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}

