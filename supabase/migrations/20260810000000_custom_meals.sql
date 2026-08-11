-- User-defined quick-add meals (Settings > Nutrition > Custom Meals). Each
-- row is just a name + calorie count the user enters once, then reuses as a
-- one-tap chip in the Log Meal sheet's quick add row instead of retyping the
-- same meal every time. Deliberately minimal (no macros/meal_type) to match
-- what the settings screen actually collects — see src/app/custom-meals.tsx.

create table public.custom_meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  calories    integer not null,
  created_at  timestamptz default now()
);

alter table public.custom_meals enable row level security;

create policy "Users manage own custom meals"
  on public.custom_meals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS policies alone aren't enough — Postgres still checks table-level
-- privileges before RLS is evaluated. The rest of this schema was
-- reconstructed from a live project (see baseline_schema.sql) whose default
-- privileges already covered every pre-existing table, so this grant was
-- never needed until now. Explicit here so a fresh project reproduces it.
grant select, insert, update, delete on public.custom_meals to authenticated;
