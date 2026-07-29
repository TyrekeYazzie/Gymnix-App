// Mirrors the `profiles` table. Row is auto-created by the `handle_new_user`
// trigger on signup with only id/full_name/units set — everything else
// starts null until the user fills out EditProfile.
export interface Profile {
  id: string;
  full_name: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  goal: string | null;
  activity_level: string | null;
  units: 'metric' | 'imperial';
  reminders_enabled: boolean;
  total_xp: number;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  duration: string | null;
  calories: number | null;
  notes: string | null;
  sets: { reps: number; weight: number }[];
  created_at: string;
}

export interface CardioLogEntry {
  id: string;
  user_id: string;
  type: string;
  distance_km: number | null;
  duration: string | null;
  calories: number | null;
  created_at: string;
}

export interface WaterLogEntry {
  id: string;
  user_id: string;
  amount_ml: number;
  created_at: string;
}

export interface WeightLogEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
}

// Mirrors the `calorie_logs` table.
export interface Meal {
  id: string;
  user_id: string;
  meal_name: string;
  meal_type: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
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
