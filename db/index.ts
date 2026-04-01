import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

// This exports the singleton db instance and the schema for ease of use
export const db = drizzle(sql, { schema });
