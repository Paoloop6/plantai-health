import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique(),
  password: text("password"),
  displayName: text("display_name"),
  role: text("role").notNull().default("student"),
  classCode: text("class_code"),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  authProvider: text("auth_provider").default("local"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const plants = pgTable("plants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  species: text("species"),
  genus: text("genus"),
  family: text("family"),
  order: text("order"),
  plantClass: text("plant_class"),
  phylum: text("phylum"),
  kingdom: text("kingdom"),
  nativeRegion: text("native_region"),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  wateringFrequencyDays: integer("watering_frequency_days").notNull().default(7),
  lightRequirement: text("light_requirement"),
  careInstructions: text("care_instructions"),
  propagationInfo: text("propagation_info"),
  educationalContent: text("educational_content"),
  confidenceScore: integer("confidence_score"),
  photoQualityScore: integer("photo_quality_score"),
  lastWatered: timestamp("last_watered"),
  nextWatering: timestamp("next_watering"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  teacherPromptId: varchar("teacher_prompt_id"),
  challengeId: varchar("challenge_id"),
  studentId: varchar("student_id"),
  studentName: text("student_name"),
  studentComment: text("student_comment"),
  studentAnswer: text("student_answer"),
  teacherComment: text("teacher_comment"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationLabel: text("location_label"),
});

export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  joinCode: text("join_code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const classMemberships = pgTable("class_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull().references(() => classes.id),
  studentId: varchar("student_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().default(sql`now()`),
});

export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classId: varchar("class_id").notNull().references(() => classes.id),
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  targetCount: integer("target_count").notNull().default(1),
  minConfidence: integer("min_confidence").default(70),
  plantCategory: text("plant_category"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id),
  studentId: varchar("student_id").notNull().references(() => users.id),
  plantId: varchar("plant_id").references(() => plants.id),
  status: text("status").notNull().default("pending"),
  grade: integer("grade"),
  teacherFeedback: text("teacher_feedback"),
  submittedAt: timestamp("submitted_at").notNull().default(sql`now()`),
});

export const forumPosts = pgTable("forum_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  plantId: varchar("plant_id").references(() => plants.id),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationLabel: text("location_label"),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const forumReplies = pgTable("forum_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => forumPosts.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const wateringHistory = pgTable("watering_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plantId: varchar("plant_id").notNull().references(() => plants.id),
  wateredAt: timestamp("watered_at").notNull().default(sql`now()`),
  notes: text("notes"),
});

export const plantImages = pgTable("plant_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plantId: varchar("plant_id").notNull().references(() => plants.id),
  imageUrl: text("image_url").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
});

export const plantNotes = pgTable("plant_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plantId: varchar("plant_id").notNull().references(() => plants.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const visitorStats = pgTable("visitor_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalVisits: integer("total_visits").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().default(sql`now()`),
});

export const teacherPrompts = pgTable("teacher_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherUserId: varchar("teacher_user_id"),
  teacherName: text("teacher_name").notNull(),
  promptTitle: text("prompt_title").notNull(),
  customInstructions: text("custom_instructions").notNull(),
  learningGoal: text("learning_goal"),
  activityInstructions: text("activity_instructions"),
  gradeLevel: text("grade_level"),
  subject: text("subject"),
  enablePropagationMode: boolean("enable_propagation_mode").default(false),
  shareCode: text("share_code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherPromptId: varchar("teacher_prompt_id").references(() => teacherPrompts.id),
  title: text("title").notNull(),
  description: text("description"),
  targetCount: integer("target_count").notNull().default(3),
  minConfidence: integer("min_confidence").default(85),
  plantCategory: text("plant_category"),
  shareCode: text("share_code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const challengeProgress = pgTable("challenge_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id),
  studentName: text("student_name"),
  completedCount: integer("completed_count").notNull().default(0),
  plantIds: text("plant_ids").array(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPlantSchema = createInsertSchema(plants).omit({
  id: true,
  createdAt: true,
});

export const insertWateringHistorySchema = createInsertSchema(wateringHistory).omit({
  id: true,
  wateredAt: true,
});

export const insertPlantImageSchema = createInsertSchema(plantImages).omit({
  id: true,
  uploadedAt: true,
});

export const insertPlantNoteSchema = createInsertSchema(plantNotes).omit({
  id: true,
  createdAt: true,
});

export const insertTeacherPromptSchema = createInsertSchema(teacherPrompts).omit({
  id: true,
  createdAt: true,
  shareCode: true,
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  createdAt: true,
  shareCode: true,
});

export const insertChallengeProgressSchema = createInsertSchema(challengeProgress).omit({
  id: true,
  createdAt: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
  joinCode: true,
});

export const insertClassMembershipSchema = createInsertSchema(classMemberships).omit({
  id: true,
  joinedAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissions).omit({
  id: true,
  submittedAt: true,
});

export const insertForumPostSchema = createInsertSchema(forumPosts).omit({
  id: true,
  createdAt: true,
});

export const insertForumReplySchema = createInsertSchema(forumReplies).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type WateringHistory = typeof wateringHistory.$inferSelect;
export type InsertWateringHistory = z.infer<typeof insertWateringHistorySchema>;
export type PlantImage = typeof plantImages.$inferSelect;
export type InsertPlantImage = z.infer<typeof insertPlantImageSchema>;
export type PlantNote = typeof plantNotes.$inferSelect;
export type InsertPlantNote = z.infer<typeof insertPlantNoteSchema>;
export type TeacherPrompt = typeof teacherPrompts.$inferSelect;
export type InsertTeacherPrompt = z.infer<typeof insertTeacherPromptSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type ChallengeProgress = typeof challengeProgress.$inferSelect;
export type InsertChallengeProgress = z.infer<typeof insertChallengeProgressSchema>;
export type VisitorStats = typeof visitorStats.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ClassMembership = typeof classMemberships.$inferSelect;
export type InsertClassMembership = z.infer<typeof insertClassMembershipSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type InsertAssignmentSubmission = z.infer<typeof insertAssignmentSubmissionSchema>;
export type ForumPost = typeof forumPosts.$inferSelect;
export type InsertForumPost = z.infer<typeof insertForumPostSchema>;
export type ForumReply = typeof forumReplies.$inferSelect;
export type InsertForumReply = z.infer<typeof insertForumReplySchema>;

export interface PlantIdentificationResult {
  species: string;
  genus: string;
  family: string;
  order: string;
  plantClass: string;
  phylum: string;
  kingdom: string;
  nativeRegion: string;
  commonName: string;
  confidence: number;
  photoQuality: number;
  identificationLevel: "species" | "genus" | "family" | "unknown";
  careInstructions: string;
  wateringFrequencyDays: number;
  lightRequirement: string;
  description: string;
  propagationInfo: string;
  educationalContent: string;
}

// Chat schema for AI Chatbot
export * from "./models/chat";
