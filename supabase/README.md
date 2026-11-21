# Database SQL

Each file is one change to the Supabase database, run once in the SQL Editor,
in name order. A new database runs them all from 001 up. A fix to an earlier
file takes the same number plus a letter (`030b_…`), and every number is used
once (`tests/supabase-files.test.mjs`).

One-off data fixes for named players (refunds, mission repairs) are not kept
here, because this repository is public and they hold player ids. They stay in
the project's shared `admin/` folder.
