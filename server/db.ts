import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sqlConnection = neon(process.env.DATABASE_URL!);
export const db = drizzle(sqlConnection);
