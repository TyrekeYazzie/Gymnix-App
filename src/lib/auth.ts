import { supabase, authStorage, AUTH_STORAGE_KEY } from './supabase';

/**
 * The one way the app signs out. Always ends with this device signed out,
 * even with no connection or Supabase down.
 *
 * supabase.auth.signOut() first asks the server to revoke the session, and
 * on any network failure it returns the error *without* clearing the local
 * session (scope 'local' included), so the user stayed logged in. When that
 * happens, delete the stored session ourselves; a second signOut() then has
 * no token to send, skips the network, clears what's left and emits
 * SIGNED_OUT so every screen updates. The server session isn't revoked in
 * that case, but this device no longer holds its tokens.
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (!error) return;
    console.warn('Server sign-out failed; signing out on this device only:', error.message);
  } catch (err) {
    console.warn('Server sign-out threw; signing out on this device only:', err);
  }
  await authStorage.removeItem(AUTH_STORAGE_KEY);
  await supabase.auth.signOut({ scope: 'local' });
}
