// Shared exercise picker options, keyed by WORKOUT_CATEGORIES name. Used by
// both the per-set logging sheet (src/components/logs/WorkoutLog.tsx) and
// the workout template builder (src/app/template-editor.tsx) so the two
// pickers can't drift apart.
export const COMMON_EXERCISES: Record<string, string[]> = {
  CHEST:     ['Bench Press', 'Incline Press', 'Push-Ups', 'Dumbbell Press', 'Chest Fly', 'Cable Crossover', 'Dips'],
  BACK:      ['Pull-Ups', 'Deadlift', 'Lat Pulldown', 'Bent-Over Row', 'Seated Row', 'T-Bar Row', 'Face Pull'],
  LEGS:      ['Squat', 'Leg Press', 'Lunges', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Romanian Deadlift'],
  SHOULDERS: ['Overhead Press', 'Lateral Raise', 'Front Raise', 'Arnold Press', 'Shrugs', 'Rear Delt Fly', 'Upright Row'],
  ARMS:      ['Bicep Curl', 'Tricep Extension', 'Hammer Curl', 'Skull Crushers', 'Cable Curl', 'Tricep Dips', 'Preacher Curl'],
  ABS:       ['Crunches', 'Plank', 'Leg Raises', 'Russian Twists', 'Sit-Ups', 'Mountain Climbers', 'Cable Woodchopper'],
};
