import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { identifyPlantFromImage } from "./openai";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { insertPlantSchema, insertWateringHistorySchema, insertPlantNoteSchema, insertTeacherPromptSchema, insertChallengeSchema } from "@shared/schema";
import { addDays } from "date-fns";
import { registerChatRoutes } from "./replit_integrations/chat";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

declare module 'express-session' {
  interface SessionData {
    userId: string;
    role: string;
    user?: {
      id: string;
      username: string;
      displayName: string | null;
      role: string;
    };
  }
}

const upload = multer({ storage: multer.memoryStorage() });

function getUserId(req: Request): string | null {
  let userId = (req.session as any)?.userId;
  if (!userId) {
    const passportUser = (req as any).user;
    if (passportUser?.claims?.sub) {
      userId = passportUser.claims.sub;
    } else if (passportUser?.id) {
      userId = passportUser.id;
    }
  }
  return userId || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const objectStorageService = new ObjectStorageService();

  // Configure PostgreSQL session store for persistent sessions
  const PgSession = connectPgSimple(session);
  
  // Configure session middleware with PostgreSQL store
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "plantcare-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
    },
  }));

  // Setup Replit Auth (Google login) - this sets up its own routes for /api/login, /api/logout, /api/callback
  await setupAuth(app, { skipSessionSetup: true });
  registerAuthRoutes(app);

  // Local Authentication routes (username/password)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, displayName, role, classCode } = req.body;
      
      if (!username || !password || !role) {
        return res.status(400).json({ error: "Username, password, and role are required" });
      }
      
      if (!["teacher", "student"].includes(role)) {
        return res.status(400).json({ error: "Role must be teacher or student" });
      }
      
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        displayName: displayName || username,
        role,
        classCode: classCode || null,
      });
      
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.user = {
        id: user.id,
        username: user.username || "",
        displayName: user.displayName,
        role: user.role,
      };
      
      res.status(201).json({ 
        id: user.id, 
        username: user.username, 
        displayName: user.displayName,
        role: user.role,
        classCode: user.classCode
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.user = {
        id: user.id,
        username: user.username || "",
        displayName: user.displayName,
        role: user.role,
      };
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        displayName: user.displayName,
        role: user.role,
        classCode: user.classCode
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to log in" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: Error | null) => {
      if (err) {
        return res.status(500).json({ error: "Failed to log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    // Check local auth session first
    let userId = req.session?.userId;
    
    // Check Google OAuth (Passport) if no local session
    if (!userId) {
      const passportUser = req.user as any;
      if (passportUser?.claims?.sub) {
        userId = passportUser.claims.sub;
      } else if (passportUser?.id) {
        userId = passportUser.id;
      }
    }
    
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    res.json({ 
      id: user.id, 
      username: user.username, 
      displayName: user.displayName,
      role: user.role,
      classCode: user.classCode,
      authProvider: user.authProvider
    });
  });

  // User stats
  app.get("/api/stats/users", async (req, res) => {
    try {
      const count = await storage.getUserCount();
      const latestUser = await storage.getLatestUser();
      res.json({ count, latestUser });
    } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ error: "Failed to fetch user count" });
    }
  });

  // Recent users
  app.get("/api/stats/users/recent", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const recentUsers = await storage.getRecentUsers(limit);
      res.json({ users: recentUsers });
    } catch (error) {
      console.error("Error fetching recent users:", error);
      res.status(500).json({ error: "Failed to fetch recent users" });
    }
  });

  // Submissions for teacher
  app.get("/api/submissions/:promptId", async (req, res) => {
    try {
      const submissions = await storage.getSubmissionsForPrompt(req.params.promptId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // All submissions for a teacher across all their prompts
  app.get("/api/teacher/all-submissions", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const submissions = await storage.getAllSubmissionsForTeacher(userId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching all teacher submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Student's plants
  app.get("/api/my-plants", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const plants = await storage.getPlantsByStudentId(userId);
      res.json(plants);
    } catch (error) {
      console.error("Error fetching student plants:", error);
      res.status(500).json({ error: "Failed to fetch plants" });
    }
  });

  // Plants identified count - scoped to authenticated user
  app.get("/api/stats/plants", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.json({ count: 0 });
      }
      const plants = await storage.getAllPlants(userId);
      res.json({ count: plants.length });
    } catch (error) {
      console.error("Error fetching plant count:", error);
      res.status(500).json({ error: "Failed to fetch plant count" });
    }
  });

  // Visitor stats
  app.get("/api/stats/visitors", async (req, res) => {
    try {
      const stats = await storage.getVisitorStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching visitor stats:", error);
      res.status(500).json({ error: "Failed to fetch visitor stats" });
    }
  });

  app.post("/api/stats/visitors/increment", async (req, res) => {
    try {
      const stats = await storage.incrementVisitorCount();
      res.json(stats);
    } catch (error) {
      console.error("Error incrementing visitor count:", error);
      res.status(500).json({ error: "Failed to increment visitor count" });
    }
  });

  // Teacher prompts
  app.get("/api/teacher-prompts", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const role = req.session?.role;
      if (role === "teacher") {
        const prompts = await storage.getTeacherPromptsByTeacherId(userId);
        res.json(prompts);
      } else {
        const studentClasses = await storage.getStudentClasses(userId);
        const teacherIds = Array.from(new Set(studentClasses.map(c => c.teacherId)));
        const prompts: any[] = [];
        for (const teacherId of teacherIds) {
          const teacherPromptsList = await storage.getTeacherPromptsByTeacherId(teacherId);
          prompts.push(...teacherPromptsList);
        }
        prompts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json(prompts);
      }
    } catch (error) {
      console.error("Error fetching teacher prompts:", error);
      res.status(500).json({ error: "Failed to fetch teacher prompts" });
    }
  });

  // Share code lookup must be before /:id to prevent "code" being treated as an ID
  app.get("/api/teacher-prompts/code/:shareCode", async (req, res) => {
    try {
      const prompt = await storage.getTeacherPromptByShareCode(req.params.shareCode);
      if (!prompt) {
        return res.status(404).json({ error: "Teacher prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching teacher prompt by code:", error);
      res.status(500).json({ error: "Failed to fetch teacher prompt" });
    }
  });

  app.get("/api/teacher-prompts/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const prompt = await storage.getTeacherPrompt(req.params.id);
      if (!prompt) {
        return res.status(404).json({ error: "Teacher prompt not found" });
      }
      const role = req.session?.role;
      if (role === "teacher") {
        if (prompt.teacherUserId && prompt.teacherUserId !== userId) {
          return res.status(403).json({ error: "You don't have access to this prompt" });
        }
      } else {
        const studentClasses = await storage.getStudentClasses(userId);
        const teacherIds = studentClasses.map(c => c.teacherId);
        if (prompt.teacherUserId && !teacherIds.includes(prompt.teacherUserId)) {
          return res.status(403).json({ error: "You don't have access to this prompt" });
        }
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching teacher prompt:", error);
      res.status(500).json({ error: "Failed to fetch teacher prompt" });
    }
  });

  app.post("/api/teacher-prompts", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId || req.session?.role !== "teacher") {
        return res.status(401).json({ error: "Teacher access required" });
      }
      const validatedData = insertTeacherPromptSchema.parse(req.body);
      const prompt = await storage.createTeacherPrompt({ ...validatedData, teacherUserId: userId });
      res.status(201).json(prompt);
    } catch (error) {
      console.error("Error creating teacher prompt:", error);
      res.status(400).json({ error: "Failed to create teacher prompt" });
    }
  });

  app.delete("/api/teacher-prompts/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const prompt = await storage.getTeacherPrompt(req.params.id);
      if (!prompt) {
        return res.status(404).json({ error: "Teacher prompt not found" });
      }
      if (prompt.teacherUserId && prompt.teacherUserId !== userId) {
        return res.status(403).json({ error: "You can only delete your own prompts" });
      }
      await storage.deleteTeacherPrompt(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting teacher prompt:", error);
      res.status(500).json({ error: "Failed to delete teacher prompt" });
    }
  });

  // Challenges
  app.get("/api/challenges", async (req, res) => {
    try {
      const promptId = req.query.promptId as string | undefined;
      if (promptId) {
        const challenges = await storage.getChallengesForPrompt(promptId);
        res.json(challenges);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ error: "Failed to fetch challenges" });
    }
  });

  app.get("/api/challenges/:id", async (req, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      res.json(challenge);
    } catch (error) {
      console.error("Error fetching challenge:", error);
      res.status(500).json({ error: "Failed to fetch challenge" });
    }
  });

  app.get("/api/challenges/code/:shareCode", async (req, res) => {
    try {
      const challenge = await storage.getChallengeByShareCode(req.params.shareCode);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      res.json(challenge);
    } catch (error) {
      console.error("Error fetching challenge by code:", error);
      res.status(500).json({ error: "Failed to fetch challenge" });
    }
  });

  app.post("/api/challenges", async (req, res) => {
    try {
      const validatedData = insertChallengeSchema.parse(req.body);
      const challenge = await storage.createChallenge(validatedData);
      res.status(201).json(challenge);
    } catch (error) {
      console.error("Error creating challenge:", error);
      res.status(400).json({ error: "Failed to create challenge" });
    }
  });

  app.delete("/api/challenges/:id", async (req, res) => {
    try {
      await storage.deleteChallenge(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting challenge:", error);
      res.status(500).json({ error: "Failed to delete challenge" });
    }
  });

  // Challenge progress
  app.get("/api/challenges/:id/progress", async (req, res) => {
    try {
      const progress = await storage.getChallengeProgress(req.params.id);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching challenge progress:", error);
      res.status(500).json({ error: "Failed to fetch challenge progress" });
    }
  });

  app.post("/api/challenges/:id/progress", async (req, res) => {
    try {
      const progress = await storage.createChallengeProgress({
        challengeId: req.params.id,
        studentName: req.body.studentName,
        completedCount: 0,
        plantIds: [],
      });
      res.status(201).json(progress);
    } catch (error) {
      console.error("Error creating challenge progress:", error);
      res.status(400).json({ error: "Failed to create challenge progress" });
    }
  });

  // Plants - all plant routes require authentication and scope to the logged-in user
  app.get("/api/plants", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const query = req.query.q as string | undefined;
      const wateringStatus = req.query.status as "overdue" | "today" | "upcoming" | "all" | undefined;

      if (query || wateringStatus) {
        const plants = await storage.searchPlants({ query, wateringStatus, userId });
        res.json(plants);
      } else {
        const plants = await storage.getAllPlants(userId);
        res.json(plants);
      }
    } catch (error) {
      console.error("Error fetching plants:", error);
      res.status(500).json({ error: "Failed to fetch plants" });
    }
  });

  // Plant location/map routes - MUST be before /api/plants/:id to avoid "map" being treated as an ID
  app.get("/api/plants/map", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const plantsWithLocation = await storage.getPlantsWithLocation(userId);
      res.json(plantsWithLocation);
    } catch (error) {
      console.error("Error fetching plants with location:", error);
      res.status(500).json({ error: "Failed to fetch plants with location" });
    }
  });

  app.get("/api/plants/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const plant = await storage.getPlant(req.params.id);
      if (!plant) {
        return res.status(404).json({ error: "Plant not found" });
      }
      if (plant.studentId && plant.studentId !== userId) {
        return res.status(403).json({ error: "You don't have access to this plant" });
      }
      res.json(plant);
    } catch (error) {
      console.error("Error fetching plant:", error);
      res.status(500).json({ error: "Failed to fetch plant" });
    }
  });

  app.post("/api/plants", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const validatedData = insertPlantSchema.parse(req.body);
      
      const nextWatering = addDays(new Date(), validatedData.wateringFrequencyDays ?? 7);
      
      const user = await storage.getUser(userId);
      const studentName = req.body.studentName || user?.displayName || user?.username;
      
      const plant = await storage.createPlant({
        ...validatedData,
        nextWatering,
        studentId: userId,
        studentName,
      });
      
      res.status(201).json(plant);
    } catch (error) {
      console.error("Error creating plant:", error);
      res.status(400).json({ error: "Failed to create plant" });
    }
  });

  app.patch("/api/plants/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const existing = await storage.getPlant(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Plant not found" });
      }
      if (existing.studentId && existing.studentId !== userId) {
        return res.status(403).json({ error: "You can only edit your own plants" });
      }

      const updateData: any = {};
      
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.species !== undefined) updateData.species = req.body.species;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.wateringFrequencyDays !== undefined) {
        updateData.wateringFrequencyDays = req.body.wateringFrequencyDays;
        if (existing.lastWatered) {
          updateData.nextWatering = addDays(
            new Date(existing.lastWatered),
            req.body.wateringFrequencyDays
          );
        }
      }
      if (req.body.lightRequirement !== undefined) updateData.lightRequirement = req.body.lightRequirement;
      if (req.body.careInstructions !== undefined) updateData.careInstructions = req.body.careInstructions;

      const plant = await storage.updatePlant(req.params.id, updateData);
      res.json(plant);
    } catch (error) {
      console.error("Error updating plant:", error);
      res.status(400).json({ error: "Failed to update plant" });
    }
  });

  app.delete("/api/plants/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const existing = await storage.getPlant(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Plant not found" });
      }
      if (existing.studentId && existing.studentId !== userId) {
        return res.status(403).json({ error: "You can only delete your own plants" });
      }
      await storage.deletePlant(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plant:", error);
      res.status(500).json({ error: "Failed to delete plant" });
    }
  });

  app.post("/api/plants/:id/water", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const plant = await storage.getPlant(req.params.id);
      if (!plant) {
        return res.status(404).json({ error: "Plant not found" });
      }
      if (plant.studentId && plant.studentId !== userId) {
        return res.status(403).json({ error: "You can only water your own plants" });
      }

      const now = new Date();
      const nextWatering = addDays(now, plant.wateringFrequencyDays);

      await storage.updatePlant(req.params.id, {
        lastWatered: now,
        nextWatering,
      });

      await storage.createWateringHistory({
        plantId: req.params.id,
        notes: req.body.notes || null,
      });

      const updated = await storage.getPlant(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error watering plant:", error);
      res.status(500).json({ error: "Failed to water plant" });
    }
  });

  app.get("/api/plants/:id/watering-history", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const plant = await storage.getPlant(req.params.id);
      if (!plant) {
        return res.status(404).json({ error: "Plant not found" });
      }
      if (plant.studentId && plant.studentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const history = await storage.getWateringHistoryForPlant(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching watering history:", error);
      res.status(500).json({ error: "Failed to fetch watering history" });
    }
  });

  app.get("/api/plants/:id/notes", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const plant = await storage.getPlant(req.params.id);
      if (!plant) {
        return res.status(404).json({ error: "Plant not found" });
      }
      if (plant.studentId && plant.studentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const notes = await storage.getPlantNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching plant notes:", error);
      res.status(500).json({ error: "Failed to fetch plant notes" });
    }
  });

  app.post("/api/plants/:id/notes", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const plant = await storage.getPlant(req.params.id);
      if (!plant) {
        return res.status(404).json({ error: "Plant not found" });
      }
      if (plant.studentId && plant.studentId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const validatedData = insertPlantNoteSchema.parse({
        ...req.body,
        plantId: req.params.id,
      });
      const note = await storage.createPlantNote(validatedData);
      res.json(note);
    } catch (error) {
      console.error("Error creating plant note:", error);
      res.status(400).json({ error: "Failed to create plant note" });
    }
  });

  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required" });
      }
      const note = await storage.updatePlantNote(req.params.id, content);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      console.error("Error updating plant note:", error);
      res.status(500).json({ error: "Failed to update plant note" });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      await storage.deletePlantNote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plant note:", error);
      res.status(500).json({ error: "Failed to delete plant note" });
    }
  });

  // Teacher comment on submission
  app.patch("/api/plants/:id/teacher-comment", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const role = req.session?.role;
      
      if (!userId || role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can add comments" });
      }
      
      const { teacherComment } = req.body;
      if (typeof teacherComment !== "string") {
        return res.status(400).json({ error: "Teacher comment must be a string" });
      }
      
      const existing = await storage.getPlant(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Plant not found" });
      }
      
      const plant = await storage.updatePlant(req.params.id, { 
        teacherComment: teacherComment.trim() || null 
      });
      res.json(plant);
    } catch (error) {
      console.error("Error updating teacher comment:", error);
      res.status(500).json({ error: "Failed to update teacher comment" });
    }
  });

  app.post("/api/identify", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image provided" });
      }

      const teacherCode = req.body.teacherCode as string | undefined;
      const propagationParam = req.body.propagation as string | undefined;
      let teacherInstructions: string | undefined;
      let enablePropagation: boolean | undefined;

      // Enable propagation if passed directly or from teacher prompt
      if (propagationParam === "true") {
        enablePropagation = true;
      }

      if (teacherCode) {
        const prompt = await storage.getTeacherPromptByShareCode(teacherCode);
        if (prompt) {
          teacherInstructions = prompt.customInstructions;
          if (prompt.enablePropagationMode) {
            enablePropagation = true;
          }
        }
      }

      const result = await identifyPlantFromImage(
        req.file.buffer, 
        req.file.mimetype,
        teacherInstructions,
        enablePropagation
      );
      res.json(result);
    } catch (error: any) {
      console.error("Error identifying plant:", error);
      const message = error?.message || "Failed to identify plant";
      if (message.includes("too small") || message.includes("too large") || message.includes("Please upload")) {
        return res.status(400).json({ error: message });
      }
      if (error?.status === 400 || error?.code === "BadRequest") {
        return res.status(400).json({ error: "The image could not be processed. Please try a different photo — make sure it's a clear, well-lit image of a plant." });
      }
      res.status(500).json({ error: "Failed to identify plant. Please try again with a different image." });
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Teacher dashboard stats - comprehensive analytics for classes and assignments
  app.get("/api/teacher/dashboard-stats", async (req, res) => {
    try {
      if (!req.session.userId || req.session.role !== "teacher") {
        return res.status(401).json({ error: "Teacher access required" });
      }
      
      // Get all classes for this teacher
      const classes = await storage.getClassesForTeacher(req.session.userId);
      
      // Get stats for each class
      const classStats = await Promise.all(classes.map(async (classData) => {
        const assignments = await storage.getAssignmentsForClass(classData.id);
        const members = await storage.getClassMembers(classData.id);
        
        // Calculate assignment completion stats
        let totalSubmissions = 0;
        let totalPossible = 0;
        const assignmentStats = await Promise.all(assignments.map(async (assignment) => {
          const submissions = await storage.getSubmissionsForAssignment(assignment.id);
          const completedCount = submissions.filter(s => s.status === "completed" || s.status === "pending").length;
          totalSubmissions += completedCount;
          totalPossible += members.length;
          
          return {
            id: assignment.id,
            title: assignment.title,
            targetCount: assignment.targetCount,
            dueDate: assignment.dueDate,
            submissionCount: completedCount,
            studentCount: members.length,
            completionRate: members.length > 0 ? Math.round((completedCount / members.length) * 100) : 0,
          };
        }));
        
        return {
          id: classData.id,
          name: classData.name,
          joinCode: classData.joinCode,
          studentCount: members.length,
          assignmentCount: assignments.length,
          totalSubmissions,
          completionRate: totalPossible > 0 ? Math.round((totalSubmissions / totalPossible) * 100) : 0,
          assignments: assignmentStats,
        };
      }));
      
      // Calculate overall stats
      const totalStudents = classStats.reduce((acc, c) => acc + c.studentCount, 0);
      const totalAssignments = classStats.reduce((acc, c) => acc + c.assignmentCount, 0);
      const totalSubmissionsAll = classStats.reduce((acc, c) => acc + c.totalSubmissions, 0);
      const avgCompletionRate = classStats.length > 0
        ? Math.round(classStats.reduce((acc, c) => acc + c.completionRate, 0) / classStats.length)
        : 0;
      
      res.json({
        overview: {
          totalClasses: classes.length,
          totalStudents,
          totalAssignments,
          totalSubmissions: totalSubmissionsAll,
          avgCompletionRate,
        },
        classes: classStats,
      });
    } catch (error) {
      console.error("Error fetching teacher dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Classes routes
  app.post("/api/classes", async (req, res) => {
    try {
      if (!req.session.userId || req.session.role !== "teacher") {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Class name is required" });
      }
      const newClass = await storage.createClass({
        teacherId: req.session.userId,
        name,
        description: description || null,
      });
      res.status(201).json(newClass);
    } catch (error) {
      console.error("Error creating class:", error);
      res.status(500).json({ error: "Failed to create class" });
    }
  });

  app.get("/api/classes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (req.session.role === "teacher") {
        const classes = await storage.getClassesForTeacher(req.session.userId);
        res.json(classes);
      } else {
        const classes = await storage.getStudentClasses(req.session.userId);
        res.json(classes);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  app.get("/api/classes/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const classData = await storage.getClass(req.params.id);
      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }
      const isTeacher = classData.teacherId === req.session.userId;
      const isMember = await storage.isClassMember(req.params.id, req.session.userId);
      if (!isTeacher && !isMember) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json(classData);
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ error: "Failed to fetch class" });
    }
  });

  app.get("/api/classes/:id/members", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const classData = await storage.getClass(req.params.id);
      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }
      if (classData.teacherId !== req.session.userId) {
        return res.status(403).json({ error: "Only teachers can view class members" });
      }
      const members = await storage.getClassMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching class members:", error);
      res.status(500).json({ error: "Failed to fetch class members" });
    }
  });

  app.post("/api/classes/join", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { joinCode } = req.body;
      if (!joinCode) {
        return res.status(400).json({ error: "Join code is required" });
      }
      const classData = await storage.getClassByJoinCode(joinCode.toUpperCase());
      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }
      const membership = await storage.joinClass({
        classId: classData.id,
        studentId: req.session.userId,
      });
      res.status(201).json({ class: classData, membership });
    } catch (error) {
      console.error("Error joining class:", error);
      res.status(500).json({ error: "Failed to join class" });
    }
  });

  app.delete("/api/classes/:id", async (req, res) => {
    try {
      if (!req.session.userId || req.session.role !== "teacher") {
        return res.status(401).json({ error: "Unauthorized" });
      }
      await storage.deleteClass(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ error: "Failed to delete class" });
    }
  });

  // Assignments routes
  app.post("/api/classes/:classId/assignments", async (req, res) => {
    try {
      if (!req.session.userId || req.session.role !== "teacher") {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { title, description, instructions, targetCount, minConfidence, plantCategory, dueDate } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Assignment title is required" });
      }
      const assignment = await storage.createAssignment({
        classId: req.params.classId,
        title,
        description: description || null,
        instructions: instructions || null,
        targetCount: targetCount || 1,
        minConfidence: minConfidence || 70,
        plantCategory: plantCategory || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  app.get("/api/classes/:classId/assignments", async (req, res) => {
    try {
      // User must be authenticated to view assignments
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const classId = req.params.classId;
      const classData = await storage.getClass(classId);
      
      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }
      
      // Check if user is the teacher of this class or a member
      const isTeacher = classData.teacherId === req.session.userId;
      const isMember = await storage.isClassMember(classId, req.session.userId);
      
      if (!isTeacher && !isMember) {
        return res.status(403).json({ error: "You are not a member of this class" });
      }
      
      const assignments = await storage.getAssignmentsForClass(classId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  app.get("/api/assignments/:id", async (req, res) => {
    try {
      // User must be authenticated to view assignment details
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      // Check if user is the teacher of this class or a member
      const classData = await storage.getClass(assignment.classId);
      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }
      
      const isTeacher = classData.teacherId === req.session.userId;
      const isMember = await storage.isClassMember(assignment.classId, req.session.userId);
      
      if (!isTeacher && !isMember) {
        return res.status(403).json({ error: "You are not a member of this class" });
      }
      
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ error: "Failed to fetch assignment" });
    }
  });

  app.get("/api/assignments/:id/submissions", async (req, res) => {
    try {
      // Only authenticated teachers can view all submissions
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      const classData = await storage.getClass(assignment.classId);
      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }
      
      // Only teachers of this class can view all submissions
      const isTeacher = classData.teacherId === req.session.userId;
      
      if (!isTeacher) {
        // Students can only see their own submissions
        const submissions = await storage.getStudentSubmissionsForAssignment(req.params.id, req.session.userId);
        return res.json(submissions);
      }
      
      const submissions = await storage.getSubmissionsForAssignment(req.params.id);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.post("/api/assignments/:id/submit", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { plantId } = req.body;
      const submission = await storage.createAssignmentSubmission({
        assignmentId: req.params.id,
        studentId: req.session.userId,
        plantId: plantId || null,
        status: "pending",
        grade: null,
        teacherFeedback: null,
      });
      res.status(201).json(submission);
    } catch (error) {
      console.error("Error submitting assignment:", error);
      res.status(500).json({ error: "Failed to submit assignment" });
    }
  });

  app.patch("/api/submissions/:id/grade", async (req, res) => {
    try {
      if (!req.session.userId || req.session.role !== "teacher") {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { grade, feedback } = req.body;
      const submission = await storage.gradeSubmission(req.params.id, grade, feedback || "");
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      res.json(submission);
    } catch (error) {
      console.error("Error grading submission:", error);
      res.status(500).json({ error: "Failed to grade submission" });
    }
  });

  app.delete("/api/assignments/:id", async (req, res) => {
    try {
      if (!req.session.userId || req.session.role !== "teacher") {
        return res.status(401).json({ error: "Unauthorized" });
      }
      await storage.deleteAssignment(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // Forum routes
  app.get("/api/forum/posts", async (req, res) => {
    try {
      const { category, lat, lng, radius } = req.query;
      if (lat && lng && radius) {
        const posts = await storage.getForumPostsByLocation(
          parseFloat(lat as string),
          parseFloat(lng as string),
          parseFloat(radius as string)
        );
        res.json(posts);
      } else {
        const posts = await storage.getAllForumPosts(category as string | undefined);
        res.json(posts);
      }
    } catch (error) {
      console.error("Error fetching forum posts:", error);
      res.status(500).json({ error: "Failed to fetch forum posts" });
    }
  });

  app.post("/api/forum/posts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { title, content, plantId, latitude, longitude, locationLabel, category } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }
      const post = await storage.createForumPost({
        authorId: req.session.userId,
        title,
        content,
        plantId: plantId || null,
        latitude: latitude || null,
        longitude: longitude || null,
        locationLabel: locationLabel || null,
        category: category || null,
      });
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating forum post:", error);
      res.status(500).json({ error: "Failed to create forum post" });
    }
  });

  app.get("/api/forum/posts/:id", async (req, res) => {
    try {
      const post = await storage.getForumPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching forum post:", error);
      res.status(500).json({ error: "Failed to fetch forum post" });
    }
  });

  app.get("/api/forum/posts/:id/replies", async (req, res) => {
    try {
      const replies = await storage.getRepliesForPost(req.params.id);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching replies:", error);
      res.status(500).json({ error: "Failed to fetch replies" });
    }
  });

  app.post("/api/forum/posts/:id/replies", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }
      const reply = await storage.createForumReply({
        postId: req.params.id,
        authorId: req.session.userId,
        content,
      });
      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ error: "Failed to create reply" });
    }
  });

  app.delete("/api/forum/posts/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const post = await storage.getForumPost(req.params.id);
      if (!post || post.authorId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to delete this post" });
      }
      await storage.deleteForumPost(req.params.id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting forum post:", error);
      res.status(500).json({ error: "Failed to delete forum post" });
    }
  });

  // Register AI Chat routes
  registerChatRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
