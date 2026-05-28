export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  daily_calorie_goal: number;
  weekly_workout_goal: number;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  category: string;
  date: string;
  duration_minutes: number;
  notes: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: number;
  weight_lbs: number;
  created_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  date: string;
  created_at: string;
}

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface PasswordValidationResult {
  isValid: boolean;
  unmetRules: string[];
}

export interface FormErrors {
  name?: string | null;
  email?: string | null;
  password?: string[];
  general?: string | null;
}
