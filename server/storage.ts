import {
  type User,
  type InsertUser,
  type Plant,
  type InsertPlant,
  type WateringHistory,
  type InsertWateringHistory,
  type PlantImage,
  type InsertPlantImage,
  type PlantNote,
  type InsertPlantNote,
  type TeacherPrompt,
  type InsertTeacherPrompt,
  type Challenge,
  type InsertChallenge,
  type ChallengeProgress,
  type InsertChallengeProgress,
  type VisitorStats,
  type Class,
  type InsertClass,
  type ClassMembership,
  type InsertClassMembership,
  type Assignment,
  type InsertAssignment,
  type AssignmentSubmission,
  type InsertAssignmentSubmission,
  type ForumPost,
  type InsertForumPost,
  type ForumReply,
  type InsertForumReply,
  users,
  plants,
  wateringHistory,
  plantImages,
  plantNotes,
  teacherPrompts,
  challenges,
  challengeProgress,
  visitorStats,
  classes,
  classMemberships,
  assignments,
  assignmentSubmissions,
  forumPosts,
  forumReplies,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, or, and, lte, gte, ilike, sql } from "drizzle-orm";

function generateShareCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserCount(): Promise<number>;
  getLatestUser(): Promise<{ username: string; displayName: string | null } | null>;
  getRecentUsers(limit?: number): Promise<Array<{ username: string; displayName: string | null; role: string; createdAt: Date | null }>>;
  getTeacherPromptsForUser(userId: string): Promise<TeacherPrompt[]>;
  getSubmissionsForPrompt(promptId: string): Promise<Plant[]>;
  getAllSubmissionsForTeacher(userId: string): Promise<Plant[]>;

  getAllPlants(userId?: string): Promise<Plant[]>;
  getPlantsByStudentId(studentId: string): Promise<Plant[]>;
  searchPlants(params: {
    query?: string;
    wateringStatus?: "overdue" | "today" | "upcoming" | "all";
    userId?: string;
  }): Promise<Plant[]>;
  getPlant(id: string): Promise<Plant | undefined>;
  getPlantsWithLocation(userId?: string): Promise<Plant[]>;
  getTeacherPromptsByTeacherId(teacherId: string): Promise<TeacherPrompt[]>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: string, plant: Partial<InsertPlant>): Promise<Plant | undefined>;
  deletePlant(id: string): Promise<void>;

  getWateringHistoryForPlant(plantId: string): Promise<WateringHistory[]>;
  createWateringHistory(history: InsertWateringHistory): Promise<WateringHistory>;

  getPlantImages(plantId: string): Promise<PlantImage[]>;
  createPlantImage(image: InsertPlantImage): Promise<PlantImage>;

  getPlantNotes(plantId: string): Promise<PlantNote[]>;
  createPlantNote(note: InsertPlantNote): Promise<PlantNote>;
  updatePlantNote(id: string, content: string): Promise<PlantNote | undefined>;
  deletePlantNote(id: string): Promise<void>;

  getVisitorStats(): Promise<VisitorStats>;
  incrementVisitorCount(): Promise<VisitorStats>;

  createTeacherPrompt(prompt: InsertTeacherPrompt): Promise<TeacherPrompt>;
  getTeacherPrompt(id: string): Promise<TeacherPrompt | undefined>;
  getTeacherPromptByShareCode(shareCode: string): Promise<TeacherPrompt | undefined>;
  getAllTeacherPrompts(): Promise<TeacherPrompt[]>;
  deleteTeacherPrompt(id: string): Promise<void>;

  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  getChallenge(id: string): Promise<Challenge | undefined>;
  getChallengeByShareCode(shareCode: string): Promise<Challenge | undefined>;
  getChallengesForPrompt(promptId: string): Promise<Challenge[]>;
  deleteChallenge(id: string): Promise<void>;

  getChallengeProgress(challengeId: string): Promise<ChallengeProgress[]>;
  createChallengeProgress(progress: InsertChallengeProgress): Promise<ChallengeProgress>;
  updateChallengeProgress(id: string, completedCount: number, plantIds: string[]): Promise<ChallengeProgress | undefined>;

  createClass(classData: InsertClass): Promise<Class>;
  getClass(id: string): Promise<Class | undefined>;
  getClassByJoinCode(joinCode: string): Promise<Class | undefined>;
  getClassesForTeacher(teacherId: string): Promise<Class[]>;
  deleteClass(id: string): Promise<void>;

  joinClass(membership: InsertClassMembership): Promise<ClassMembership>;
  getClassMembers(classId: string): Promise<Array<{ id: string; username: string; displayName: string | null; joinedAt: Date }>>;
  isClassMember(classId: string, studentId: string): Promise<boolean>;
  getStudentClasses(studentId: string): Promise<Class[]>;
  leaveClass(classId: string, studentId: string): Promise<void>;

  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignment(id: string): Promise<Assignment | undefined>;
  getAssignmentsForClass(classId: string): Promise<Assignment[]>;
  deleteAssignment(id: string): Promise<void>;

  createAssignmentSubmission(submission: InsertAssignmentSubmission): Promise<AssignmentSubmission>;
  getSubmissionsForAssignment(assignmentId: string): Promise<AssignmentSubmission[]>;
  getStudentSubmissionsForAssignment(assignmentId: string, studentId: string): Promise<AssignmentSubmission[]>;
  gradeSubmission(id: string, grade: number, feedback: string): Promise<AssignmentSubmission | undefined>;

  createForumPost(post: InsertForumPost): Promise<ForumPost>;
  getForumPost(id: string): Promise<ForumPost | undefined>;
  getAllForumPosts(category?: string): Promise<ForumPost[]>;
  getForumPostsByLocation(lat: number, lng: number, radiusKm: number): Promise<ForumPost[]>;
  deleteForumPost(id: string): Promise<void>;

  createForumReply(reply: InsertForumReply): Promise<ForumReply>;
  getRepliesForPost(postId: string): Promise<ForumReply[]>;
  deleteForumReply(id: string): Promise<void>;
}

async function neonRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn();
    return result;
  } catch (e: any) {
    if (e?.message?.includes("Cannot read properties of null")) {
      await new Promise(r => setTimeout(r, 200));
      return fn();
    }
    throw e;
  }
}

export class DatabaseStorage implements IStorage {
  private db;
  private sql;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    this.sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(this.sql, { logger: false });
  }

  private mapUserRow(row: any): User {
    if (!row) return row;
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      displayName: row.display_name ?? row.displayName ?? null,
      role: row.role,
      classCode: row.class_code ?? row.classCode ?? null,
      email: row.email ?? null,
      firstName: row.first_name ?? row.firstName ?? null,
      lastName: row.last_name ?? row.lastName ?? null,
      profileImageUrl: row.profile_image_url ?? row.profileImageUrl ?? null,
      authProvider: row.auth_provider ?? row.authProvider ?? 'local',
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    return neonRetry(async () => {
      const rows = await this.sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
      const row = (rows as any[])[0];
      return row ? this.mapUserRow(row) : undefined;
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    let rows: any;
    try {
      rows = await this.sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
    } catch (e: any) {
      if (e?.message?.includes("Cannot read properties of null")) {
        rows = [];
      } else {
        throw e;
      }
    }
    if (!Array.isArray(rows) || rows.length === 0) return undefined;
    return this.mapUserRow(rows[0]);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      await this.db.insert(users).values(insertUser);
    } catch (e: any) {
      if (!e?.message?.includes("Cannot read properties of null") && !e?.message?.includes("duplicate key")) {
        throw e;
      }
      if (e?.message?.includes("duplicate key")) throw e;
    }
    const created = await this.getUserByUsername(insertUser.username!);
    if (created) return created;
    throw new Error("Failed to create user — could not read back after insert");
  }

  async getUserCount(): Promise<number> {
    const result = await this.db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result[0].count) || 0;
  }

  async getLatestUser(): Promise<{ username: string; displayName: string | null } | null> {
    const result = await this.db
      .select({ username: users.username, displayName: users.displayName })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(1);
    return result[0] || null;
  }

  async getRecentUsers(limit: number = 10): Promise<Array<{ username: string; displayName: string | null; role: string; createdAt: Date | null }>> {
    const result = await this.db
      .select({ 
        username: users.username, 
        displayName: users.displayName,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);
    return result;
  }

  async getTeacherPromptsForUser(userId: string): Promise<TeacherPrompt[]> {
    return await this.db
      .select()
      .from(teacherPrompts)
      .where(eq(teacherPrompts.teacherUserId, userId))
      .orderBy(desc(teacherPrompts.createdAt));
  }

  async getSubmissionsForPrompt(promptId: string): Promise<Plant[]> {
    return await this.db
      .select()
      .from(plants)
      .where(eq(plants.teacherPromptId, promptId))
      .orderBy(desc(plants.createdAt));
  }

  async getAllSubmissionsForTeacher(userId: string): Promise<Plant[]> {
    const teacherPromptsResult = await this.db
      .select()
      .from(teacherPrompts)
      .where(eq(teacherPrompts.teacherUserId, userId));
    
    if (teacherPromptsResult.length === 0) {
      return [];
    }

    const promptIds = teacherPromptsResult.map(p => p.id);
    
    const result = await this.db
      .select()
      .from(plants)
      .where(sql`${plants.teacherPromptId} = ANY(${promptIds})`)
      .orderBy(desc(plants.createdAt));
    
    return result;
  }

  async getAllPlants(userId?: string): Promise<Plant[]> {
    let rawRows: any;
    try {
      rawRows = userId
        ? await this.sql`SELECT * FROM plants WHERE student_id = ${userId} ORDER BY created_at DESC`
        : await this.sql`SELECT * FROM plants ORDER BY created_at DESC`;
    } catch (e: any) {
      if (e?.message?.includes("Cannot read properties of null")) {
        rawRows = [];
      } else throw e;
    }
    const rows: any[] = Array.isArray(rawRows) ? rawRows : [];
    return (rows as any[]).map(r => ({
      id: r.id,
      name: r.name,
      species: r.species,
      commonName: r.common_name ?? r.commonName ?? null,
      studentId: r.student_id ?? r.studentId ?? null,
      imageUrl: r.image_url ?? r.imageUrl ?? null,
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
      locationName: r.location_name ?? r.locationName ?? null,
      wateringFrequencyDays: r.watering_frequency_days ?? r.wateringFrequencyDays ?? null,
      lastWatered: r.last_watered ?? r.lastWatered ?? null,
      lightRequirement: r.light_requirement ?? r.lightRequirement ?? null,
      careInstructions: r.care_instructions ?? r.careInstructions ?? null,
      propagationInfo: r.propagation_info ?? r.propagationInfo ?? null,
      educationalContent: r.educational_content ?? r.educationalContent ?? null,
      description: r.description ?? null,
      genus: r.genus ?? null,
      family: r.family ?? null,
      kingdom: r.kingdom ?? null,
      phylum: r.phylum ?? null,
      plantClass: r.plant_class ?? r.plantClass ?? null,
      order: r.order ?? null,
      confidence: r.confidence ?? null,
      photoQuality: r.photo_quality ?? r.photoQuality ?? null,
      identificationLevel: r.identification_level ?? r.identificationLevel ?? null,
      teacherPromptId: r.teacher_prompt_id ?? r.teacherPromptId ?? null,
      notes: r.notes ?? null,
      createdAt: r.created_at ?? r.createdAt ?? null,
    }));
  }

  async getPlantsByStudentId(studentId: string): Promise<Plant[]> {
    return await this.db
      .select()
      .from(plants)
      .where(eq(plants.studentId, studentId))
      .orderBy(desc(plants.createdAt));
  }

  async searchPlants(params: {
    query?: string;
    wateringStatus?: "overdue" | "today" | "upcoming" | "all";
    userId?: string;
  }): Promise<Plant[]> {
    const conditions = [];

    if (params.userId) {
      conditions.push(eq(plants.studentId, params.userId));
    }

    if (params.query) {
      const searchPattern = `%${params.query}%`;
      conditions.push(
        or(
          ilike(plants.name, searchPattern),
          ilike(plants.species, searchPattern),
          ilike(plants.description, searchPattern)
        )
      );
    }

    if (params.wateringStatus && params.wateringStatus !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (params.wateringStatus === "overdue") {
        conditions.push(lte(plants.nextWatering, today));
      } else if (params.wateringStatus === "today") {
        conditions.push(
          and(
            gte(plants.nextWatering, today),
            lte(plants.nextWatering, tomorrow)
          )
        );
      } else if (params.wateringStatus === "upcoming") {
        conditions.push(gte(plants.nextWatering, tomorrow));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(plants)
      .where(whereClause)
      .orderBy(desc(plants.createdAt));
  }

  async getPlant(id: string): Promise<Plant | undefined> {
    const result = await this.db.select().from(plants).where(eq(plants.id, id));
    return result[0];
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const result = await this.db.insert(plants).values(insertPlant).returning();
    return result[0];
  }

  async updatePlant(
    id: string,
    plantUpdate: Partial<InsertPlant>
  ): Promise<Plant | undefined> {
    const result = await this.db
      .update(plants)
      .set(plantUpdate)
      .where(eq(plants.id, id))
      .returning();
    return result[0];
  }

  async deletePlant(id: string): Promise<void> {
    await this.db.delete(wateringHistory).where(eq(wateringHistory.plantId, id));
    await this.db.delete(plantImages).where(eq(plantImages.plantId, id));
    await this.db.delete(plantNotes).where(eq(plantNotes.plantId, id));
    await this.db.delete(plants).where(eq(plants.id, id));
  }

  async getWateringHistoryForPlant(
    plantId: string
  ): Promise<WateringHistory[]> {
    return await this.db
      .select()
      .from(wateringHistory)
      .where(eq(wateringHistory.plantId, plantId))
      .orderBy(desc(wateringHistory.wateredAt));
  }

  async createWateringHistory(
    insertHistory: InsertWateringHistory
  ): Promise<WateringHistory> {
    const result = await this.db
      .insert(wateringHistory)
      .values(insertHistory)
      .returning();
    return result[0];
  }

  async getPlantImages(plantId: string): Promise<PlantImage[]> {
    return await this.db
      .select()
      .from(plantImages)
      .where(eq(plantImages.plantId, plantId))
      .orderBy(desc(plantImages.uploadedAt));
  }

  async createPlantImage(insertImage: InsertPlantImage): Promise<PlantImage> {
    const result = await this.db
      .insert(plantImages)
      .values(insertImage)
      .returning();
    return result[0];
  }

  async getPlantNotes(plantId: string): Promise<PlantNote[]> {
    return await this.db
      .select()
      .from(plantNotes)
      .where(eq(plantNotes.plantId, plantId))
      .orderBy(desc(plantNotes.createdAt));
  }

  async createPlantNote(insertNote: InsertPlantNote): Promise<PlantNote> {
    const result = await this.db
      .insert(plantNotes)
      .values(insertNote)
      .returning();
    return result[0];
  }

  async updatePlantNote(id: string, content: string): Promise<PlantNote | undefined> {
    const result = await this.db
      .update(plantNotes)
      .set({ content })
      .where(eq(plantNotes.id, id))
      .returning();
    return result[0];
  }

  async deletePlantNote(id: string): Promise<void> {
    await this.db.delete(plantNotes).where(eq(plantNotes.id, id));
  }

  async getVisitorStats(): Promise<VisitorStats> {
    const result = await this.db.select().from(visitorStats).limit(1);
    if (result.length === 0) {
      const newStats = await this.db.insert(visitorStats).values({
        totalVisits: 0,
      }).returning();
      return newStats[0];
    }
    return result[0];
  }

  async incrementVisitorCount(): Promise<VisitorStats> {
    const stats = await this.getVisitorStats();
    const result = await this.db
      .update(visitorStats)
      .set({ 
        totalVisits: stats.totalVisits + 1,
        lastUpdated: new Date()
      })
      .where(eq(visitorStats.id, stats.id))
      .returning();
    return result[0];
  }

  async createTeacherPrompt(prompt: InsertTeacherPrompt): Promise<TeacherPrompt> {
    const shareCode = generateShareCode();
    const result = await this.db
      .insert(teacherPrompts)
      .values({ ...prompt, shareCode })
      .returning();
    return result[0];
  }

  async getTeacherPrompt(id: string): Promise<TeacherPrompt | undefined> {
    const result = await this.db
      .select()
      .from(teacherPrompts)
      .where(eq(teacherPrompts.id, id));
    return result[0];
  }

  async getTeacherPromptByShareCode(shareCode: string): Promise<TeacherPrompt | undefined> {
    const result = await this.db
      .select()
      .from(teacherPrompts)
      .where(eq(teacherPrompts.shareCode, shareCode));
    return result[0];
  }

  async getAllTeacherPrompts(): Promise<TeacherPrompt[]> {
    return await this.db
      .select()
      .from(teacherPrompts)
      .orderBy(desc(teacherPrompts.createdAt));
  }

  async deleteTeacherPrompt(id: string): Promise<void> {
    await this.db.delete(challenges).where(eq(challenges.teacherPromptId, id));
    await this.db.delete(teacherPrompts).where(eq(teacherPrompts.id, id));
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const shareCode = generateShareCode();
    const result = await this.db
      .insert(challenges)
      .values({ ...challenge, shareCode })
      .returning();
    return result[0];
  }

  async getChallenge(id: string): Promise<Challenge | undefined> {
    const result = await this.db
      .select()
      .from(challenges)
      .where(eq(challenges.id, id));
    return result[0];
  }

  async getChallengeByShareCode(shareCode: string): Promise<Challenge | undefined> {
    const result = await this.db
      .select()
      .from(challenges)
      .where(eq(challenges.shareCode, shareCode));
    return result[0];
  }

  async getChallengesForPrompt(promptId: string): Promise<Challenge[]> {
    return await this.db
      .select()
      .from(challenges)
      .where(eq(challenges.teacherPromptId, promptId))
      .orderBy(desc(challenges.createdAt));
  }

  async deleteChallenge(id: string): Promise<void> {
    await this.db.delete(challengeProgress).where(eq(challengeProgress.challengeId, id));
    await this.db.delete(challenges).where(eq(challenges.id, id));
  }

  async getChallengeProgress(challengeId: string): Promise<ChallengeProgress[]> {
    return await this.db
      .select()
      .from(challengeProgress)
      .where(eq(challengeProgress.challengeId, challengeId))
      .orderBy(desc(challengeProgress.createdAt));
  }

  async createChallengeProgress(progress: InsertChallengeProgress): Promise<ChallengeProgress> {
    const result = await this.db
      .insert(challengeProgress)
      .values(progress)
      .returning();
    return result[0];
  }

  async updateChallengeProgress(
    id: string, 
    completedCount: number, 
    plantIds: string[]
  ): Promise<ChallengeProgress | undefined> {
    const result = await this.db
      .update(challengeProgress)
      .set({ completedCount, plantIds })
      .where(eq(challengeProgress.id, id))
      .returning();
    return result[0];
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const joinCode = generateShareCode();
    const result = await this.db
      .insert(classes)
      .values({ ...classData, joinCode })
      .returning();
    return result[0];
  }

  async getClass(id: string): Promise<Class | undefined> {
    const result = await this.db.select().from(classes).where(eq(classes.id, id));
    return result[0];
  }

  async getClassByJoinCode(joinCode: string): Promise<Class | undefined> {
    const result = await this.db
      .select()
      .from(classes)
      .where(eq(classes.joinCode, joinCode));
    return result[0];
  }

  async getClassesForTeacher(teacherId: string): Promise<Class[]> {
    return await this.db
      .select()
      .from(classes)
      .where(eq(classes.teacherId, teacherId))
      .orderBy(desc(classes.createdAt));
  }

  async deleteClass(id: string): Promise<void> {
    await this.db.delete(assignmentSubmissions).where(
      sql`${assignmentSubmissions.assignmentId} IN (SELECT id FROM assignments WHERE class_id = ${id})`
    );
    await this.db.delete(assignments).where(eq(assignments.classId, id));
    await this.db.delete(classMemberships).where(eq(classMemberships.classId, id));
    await this.db.delete(classes).where(eq(classes.id, id));
  }

  async joinClass(membership: InsertClassMembership): Promise<ClassMembership> {
    const result = await this.db
      .insert(classMemberships)
      .values(membership)
      .returning();
    return result[0];
  }

  async getClassMembers(classId: string): Promise<Array<{ id: string; username: string; displayName: string | null; joinedAt: Date }>> {
    const result = await this.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        joinedAt: classMemberships.joinedAt,
      })
      .from(classMemberships)
      .innerJoin(users, eq(classMemberships.studentId, users.id))
      .where(eq(classMemberships.classId, classId))
      .orderBy(desc(classMemberships.joinedAt));
    return result;
  }

  async isClassMember(classId: string, studentId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: classMemberships.id })
      .from(classMemberships)
      .where(and(eq(classMemberships.classId, classId), eq(classMemberships.studentId, studentId)))
      .limit(1);
    return result.length > 0;
  }

  async getStudentClasses(studentId: string): Promise<Class[]> {
    const result = await this.db
      .select({
        id: classes.id,
        teacherId: classes.teacherId,
        name: classes.name,
        description: classes.description,
        joinCode: classes.joinCode,
        createdAt: classes.createdAt,
      })
      .from(classMemberships)
      .innerJoin(classes, eq(classMemberships.classId, classes.id))
      .where(eq(classMemberships.studentId, studentId))
      .orderBy(desc(classes.createdAt));
    return result;
  }

  async leaveClass(classId: string, studentId: string): Promise<void> {
    await this.db
      .delete(classMemberships)
      .where(and(
        eq(classMemberships.classId, classId),
        eq(classMemberships.studentId, studentId)
      ));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const result = await this.db
      .insert(assignments)
      .values(assignment)
      .returning();
    return result[0];
  }

  async getAssignment(id: string): Promise<Assignment | undefined> {
    const result = await this.db.select().from(assignments).where(eq(assignments.id, id));
    return result[0];
  }

  async getAssignmentsForClass(classId: string): Promise<Assignment[]> {
    return await this.db
      .select()
      .from(assignments)
      .where(eq(assignments.classId, classId))
      .orderBy(desc(assignments.createdAt));
  }

  async deleteAssignment(id: string): Promise<void> {
    await this.db.delete(assignmentSubmissions).where(eq(assignmentSubmissions.assignmentId, id));
    await this.db.delete(assignments).where(eq(assignments.id, id));
  }

  async createAssignmentSubmission(submission: InsertAssignmentSubmission): Promise<AssignmentSubmission> {
    const result = await this.db
      .insert(assignmentSubmissions)
      .values(submission)
      .returning();
    return result[0];
  }

  async getSubmissionsForAssignment(assignmentId: string): Promise<AssignmentSubmission[]> {
    return await this.db
      .select()
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.assignmentId, assignmentId))
      .orderBy(desc(assignmentSubmissions.submittedAt));
  }

  async getStudentSubmissionsForAssignment(assignmentId: string, studentId: string): Promise<AssignmentSubmission[]> {
    return await this.db
      .select()
      .from(assignmentSubmissions)
      .where(and(
        eq(assignmentSubmissions.assignmentId, assignmentId),
        eq(assignmentSubmissions.studentId, studentId)
      ))
      .orderBy(desc(assignmentSubmissions.submittedAt));
  }

  async gradeSubmission(id: string, grade: number, feedback: string): Promise<AssignmentSubmission | undefined> {
    const result = await this.db
      .update(assignmentSubmissions)
      .set({ grade, teacherFeedback: feedback, status: 'graded' })
      .where(eq(assignmentSubmissions.id, id))
      .returning();
    return result[0];
  }

  async createForumPost(post: InsertForumPost): Promise<ForumPost> {
    const result = await this.db
      .insert(forumPosts)
      .values(post)
      .returning();
    return result[0];
  }

  async getForumPost(id: string): Promise<ForumPost | undefined> {
    const result = await this.db.select().from(forumPosts).where(eq(forumPosts.id, id));
    return result[0];
  }

  async getAllForumPosts(category?: string): Promise<ForumPost[]> {
    if (category) {
      return await this.db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.category, category))
        .orderBy(desc(forumPosts.createdAt));
    }
    return await this.db
      .select()
      .from(forumPosts)
      .orderBy(desc(forumPosts.createdAt));
  }

  async getForumPostsByLocation(lat: number, lng: number, radiusKm: number): Promise<ForumPost[]> {
    const posts = await this.db.select().from(forumPosts).orderBy(desc(forumPosts.createdAt));
    return posts.filter(post => {
      if (!post.latitude || !post.longitude) return false;
      const postLat = parseFloat(post.latitude);
      const postLng = parseFloat(post.longitude);
      const distance = this.haversineDistance(lat, lng, postLat, postLng);
      return distance <= radiusKm;
    });
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async deleteForumPost(id: string): Promise<void> {
    await this.db.delete(forumReplies).where(eq(forumReplies.postId, id));
    await this.db.delete(forumPosts).where(eq(forumPosts.id, id));
  }

  async createForumReply(reply: InsertForumReply): Promise<ForumReply> {
    const result = await this.db
      .insert(forumReplies)
      .values(reply)
      .returning();
    return result[0];
  }

  async getRepliesForPost(postId: string): Promise<ForumReply[]> {
    return await this.db
      .select()
      .from(forumReplies)
      .where(eq(forumReplies.postId, postId))
      .orderBy(forumReplies.createdAt);
  }

  async deleteForumReply(id: string): Promise<void> {
    await this.db.delete(forumReplies).where(eq(forumReplies.id, id));
  }

  async getPlantsWithLocation(userId?: string): Promise<Plant[]> {
    const conditions = [
      sql`${plants.latitude} IS NOT NULL`,
      sql`${plants.longitude} IS NOT NULL`,
    ];
    if (userId) {
      conditions.push(sql`${plants.studentId} = ${userId}`);
    }
    return await this.db
      .select()
      .from(plants)
      .where(and(...conditions))
      .orderBy(desc(plants.createdAt));
  }

  async getTeacherPromptsByTeacherId(teacherId: string): Promise<TeacherPrompt[]> {
    return await this.db
      .select()
      .from(teacherPrompts)
      .where(eq(teacherPrompts.teacherUserId, teacherId))
      .orderBy(desc(teacherPrompts.createdAt));
  }
}

export const storage = new DatabaseStorage();
