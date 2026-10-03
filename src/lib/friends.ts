import { supabase } from './supabase';

// Usernames + friends — wrappers around the RPCs in
// supabase/migrations/20260923010000_friends_and_usernames.sql. Friendship
// writes are RPC-only (the table is read-only from the client) so the
// server can enforce blocks in both directions.

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

/**
 * What to call another user. The server only shares a real name with you for
 * yourself and accepted friends (see
 * supabase/migrations/20261003010000_usernames_on_public_boards.sql);
 * everyone else is shown by @username.
 */
export function displayName(u: { full_name?: string | null; username?: string | null }, fallback = 'Anonymous'): string {
  return u.full_name || (u.username ? `@${u.username}` : fallback);
}

/** Lowercases and strips anything that can't be in a username, as the user types. */
export function normalizeUsername(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

export type Relation = 'friends' | 'incoming' | 'outgoing';

export type FriendEntry = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_path: string | null;
  relation: Relation;
  since: string;
};

export type UserSearchResult = {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_path: string | null;
};

export type FriendProfile = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_path: string | null;
  total_xp: number;
  level: number;
  current_streak: number;
  workout_count: number;
  cardio_count: number;
  achievement_keys: string[];
  friends_since: string;
};

export async function isUsernameAvailable(username: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
  if (error) { console.error('Failed to check username:', error.message); return null; }
  return !!data;
}

export async function getMyFriends(): Promise<FriendEntry[]> {
  const { data, error } = await supabase.rpc('get_my_friends');
  if (error) { console.error('Failed to load friends:', error.message); return []; }
  return data ?? [];
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const { data, error } = await supabase.rpc('search_users', { p_query: query });
  if (error) { console.error('Failed to search users:', error.message); return []; }
  return data ?? [];
}

/** Returns the new relation ('outgoing' if a request was sent, 'friends' if it accepted theirs), or null on error. */
export async function sendFriendRequest(userId: string): Promise<Relation | null> {
  const { data, error } = await supabase.rpc('send_friend_request', { p_user_id: userId });
  if (error) { console.error('Failed to send friend request:', error.message); return null; }
  return data === 'accepted' ? 'friends' : 'outgoing';
}

export async function respondToFriendRequest(userId: string, accept: boolean): Promise<boolean> {
  const { error } = await supabase.rpc('respond_friend_request', { p_user_id: userId, p_accept: accept });
  if (error) { console.error('Failed to respond to friend request:', error.message); return false; }
  return true;
}

/** Unfriends, or cancels a request you sent. */
export async function removeFriend(userId: string): Promise<boolean> {
  const { error } = await supabase.rpc('remove_friend', { p_user_id: userId });
  if (error) { console.error('Failed to remove friend:', error.message); return false; }
  return true;
}

export async function getFriendProfile(userId: string): Promise<FriendProfile | null> {
  const { data, error } = await supabase.rpc('get_friend_profile', { p_user_id: userId });
  if (error) { console.error('Failed to load friend profile:', error.message); return null; }
  return data?.[0] ?? null;
}
