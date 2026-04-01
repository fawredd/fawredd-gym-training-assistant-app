import { pgSchema, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

export const fawreddGymSchema = pgSchema("fawredd_gym");

export const objectiveEnum = fawreddGymSchema.enum("objetivo", ["hipertrofia", "fuerza", "mantenimiento"]);
export const experienceEnum = fawreddGymSchema.enum("experiencia", ["principiante", "intermedio", "avanzado"]);

export const users = fawreddGymSchema.table("users", {
    id: text("id").primaryKey(),
    externalAuthId: text("external_auth_id").notNull().unique(),
    nombre: text("nombre"),
    edad: integer("edad"),
    peso: integer("peso"),
    altura: integer("altura"),
    objetivo: objectiveEnum("objetivo"),
    experiencia: experienceEnum("experiencia"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workouts = fawreddGymSchema.table("workouts", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    fecha: timestamp("fecha").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workoutExercises = fawreddGymSchema.table("workout_exercises", {
    id: text("id").primaryKey(),
    workoutId: text("workout_id").notNull().references(() => workouts.id, { onDelete: 'cascade' }),
    nombre: text("nombre").notNull(),
    series: integer("series").notNull(),
    repeticiones: integer("repeticiones").notNull(),
    peso: integer("peso").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for easier Drizzle queries
export const workoutsRelations = relations(workouts, ({ many }) => ({
    exercises: many(workoutExercises),
}));

export const workoutExercisesRelations = relations(workoutExercises, ({ one }) => ({
    workout: one(workouts, {
        fields: [workoutExercises.workoutId],
        references: [workouts.id],
    }),
}));

export const aiMemories = fawreddGymSchema.table("ai_memories", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    fecha: timestamp("fecha").notNull().defaultNow(),
    contenido: text("contenido").notNull(),
});

export const aiLogs = fawreddGymSchema.table("ai_logs", {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    requestPayload: text("request_payload"),
    responsePayload: text("response_payload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const AiMemoriesRelations = relations(aiMemories, ({ one }) => ({
    user: one(users, {
        fields: [aiMemories.userId],
        references: [users.id],
    }),
}));
