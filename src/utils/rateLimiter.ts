import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AttemptData {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

function getKey(email: string): string {
  return `ratelimit_${email.toLowerCase().trim()}`;
}

// expo-secure-store has no web implementation (see src/lib/supabase.ts for
// the same pattern) — fall back to AsyncStorage there.
const store = {
  getItem: (key: string) => Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => Platform.OS === 'web' ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

export async function recordFailedAttempt(email: string): Promise<void> {
  const key = getKey(email);

  // Get existing AttemptData or start fresh
  const existingData: AttemptData | null = await store.getItem(key)
    .then(raw => raw ? JSON.parse(raw) : null)
    .catch(() => null);

  let data: AttemptData;
  
  if (existingData) {
    // Increment attempts
    data = {
      ...existingData,
      attempts: existingData.attempts + 1,
      lastAttempt: Date.now(),
    };
  } else {
    // No prior record — this call is itself the first failed attempt.
    data = {
      attempts: 1,
      lastAttempt: Date.now(),
      lockedUntil: null,
    };
  }

  // Calculate lockedUntil based on exponential backoff.
  // Checked highest threshold first so escalation actually applies —
  // attempts only ever grows, so an ascending if/else-if chain would
  // always match the lowest tier first and never reach the higher ones.
  let lockoutDuration = 0;

  if (data.attempts >= 8) lockoutDuration = 30 * 60 * 1000; // 30 minutes max
  else if (data.attempts >= 7) lockoutDuration = 240 * 1000;  // 4 minutes
  else if (data.attempts >= 6) lockoutDuration = 120 * 1000;  // 2 minutes
  else if (data.attempts >= 5) lockoutDuration = 60 * 1000;     // 1 minute

  data.lockedUntil = data.attempts >= 5 ? Date.now() + lockoutDuration : null;

  // Save updated AttemptData
  await store.setItem(key, JSON.stringify(data));
}

export async function isLockedOut(email: string): Promise<boolean> {
  const key = getKey(email);

  // Read AttemptData
  const rawData: string | null = await store.getItem(key).catch(() => null);

  if (!rawData) return false;

  const data: AttemptData = JSON.parse(rawData);

  // If lockedUntil is null, not locked
  if (data.lockedUntil === null) return false;

  // Check if lockout has expired
  if (Date.now() > data.lockedUntil) {
    // Reset lockedUntil to null and save
    data.lockedUntil = null;
    await store.setItem(key, JSON.stringify(data));
    return false;
  }

  return true;
}

export async function getRemainingLockoutTime(email: string): Promise<number> {
  const key = getKey(email);

  // Read AttemptData
  const rawData: string | null = await store.getItem(key).catch(() => null);

  if (!rawData) return 0;

  const data: AttemptData = JSON.parse(rawData);

  // If no lockedUntil, return 0
  if (data.lockedUntil === null) return 0;

  // Return remaining time in seconds
  return Math.max(0, Math.floor((data.lockedUntil - Date.now()) / 1000));
}

export async function resetAttempts(email: string): Promise<void> {
  const key = getKey(email);

  // Delete the stored entry
  await store.removeItem(key);
}