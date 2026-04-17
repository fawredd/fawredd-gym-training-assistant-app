import { relations } from "drizzle-orm/relations";
import { usersInFawreddGym, trainingStatesInFawreddGym, workoutsInFawreddGym, workoutExercisesInFawreddGym, aiMemoriesInFawreddGym, trainingObjectivesInFawreddGym, aiLogsInFawreddGym } from "./schema";

export const trainingStatesInFawreddGymRelations = relations(trainingStatesInFawreddGym, ({one}) => ({
	usersInFawreddGym: one(usersInFawreddGym, {
		fields: [trainingStatesInFawreddGym.userId],
		references: [usersInFawreddGym.id]
	}),
}));

export const usersInFawreddGymRelations = relations(usersInFawreddGym, ({many}) => ({
	trainingStatesInFawreddGyms: many(trainingStatesInFawreddGym),
	aiMemoriesInFawreddGyms: many(aiMemoriesInFawreddGym),
	trainingObjectivesInFawreddGyms: many(trainingObjectivesInFawreddGym),
	workoutsInFawreddGyms: many(workoutsInFawreddGym),
	aiLogsInFawreddGyms: many(aiLogsInFawreddGym),
}));

export const workoutExercisesInFawreddGymRelations = relations(workoutExercisesInFawreddGym, ({one}) => ({
	workoutsInFawreddGym: one(workoutsInFawreddGym, {
		fields: [workoutExercisesInFawreddGym.workoutId],
		references: [workoutsInFawreddGym.id]
	}),
}));

export const workoutsInFawreddGymRelations = relations(workoutsInFawreddGym, ({one, many}) => ({
	workoutExercisesInFawreddGyms: many(workoutExercisesInFawreddGym),
	usersInFawreddGym: one(usersInFawreddGym, {
		fields: [workoutsInFawreddGym.userId],
		references: [usersInFawreddGym.id]
	}),
}));

export const aiMemoriesInFawreddGymRelations = relations(aiMemoriesInFawreddGym, ({one}) => ({
	usersInFawreddGym: one(usersInFawreddGym, {
		fields: [aiMemoriesInFawreddGym.userId],
		references: [usersInFawreddGym.id]
	}),
}));

export const trainingObjectivesInFawreddGymRelations = relations(trainingObjectivesInFawreddGym, ({one}) => ({
	usersInFawreddGym: one(usersInFawreddGym, {
		fields: [trainingObjectivesInFawreddGym.userId],
		references: [usersInFawreddGym.id]
	}),
}));

export const aiLogsInFawreddGymRelations = relations(aiLogsInFawreddGym, ({one}) => ({
	usersInFawreddGym: one(usersInFawreddGym, {
		fields: [aiLogsInFawreddGym.userId],
		references: [usersInFawreddGym.id]
	}),
}));