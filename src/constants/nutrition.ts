// Nutrition + weight-goal constants, consumed by src/lib/nutrition.ts to
// turn a profile's body stats and goal settings into a daily calorie and
// macro target. Kept separate from the calculation logic so the numbers
// themselves are easy to find and tune without touching the math.
import { ActivityLevel, GoalPace, WeightGoalType } from '@/types';

// Fallback goal shown before a profile has enough body stats (height/weight/
// age) to calculate a real target — see computeNutritionTargets().
export const DEFAULT_CALORIE_GOAL = 2000;

// Standard Harris-Benedict/Mifflin-St Jeor activity multipliers.
export const ACTIVITY_LEVELS: {
  value: ActivityLevel; label: string; description: string; multiplier: number;
}[] = [
  { value: 'sedentary',   label: 'Sedentary',   description: 'Little or no exercise, desk job',   multiplier: 1.2 },
  { value: 'light',       label: 'Light',       description: 'Light exercise 1–3 days/week',       multiplier: 1.375 },
  { value: 'moderate',    label: 'Moderate',    description: 'Moderate exercise 3–5 days/week',    multiplier: 1.55 },
  { value: 'active',      label: 'Active',      description: 'Hard exercise 6–7 days/week',        multiplier: 1.725 },
  { value: 'very_active', label: 'Very Active', description: 'Very hard exercise, physical job',   multiplier: 1.9 },
];
export const DEFAULT_ACTIVITY_LEVEL: ActivityLevel = 'moderate';

// Daily calorie delta from maintenance for each pace. ~3,500 kcal per lb of
// body fat, so 250/500/1000 kcal/day ≈ 0.5/1/2 lb per week — the standard
// range used by most nutrition coaching guidance, capped at 2 lb/week so
// "aggressive" never crosses into unsafe territory.
export const GOAL_PACES: {
  value: GoalPace; label: string; lbPerWeek: number; deltaKcal: number;
}[] = [
  { value: 'mild',       label: 'Mild',       lbPerWeek: 0.5, deltaKcal: 250 },
  { value: 'moderate',   label: 'Moderate',   lbPerWeek: 1,   deltaKcal: 500 },
  { value: 'aggressive', label: 'Aggressive', lbPerWeek: 2,   deltaKcal: 1000 },
];
export const DEFAULT_GOAL_PACE: GoalPace = 'moderate';

// Never recommend below this regardless of deficit — a widely used floor
// for adult daily calorie intake.
export const MIN_SAFE_CALORIES = 1200;

// Protein target in grams per kg of bodyweight — higher while losing to
// protect lean mass. Fat is a flat share of total calories with its own
// floor for hormonal health; carbs fill whatever's left.
export const PROTEIN_G_PER_KG: Record<WeightGoalType, number> = {
  lose: 2.2,
  maintain: 1.8,
  gain: 2.0,
};
export const FAT_PERCENT_OF_CALORIES = 0.25;
export const MIN_FAT_G_PER_KG = 0.5;

export const WEIGHT_GOAL_LABELS: Record<WeightGoalType, string> = {
  lose: 'Losing weight',
  maintain: 'Maintaining weight',
  gain: 'Gaining weight',
};
