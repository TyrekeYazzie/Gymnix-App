import { supabase } from '@/lib/supabase';

// storage list() returns at most 100 entries per call by default, so cleanup
// that only lists once silently leaves everything past the first 100 behind.
const PAGE_SIZE = 100;
// A runaway guard (10,000 files), in case the server ever ignores `offset`.
const MAX_PAGES = 100;

/** Every file name directly inside `folder`, across as many pages as it takes. */
export async function listAllInFolder(bucket: string, folder: string): Promise<{ names: string[]; error: string | null }> {
  const names: string[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit: PAGE_SIZE, offset: page * PAGE_SIZE });
    if (error) return { names, error: error.message };
    names.push(...(data ?? []).map((f) => f.name));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { names, error: null };
}

/** Deletes the given paths in batches. Best effort: failures are logged, not thrown. */
export async function removeInBatches(bucket: string, paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += PAGE_SIZE) {
    const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + PAGE_SIZE));
    if (error) console.error(`Failed to delete files from ${bucket}:`, error.message);
  }
}
