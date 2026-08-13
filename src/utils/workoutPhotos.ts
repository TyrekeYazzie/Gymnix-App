import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';

const BUCKET = 'workout-photos';

// Signed URLs are only needed for as long as a screen has them on-screen;
// this covers a full app session comfortably without re-signing on every render.
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

async function launchCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera access needed', 'Enable camera access in Settings to take a workout photo.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.6,
  });
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

async function launchLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photo access needed', 'Enable photo library access in Settings to attach a photo.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.6,
  });
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

// Shows the take-photo / choose-from-library / cancel prompt and returns the
// local file:// URI the user picked, or null if they backed out at any point.
export function pickWorkoutPhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Add a photo',
      'Capture today’s session',
      [
        { text: 'Take Photo', onPress: () => launchCamera().then(resolve) },
        { text: 'Choose from Library', onPress: () => launchLibrary().then(resolve) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

// Uploads a local photo for a specific workout and returns the storage path
// to save on that workout row (not a URL — the bucket is private, so display
// goes through getSignedPhotoUrls instead).
export async function uploadWorkoutPhoto(
  userId: string,
  workoutId: string,
  localUri: string
): Promise<string | null> {
  try {
    const bytes = await new File(localUri).bytes();
    const path = `${userId}/${workoutId}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) {
      console.error('Failed to upload workout photo:', error.message);
      return null;
    }
    return path;
  } catch (err) {
    console.error('Failed to read workout photo file:', err);
    return null;
  }
}

// Deletes every workout photo this user has stored. Called right before
// account deletion — Storage objects aren't covered by the auth.users
// cascade that cleans up the rest of a deleted account's data (see
// supabase/migrations/20260812000000_delete_own_account.sql), so they'd
// otherwise be orphaned (unreachable, but still taking up storage).
// Best-effort: failures are logged, not thrown, so a storage hiccup never
// blocks the user from actually deleting their account.
export async function deleteAllWorkoutPhotos(userId: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).list(userId);
  if (error) {
    console.error('Failed to list workout photos for deletion:', error.message);
    return;
  }
  if (!data || data.length === 0) return;
  const paths = data.map((file) => `${userId}/${file.name}`);
  const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
  if (removeError) {
    console.error('Failed to delete workout photos:', removeError.message);
  }
}

// Batch-resolves storage paths to short-lived signed URLs for display.
export async function getSignedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error('Failed to sign workout photo URLs:', error?.message);
    return {};
  }
  const map: Record<string, string> = {};
  for (const entry of data) {
    if (entry.path && entry.signedUrl && !entry.error) map[entry.path] = entry.signedUrl;
  }
  return map;
}
