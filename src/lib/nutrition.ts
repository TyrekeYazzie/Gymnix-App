// Turns a profile's body stats + goal settings into a daily calorie and
// macro target: BMR (Mifflin-St Jeor) -> TDEE (activity multiplier) ->
// goal-adjusted calorie goal -> macro split. Nothing here is persisted —
// it's recalculated from the profile every time so it never goes stale
// when weight, activity, or goal settings change.
import { Profile, Sex, WeightGoalType } from '@/types';
import {
  ACTIVITY_LEVELS, DEFAULT_ACTIVITY_LEVEL, GOAL_PACES, DEFAULT_GOAL_PACE,
  DEFAULT_CALORIE_GOAL, MIN_SAFE_CALORIES, PROTEIN_G_PER_KG,
  FAT_PERCENT_OF_CALORIES, MIN_FAT_G_PER_KG,
} from '@/constants/nutrition';

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calorieGoal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Signed calorie adjustment applied to TDEE: negative losing, positive gaining, 0 maintaining. */
  deltaKcal: number;
  activityMultiplier: number;
  /** False when the profile is missing height/weight/age — calorieGoal falls back to DEFAULT_CALORIE_GOAL and macros are 0. */
  complete: boolean;
}

function getActivityMultiplier(level: string | null | undefined): number {
  const found = ACTIVITY_LEVELS.find(a => a.value === level);
  return (found ?? ACTIVITY_LEVELS.find(a => a.value === DEFAULT_ACTIVITY_LEVEL))!.multiplier;
}

function getPace(pace: string | null | undefined) {
  return GOAL_PACES.find(p => p.value === pace) ?? GOAL_PACES.find(p => p.value === DEFAULT_GOAL_PACE)!;
}

// Mifflin-St Jeor. Falls back to the sex-neutral average of the male (+5)
// and female (-161) offsets (-78) when sex isn't set, since collecting it
// is optional.
function calculateBMR(weightKg: number, heightCm: number, age: number, sex: Sex | null | undefined): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base - 78;
}

/** Returns null when the profile doesn't have enough body stats yet (height/weight/age). */
export function computeNutritionTargets(profile: Profile | null | undefined): NutritionTargets | null {
  if (!profile) return null;
  const { weight_kg, height_cm, age } = profile;
  if (!weight_kg || !height_cm || !age) return null;

  const bmr = calculateBMR(weight_kg, height_cm, age, profile.sex);
  const activityMultiplier = getActivityMultiplier(profile.activity_level);
  const tdee = bmr * activityMultiplier;

  const goalType: WeightGoalType = profile.weight_goal_type ?? 'maintain';
  const pace = getPace(profile.goal_pace);
  const deltaKcal = goalType === 'lose' ? -pace.deltaKcal : goalType === 'gain' ? pace.deltaKcal : 0;

  const calorieGoal = Math.max(MIN_SAFE_CALORIES, Math.round(tdee + deltaKcal));

  const proteinG = Math.round(weight_kg * PROTEIN_G_PER_KG[goalType]);
  const proteinKcal = proteinG * 4;
  const fatFromPercent = (calorieGoal * FAT_PERCENT_OF_CALORIES) / 9;
  const fatFloor = weight_kg * MIN_FAT_G_PER_KG;
  const fatG = Math.round(Math.max(fatFromPercent, fatFloor));
  const fatKcal = fatG * 9;
  const carbsG = Math.max(0, Math.round((calorieGoal - proteinKcal - fatKcal) / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieGoal,
    proteinG,
    carbsG,
    fatG,
    deltaKcal,
    activityMultiplier,
    complete: true,
  };
}

// Convenience wrapper for callers (the Calories tab, the log-meal sheet)
// that just need *a* number to render and would rather branch on
// `.complete` than null-check the whole result.
export function nutritionTargetsOrDefault(profile: Profile | null | undefined): NutritionTargets {
  return computeNutritionTargets(profile) ?? {
    bmr: 0,
    tdee: 0,
    calorieGoal: DEFAULT_CALORIE_GOAL,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    deltaKcal: 0,
    activityMultiplier: 0,
    complete: false,
  };
}
