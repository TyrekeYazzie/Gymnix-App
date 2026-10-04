import { computeNutritionTargets, nutritionTargetsOrDefault } from '@/lib/nutrition';
import { estimateCardioCalories } from '@/lib/cardioCalories';
import { Profile } from '@/types';

const profile = (p: Partial<Profile>) => p as Profile;

describe('nutrition targets', () => {
  it('computes BMR, TDEE and macros (Mifflin-St Jeor)', () => {
    expect(computeNutritionTargets(profile({
      weight_kg: 80, height_cm: 180, age: 30, sex: 'male', activity_level: 'moderate', weight_goal_type: 'maintain',
    }))).toEqual({
      bmr: 1780, tdee: 2759, calorieGoal: 2759, proteinG: 144, carbsG: 373, fatG: 77,
      deltaKcal: 0, activityMultiplier: 1.55, complete: true,
    });
  });

  it('never goes below the 1200 kcal safety floor', () => {
    const t = computeNutritionTargets(profile({
      weight_kg: 50, height_cm: 160, age: 60, sex: 'female', activity_level: 'sedentary',
      weight_goal_type: 'lose', goal_pace: 'aggressive',
    }));
    expect(t?.calorieGoal).toBe(1200);
    expect(t?.carbsG).toBeGreaterThanOrEqual(0);
  });

  it('needs height, weight and age, otherwise falls back to the default goal', () => {
    expect(computeNutritionTargets(profile({ weight_kg: 80, age: 30 }))).toBeNull();
    expect(nutritionTargetsOrDefault(null)).toMatchObject({ calorieGoal: 2000, complete: false });
  });
});

describe('cardio calories', () => {
  it('scales MET by pace, weight and time', () => {
    expect(estimateCardioCalories('Run', 10, 60, 70)).toBe(686);
    expect(estimateCardioCalories('Run', 0, 30, null)).toBe(343);
    expect(estimateCardioCalories('HIIT', 0, 20, 80)).toBe(213);
    expect(estimateCardioCalories('Yoga', 0, 60, 70)).toBe(420);
  });

  it('returns 0 for no duration', () => {
    expect(estimateCardioCalories('Run', 5, 0, 70)).toBe(0);
  });
});
