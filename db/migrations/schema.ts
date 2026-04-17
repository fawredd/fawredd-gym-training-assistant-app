import { pgTable, pgSchema, foreignKey, text, timestamp, integer, unique, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const fawreddGym = pgSchema("fawredd_gym");
export const experienciaInFawreddGym = fawreddGym.enum("experiencia", ['principiante', 'intermedio', 'avanzado'])
export const objetivoInFawreddGym = fawreddGym.enum("objetivo", ['hipertrofia', 'fuerza', 'mantenimiento'])


export const trainingStatesInFawreddGym = fawreddGym.table("training_states", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	priorityGoals: text("priority_goals").notNull(),
	secondaryGoals: text("secondary_goals").notNull(),
	progressionFocus: text("progression_focus").notNull(),
	weakAreas: text("weak_areas").notNull(),
	recoveryNotes: text("recovery_notes").notNull(),
	weeklyStrategy: text("weekly_strategy").notNull(),
	recommendationNext: text("recommendation_next").notNull(),
	evolutionAnalysis: text("evolution_analysis").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInFawreddGym.id],
			name: "training_states_user_id_users_id_fk"
		}),
]);

export const workoutExercisesInFawreddGym = fawreddGym.table("workout_exercises", {
	id: text().primaryKey().notNull(),
	workoutId: text("workout_id").notNull(),
	nombre: text().notNull(),
	series: integer().default(1),
	repeticiones: integer().default(0),
	peso: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	duracionSegundos: integer("duracion_segundos").default(0),
	grupoMuscular: text("grupo_muscular").default('otros - sin definir').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.workoutId],
			foreignColumns: [workoutsInFawreddGym.id],
			name: "workout_exercises_workout_id_workouts_id_fk"
		}).onDelete("cascade"),
]);

export const usersInFawreddGym = fawreddGym.table("users", {
	id: text().primaryKey().notNull(),
	externalAuthId: text("external_auth_id").notNull(),
	nombre: text(),
	edad: integer(),
	peso: integer(),
	altura: integer(),
	objetivo: objetivoInFawreddGym(),
	experiencia: experienciaInFawreddGym(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_external_auth_id_unique").on(table.externalAuthId),
]);

export const aiMemoriesInFawreddGym = fawreddGym.table("ai_memories", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	fecha: timestamp({ mode: 'string' }).defaultNow().notNull(),
	contenido: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInFawreddGym.id],
			name: "ai_memories_user_id_users_id_fk"
		}),
]);

export const trainingObjectivesInFawreddGym = fawreddGym.table("training_objectives", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	content: text().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInFawreddGym.id],
			name: "training_objectives_user_id_users_id_fk"
		}),
]);

export const workoutsInFawreddGym = fawreddGym.table("workouts", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	fecha: date().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInFawreddGym.id],
			name: "workouts_user_id_users_id_fk"
		}),
]);

export const aiLogsInFawreddGym = fawreddGym.table("ai_logs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id"),
	requestPayload: text("request_payload"),
	responsePayload: text("response_payload"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInFawreddGym.id],
			name: "ai_logs_user_id_users_id_fk"
		}),
]);
