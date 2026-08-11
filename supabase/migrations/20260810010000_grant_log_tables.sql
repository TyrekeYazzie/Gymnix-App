-- Defensive grant for the five original log tables (workouts, calorie_logs,
-- cardio_logs, water_logs, weight_logs). Insert/select already work today,
-- so those privileges clearly exist from whatever default-privilege setup
-- happened at project bootstrap (see baseline_schema.sql) — but that setup
-- predates version control, so it's unverified whether it ever covered
-- update/delete too. custom_meals (20260810000000_custom_meals.sql) showed
-- that this project's default privileges don't reliably extend to new
-- needs, so as we add edit/delete UI for every log type, grant explicitly
-- rather than assume. Safe to run even if these were already granted.
grant select, insert, update, delete on public.workouts     to authenticated;
grant select, insert, update, delete on public.calorie_logs to authenticated;
grant select, insert, update, delete on public.cardio_logs  to authenticated;
grant select, insert, update, delete on public.water_logs   to authenticated;
grant select, insert, update, delete on public.weight_logs  to authenticated;
