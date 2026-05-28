import * as SecureStore from 'expo-secure-store';

interface AttemptData {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

function getKey(email: string): string {
  return `ratelimit_${email.toLowerCase().trim()}`;
}

export async function recordFailedAttempt(email: string): Promise<void> {
  const key = getKey(email);
  
  // Get existing AttemptData or start fresh
  const existingData: AttemptData | null = await SecureStore.getItemAsync(key)
    .then(JSON.parse)
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
    // Start with attempts: 0
    data = {
      attempts: 0,
      lastAttempt: Date.now(),
      lockedUntil: null,
    };
  }

  // Calculate lockedUntil based on exponential backoff
  let lockoutDuration = 0;
  
  if (data.attempts >= 5) lockoutDuration = 60 * 1000;     // 1 minute
  else if (data.attempts >= 6) lockoutDuration = 120 * 1000;  // 2 minutes
  else if (data.attempts >= 7) lockoutDuration = 240 * 1000;  // 4 minutes
  else if (data.attempts >= 8) lockoutDuration = 30 * 60 * 1000; // 30 minutes max
  
  data.lockedUntil = data.attempts >= 5 ? Date.now() + lockoutDuration : null;

  // Save updated AttemptData to SecureStore as JSON string
  await SecureStore.setItemAsync(key, JSON.stringify(data));
}

export async function isLockedOut(email: string): Promise<boolean> {
  const key = getKey(email);
  
  // Read AttemptData from SecureStore
  const rawData: string | null = await SecureStore.getItemAsync(key).catch(() => null);
  
  if (!rawData) return false;
  
  const data: AttemptData = JSON.parse(rawData);

  // If lockedUntil is null, not locked
  if (data.lockedUntil === null) return false;

  // Check if lockout has expired
  if (Date.now() > data.lockedUntil) {
    // Reset lockedUntil to null and save
    data.lockedUntil = null;
    await SecureStore.setItemAsync(key, JSON.stringify(data));
    return false;
  }

  return true;
}

export async function getRemainingLockoutTime(email: string): Promise<number> {
  const key = getKey(email);
  
  // Read AttemptData from SecureStore
  const rawData: string | null = await SecureStore.getItemAsync(key).catch(() => null);
  
  if (!rawData) return 0;

  const data: AttemptData = JSON.parse(rawData);

  // If no lockedUntil, return 0
  if (data.lockedUntil === null) return 0;

  // Return remaining time in seconds
  return Math.max(0, Math.floor((data.lockedUntil - Date.now()) / 1000));
}

export async function resetAttempts(email: string): Promise<void> {
  const key = getKey(email);
  
  // Delete the SecureStore entry using getKey(email)
  await SecureStore.deleteItemAsync(key);
}