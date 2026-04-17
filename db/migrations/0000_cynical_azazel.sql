CREATE SCHEMA "fawredd_gym";
--> statement-breakpoint
CREATE TYPE "fawredd_gym"."experiencia" AS ENUM('principiante', 'intermedio', 'avanzado');--> statement-breakpoint
CREATE TYPE "fawredd_gym"."objetivo" AS ENUM('hipertrofia', 'fuerza', 'mantenimiento');--> statement-breakpoint
CREATE TABLE "fawredd_gym"."ai_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"request_payload" text,
	"response_payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fawredd_gym"."ai_memories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL,
	"contenido" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fawredd_gym"."training_objectives" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fawredd_gym"."training_states" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"priority_goals" text NOT NULL,
	"secondary_goals" text NOT NULL,
	"progression_focus" text NOT NULL,
	"weak_areas" text NOT NULL,
	"recovery_notes" text NOT NULL,
	"weekly_strategy" text NOT NULL,
	"recommendation_next" text NOT NULL,
	"evolution_analysis" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fawredd_gym"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"external_auth_id" text NOT NULL,
	"nombre" text,
	"edad" integer,
	"peso" integer,
	"altura" integer,
	"objetivo" "fawredd_gym"."objetivo",
	"experiencia" "fawredd_gym"."experiencia",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_external_auth_id_unique" UNIQUE("external_auth_id")
);
--> statement-breakpoint
CREATE TABLE "fawredd_gym"."workout_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"workout_id" text NOT NULL,
	"nombre" text NOT NULL,
	"series" integer DEFAULT 1,
	"repeticiones" integer DEFAULT 0,
	"peso" integer DEFAULT 0,
	"duracion_segundos" integer DEFAULT 0,
	"grupo_muscular" text DEFAULT 'otros - sin definir' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fawredd_gym"."workouts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fecha" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fawredd_gym"."ai_logs" ADD CONSTRAINT "ai_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "fawredd_gym"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fawredd_gym"."ai_memories" ADD CONSTRAINT "ai_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "fawredd_gym"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fawredd_gym"."training_objectives" ADD CONSTRAINT "training_objectives_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "fawredd_gym"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fawredd_gym"."training_states" ADD CONSTRAINT "training_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "fawredd_gym"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fawredd_gym"."workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "fawredd_gym"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fawredd_gym"."workouts" ADD CONSTRAINT "workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "fawredd_gym"."users"("id") ON DELETE no action ON UPDATE no action;