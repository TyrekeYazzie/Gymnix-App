-- Daily quotes become opt-in: new sign-ups start with them off and can turn
-- them on from Settings > Preferences. handle_new_user() doesn't set this
-- column, so changing the column default is all it takes. Existing users
-- keep whatever value they already have.

alter table public.profiles
  alter column daily_quotes_enabled set default false;
