import { supabase } from './supabase';

// Report + block (App Store Guideline 1.2) — see
// supabase/migrations/20260923000000_report_and_block.sql. blocker_id and
// reporter_id default to auth.uid() server-side, so they're never sent.

export type ReportReason = 'offensive_name' | 'inappropriate_photo' | 'impersonation' | 'other';

export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: 'offensive_name',      label: 'Offensive name' },
  { key: 'inappropriate_photo', label: 'Inappropriate photo' },
  { key: 'impersonation',       label: 'Pretending to be someone else' },
  { key: 'other',               label: 'Something else' },
];

export type BlockedUser = { user_id: string; username: string | null; full_name: string | null; avatar_path: string | null; blocked_at: string };

export async function reportUser(
  reportedId: string,
  reason: ReportReason,
  snapshot: { name: string | null; avatarPath: string | null },
): Promise<boolean> {
  const { error } = await supabase.from('user_reports').insert({
    reported_id: reportedId,
    reason,
    reported_name: snapshot.name,
    reported_avatar_path: snapshot.avatarPath,
  });
  if (error) { console.error('Failed to report user:', error.message); return false; }
  return true;
}

export async function blockUser(blockedId: string): Promise<boolean> {
  const { error } = await supabase.from('user_blocks').insert({ blocked_id: blockedId });
  // 23505 = already blocked; the end state is what the user asked for.
  if (error && error.code !== '23505') { console.error('Failed to block user:', error.message); return false; }
  return true;
}

export async function unblockUser(blockedId: string): Promise<boolean> {
  // RLS limits the delete to the caller's own blocks (blocker_id = auth.uid()).
  const { error } = await supabase.from('user_blocks').delete().eq('blocked_id', blockedId);
  if (error) { console.error('Failed to unblock user:', error.message); return false; }
  return true;
}

export async function getMyBlockedUsers(): Promise<BlockedUser[]> {
  const { data, error } = await supabase.rpc('get_my_blocked_users');
  if (error) { console.error('Failed to load blocked users:', error.message); return []; }
  return data ?? [];
}
