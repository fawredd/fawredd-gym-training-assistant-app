-- ============================================================================
-- PH3 BDD Test Data Seed Script
-- ============================================================================
--
-- This script seeds test data for Phase 3 Objective-Driven Training BDD tests
-- Location: tests/fixtures/seed.sql
-- 
-- Run with:
--   PGPASSWORD=password psql -h localhost -U postgres -d fawredd_gym \
--     -f tests/fixtures/seed.sql
--
-- Usage:
--   - Automatically invoked by GitHub Actions CI before BDD tests
--   - Can be manually run for local development
--   - Safe to re-run (idempotent - uses DELETE + INSERT)
--
-- ============================================================================

BEGIN TRANSACTION;

-- Clear existing test data (idempotent cleanup)
DELETE FROM training_states WHERE user_id LIKE 'user_test_%' OR user_id LIKE 'test_%';
DELETE FROM training_objectives WHERE user_id LIKE 'user_test_%' OR user_id LIKE 'test_%';
DELETE FROM exercises WHERE workout_id LIKE 'wo_test_%' OR workout_id LIKE 'test_%';
DELETE FROM workouts WHERE id LIKE 'wo_test_%' OR id LIKE 'test_%' OR user_id LIKE 'user_test_%' OR user_id LIKE 'test_%';
DELETE FROM users WHERE id LIKE 'user_test_%' OR clerk_id LIKE 'clerk_test_%';

-- ============================================================================
-- TEST USERS
-- ============================================================================

INSERT INTO users (id, clerk_id, email, first_name, last_name, goal, created_at, updated_at)
VALUES 
  -- QA Test User 1: Will test objective add/edit flows, AI context
  ('user_test_001', 'clerk_test_001', 'qatest+phase3@example.com', 'QA', 'Tester', 'Fuerza', NOW(), NOW()),
  
  -- QA Test User 2: Will test concurrent objectives, security IDOR
  ('user_test_002', 'clerk_test_002', 'qatest+phase3+2@example.com', 'Trainer', 'Test', 'Hipertrofia', NOW(), NOW());

-- ============================================================================
-- TEST TRAINING OBJECTIVES
-- ============================================================================

INSERT INTO training_objectives (id, user_id, content, created_at, updated_at)
VALUES 
  -- User 1 - Primary objective (recent)
  ('obj_test_001', 'user_test_001', 'Run 5km without stopping', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),
  
  -- User 1 - Previously edited objective
  ('obj_test_003', 'user_test_001', 'Lose 5kg in 3 months', NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'),
  
  -- User 2 - Strength-focused objective
  ('obj_test_002', 'user_test_002', 'Increase squat to 120kg', NOW() - INTERVAL '14 days', NOW());

-- ============================================================================
-- TEST WORKOUTS (for AI context assembly)
-- ============================================================================

INSERT INTO workouts (id, user_id, date, duration_minutes, ai_suggested_next, created_at, updated_at)
VALUES 
  -- User 1 - Recent workout (2 hours ago)
  ('wo_test_001', 'user_test_001', CURRENT_DATE, 45, 
   'Excellent form on all sets. Next session: increase squat weight by 5kg.', 
   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  
  -- User 1 - Older workout (2 days ago)
  ('wo_test_002', 'user_test_001', CURRENT_DATE - INTERVAL '2 days', 20,
   'Great cardio session! Consider extending next run by 30 seconds.',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  
  -- User 1 - Week-old workout (for historical context)
  ('wo_test_003', 'user_test_001', CURRENT_DATE - INTERVAL '7 days', 60,
   'Strong upper body day. Maintain current intensity.',
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
  
  -- User 2 - Recent workout
  ('wo_test_004', 'user_test_002', CURRENT_DATE, 55,
   'Good progress toward 120kg squat goal. Keep building strength.',
   NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours');

-- ============================================================================
-- TEST EXERCISES (within workouts)
-- ============================================================================

INSERT INTO exercises (id, workout_id, name, exercise_type, sets, reps, weight, weight_unit, duration_seconds, distance, distance_unit, order_index, created_at)
VALUES 
  -- Workout 1 exercises
  ('ex_test_001', 'wo_test_001', 'Squat', 'strength', 5, 5, 100.0, 'kg', NULL, NULL, NULL, 1, NOW() - INTERVAL '2 hours'),
  ('ex_test_002', 'wo_test_001', 'Bench Press', 'strength', 4, 8, 85.0, 'kg', NULL, NULL, NULL, 2, NOW() - INTERVAL '2 hours'),
  ('ex_test_003', 'wo_test_001', 'Deadlift', 'strength', 3, 3, 120.0, 'kg', NULL, NULL, NULL, 3, NOW() - INTERVAL '2 hours'),
  
  -- Workout 2 exercises (cardio)
  ('ex_test_004', 'wo_test_002', 'Run', 'cardio', NULL, NULL, NULL, NULL, 1200, 3.0, 'km', 1, NOW() - INTERVAL '2 days'),
  
  -- Workout 3 exercises (varied)
  ('ex_test_005', 'wo_test_003', 'Pull-ups', 'strength', 4, 8, NULL, NULL, NULL, NULL, NULL, 1, NOW() - INTERVAL '7 days'),
  ('ex_test_006', 'wo_test_003', 'Barbell Rows', 'strength', 4, 8, 95.0, 'kg', NULL, NULL, NULL, 2, NOW() - INTERVAL '7 days'),
  ('ex_test_007', 'wo_test_003', 'Barbell Curls', 'strength', 3, 10, 40.0, 'kg', NULL, NULL, NULL, 3, NOW() - INTERVAL '7 days'),
  
  -- Workout 4 exercises (strength focus for user 2)
  ('ex_test_008', 'wo_test_004', 'Squat', 'strength', 5, 3, 110.0, 'kg', NULL, NULL, NULL, 1, NOW() - INTERVAL '3 hours'),
  ('ex_test_009', 'wo_test_004', 'Front Squat', 'strength', 4, 5, 85.0, 'kg', NULL, NULL, NULL, 2, NOW() - INTERVAL '3 hours');

-- ============================================================================
-- TEST TRAINING STATES (AI-generated coaching states)
-- ============================================================================

INSERT INTO training_states (id, user_id, content, created_at)
VALUES 
  -- State 1: After user_test_001's most recent workout
  ('ts_test_001', 'user_test_001', 
   '{
     "progress": "25% toward 5km run goal",
     "observations": "Great form on squat. Excellent technique maintained throughout all sets.",
     "nextFocusAreas": "Increase load by 5kg when comfortable with current weight",
     "coachingDirection": "Continue with current intensity, maintain consistency in form"
   }', 
   NOW() - INTERVAL '2 hours'),
  
  -- State 2: Earlier training state (creates history for continuity test)
  ('ts_test_002', 'user_test_001',
   '{
     "progress": "15% toward 5km run goal",
     "observations": "Cardiovascular capacity steadily improving",
     "nextFocusAreas": "Add 500m to next run",
     "coachingDirection": "Maintain current pace, gradually increase distance"
   }',
   NOW() - INTERVAL '2 days'),
  
  -- State 3: For user_test_002
  ('ts_test_003', 'user_test_002',
   '{
     "progress": "50% toward 120kg squat goal",
     "observations": "Excellent form on main lifts. Safety check passed.",
     "nextFocusAreas": "Work on depth on front squats",
     "coachingDirection": "Add 2.5kg to main squat lifts next week"
   }',
   NOW() - INTERVAL '3 hours');

-- ============================================================================
-- TEST: VERIFY SEEDING SUCCESS
-- ============================================================================

-- Count inserted records
DO $$
DECLARE
  user_count INT;
  obj_count INT;
  workout_count INT;
  state_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users WHERE id LIKE 'user_test_%';
  SELECT COUNT(*) INTO obj_count FROM training_objectives WHERE user_id LIKE 'user_test_%';
  SELECT COUNT(*) INTO workout_count FROM workouts WHERE id LIKE 'wo_test_%';
  SELECT COUNT(*) INTO state_count FROM training_states WHERE id LIKE 'ts_test_%';
  
  RAISE NOTICE '✓ Test Data Seeding Complete:';
  RAISE NOTICE '  - Users: %', user_count;
  RAISE NOTICE '  - Objectives: %', obj_count;
  RAISE NOTICE '  - Workouts: %', workout_count;
  RAISE NOTICE '  - Training States: %', state_count;
END $$;

COMMIT TRANSACTION;

