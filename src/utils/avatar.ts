import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { listAllInFolder, removeInBatches } from '@/utils/storageFolders';

const BUCKET = 'avatars';

// Profile pictures are normalized on-device before upload, the way
// Instagram/YouTube handle them: square crop (the picker's crop UI), then
// downscaled to AVATAR_SIZE and re-encoded as JPEG. 400px is ~2x the
// largest place it's drawn (68pt on Profile) at 3x screen density, so it
// stays sharp everywhere while landing around 30–60 KB instead of a
// multi-MB camera photo. Re-encoding also drops EXIF (GPS, device info).
// The bucket enforces the same limits server-side (512 KB, JPEG only —
// see supabase/migrations/20260922010000_profile_avatars.sql).
const AVATAR_SIZE = 400;
const JPEG_QUALITY = 0.75;

type PickedImage = { uri: string; width: number; height: number };
export type AvatarChoice = ({ action: 'set' } & PickedImage) | { action: 'remove' } | null;

async function launchCamera(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera access needed', 'Enable camera access in Settings to take a profile photo.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1, // compression happens once, after resizing — not twice
    cameraType: ImagePicker.CameraType.front,
  });
  return result.canceled || !result.assets[0] ? null : result.assets[0];
}

// No media-library permission request here: the system photo picker only
// hands back the one image the user taps, so Expo's docs say none is needed
// for images. Asking anyway blocked users who'd denied (or only partly
// granted) full library access, even though picking would have worked.
async function launchLibrary(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  return result.canceled || !result.assets[0] ? null : result.assets[0];
}

// Take / choose / (remove, if there's one to remove) / cancel prompt.
export function pickAvatar(hasExisting: boolean): Promise<AvatarChoice> {
  return new Promise((resolve) => {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: 'Take Photo', onPress: () => launchCamera().then(img => resolve(img ? { action: 'set', ...img } : null)) },
      { text: 'Choose from Library', onPress: () => launchLibrary().then(img => resolve(img ? { action: 'set', ...img } : null)) },
    ];
    if (hasExisting) {
      buttons.push({ text: 'Remove Photo', style: 'destructive', onPress: () => resolve({ action: 'remove' }) });
    }
    buttons.push({ text: 'Cancel', style: 'cancel', onPress: () => resolve(null) });
    Alert.alert('Profile photo', undefined, buttons, { cancelable: true, onDismiss: () => resolve(null) });
  });
}

// Center-crops to a square (in case the platform's crop UI didn't enforce
// 1:1 — Android's can be freeform), scales to AVATAR_SIZE, and saves as JPEG.
async function normalizeAvatar(localUri: string, width: number, height: number): Promise<string> {
  const side = Math.min(width, height);
  const ctx = ImageManipulator.manipulate(localUri)
    .crop({ originX: (width - side) / 2, originY: (height - side) / 2, width: side, height: side })
    .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return saved.uri;
}

// Normalizes + uploads a new avatar and returns its storage path, or null on
// failure (already logged). The caller saves the path on the profile and
// only THEN calls deleteAllAvatars(userId, path) to drop the old file — so
// a failed profile update never leaves the profile pointing at nothing.
export async function uploadAvatar(userId: string, image: PickedImage): Promise<string | null> {
  try {
    const jpegUri = await normalizeAvatar(image.uri, image.width, image.height);
    const bytes = await new File(jpegUri).bytes();
    const path = `${userId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (error) {
      console.error('Failed to upload avatar:', error.message);
      return null;
    }
    return path;
  } catch (err) {
    console.error('Failed to process avatar:', err);
    return null;
  }
}

// Removes every avatar file in the user's folder except `keepPath`. Used
// after an upload (old picture), on "Remove Photo", and before account
// deletion (storage isn't covered by the auth.users cascade — same reason
// as deleteAllWorkoutPhotos). Best-effort: logs instead of throwing.
export async function deleteAllAvatars(userId: string, keepPath?: string): Promise<void> {
  const { names, error } = await listAllInFolder(BUCKET, userId);
  if (error) console.error('Failed to list avatars for cleanup:', error);
  const paths = names
    .map((name) => `${userId}/${name}`)
    .filter((p) => p !== keepPath);
  await removeInBatches(BUCKET, paths);
}

// Public bucket, so no signing — the path maps straight to a cacheable URL.
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
