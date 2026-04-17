import {
  pgSchema,
  text,
  timestamp,
  integer, 
  date
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const fawreddGymSchema = pgSchema("fawredd_gym");

export const objectiveEnum = fawreddGymSchema.enum("objetivo", [
  "hipertrofia",
  "fuerza",
  "mantenimiento",
]);
export const experienceEnum = fawreddGymSchema.enum("experiencia", [
  "principiante",
  "intermedio",
  "avanzado",
]);

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
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  fecha: date("fecha",{ mode: "string"}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workoutExercises = fawreddGymSchema.table("workout_exercises", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  series: integer("series").default(1),
  repeticiones: integer("repeticiones").default(0),
  peso: integer("peso").default(0),
  duracionSegundos: integer("duracion_segundos").default(0),
  grupoMuscular: text("grupo_muscular").notNull().default("otros - sin definir"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for easier Drizzle queries
export const workoutsRelations = relations(workouts, ({ many }) => ({
  exercises: many(workoutExercises),
}));

export const workoutExercisesRelations = relations(
  workoutExercises,
  ({ one }) => ({
    workout: one(workouts, {
      fields: [workoutExercises.workoutId],
      references: [workouts.id],
    }),
  }),
);

export const aiMemories = fawreddGymSchema.table("ai_memories", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
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

export const trainingObjectives = fawreddGymSchema.table(
  "training_objectives",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

export const trainingStates = fawreddGymSchema.table("training_states", {
  id: text("id").primaryKey(),

  userId: text("user_id")
    .notNull()
    .references(() => users.id),

  priorityGoals: text("priority_goals").notNull(),
  secondaryGoals: text("secondary_goals").notNull(),
  progressionFocus: text("progression_focus").notNull(),
  weakAreas: text("weak_areas").notNull(),
  recoveryNotes: text("recovery_notes").notNull(),
  weeklyStrategy: text("weekly_strategy").notNull(),
  recommendationNext: text("recommendation_next").notNull(),
  evolutionAnalysis: text("evolution_analysis").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const TrainingObjectivesRelations = relations(
  trainingObjectives,
  ({ one }) => ({
    user: one(users, {
      fields: [trainingObjectives.userId],
      references: [users.id],
    }),
  }),
);

export const TrainingStatesRelations = relations(trainingStates, ({ one }) => ({
  user: one(users, {
    fields: [trainingStates.userId],
    references: [users.id],
  }),
}));

// SELECT types (lo que devuelve una query)
export type User              = typeof users.$inferSelect;
export type Workout           = typeof workouts.$inferSelect;
export type WorkoutExercise   = typeof workoutExercises.$inferSelect;
export type AiMemory          = typeof aiMemories.$inferSelect;
export type AiLog             = typeof aiLogs.$inferSelect;
export type TrainingObjective = typeof trainingObjectives.$inferSelect;
export type TrainingState     = typeof trainingStates.$inferSelect;

// INSERT types (para crear registros — campos con default son opcionales)
export type NewUser              = typeof users.$inferInsert;
export type NewWorkout           = typeof workouts.$inferInsert;
export type NewWorkoutExercise   = typeof workoutExercises.$inferInsert;
export type NewAiMemory          = typeof aiMemories.$inferInsert;
export type NewAiLog             = typeof aiLogs.$inferInsert;
export type NewTrainingObjective = typeof trainingObjectives.$inferInsert;
export type NewTrainingState     = typeof trainingStates.$inferInsert;