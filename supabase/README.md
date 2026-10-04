# Database

`migrations/` is the source of truth for the schema, row-level security,
functions and storage buckets. Files run in filename (date) order.

**Setting up a fresh Supabase project:** open each file in `migrations/`
in order, paste it into the SQL Editor and run it. All of them replay cleanly
on an empty project.

**Changing the schema:** add a new, later-dated file to `migrations/` and
run just that file on the live project. Never edit a migration that has
already been applied.

`tests/two_account_isolation.sql` checks that one user can't read or change
another user's data. See the comments at its top for how to run it.
