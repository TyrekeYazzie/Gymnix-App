-- Lets a user attach one photo per workout session. The calendar shows the
-- most recently-logged photo for a day as a corner thumbnail (computed
-- client-side from the workouts already loaded for the month — no new
-- column needed for that "latest wins" rule).
--
-- Photos are stored in a private bucket, one object per workout at
-- "{user_id}/{workout_id}.jpg", and served to the app via short-lived
-- signed URLs rather than public URLs.

alter table public.workouts
  add column photo_path text;

insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', false)
on conflict (id) do nothing;

create policy "Users can upload their own workout photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own workout photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can replace their own workout photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own workout photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
