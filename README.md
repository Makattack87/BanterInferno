# Top Bins Tipping League

A Premier League score-tipping game for a group of friends. Players predict the score of every match each gameweek, earn points for how close they get, and climb a leaderboard.

**Live site:** https://makattack87.github.io/BanterInferno/

## How the game works

- Each gameweek, predict the score of every match before the **first kick-off** of the round. Tips then lock.
- **Scoring:** 3 points for an exact score, 1 point for the correct result (win/draw/loss), 0 otherwise.
- **Joker:** play it on a round to double that round's points (see [Known limitations](#known-limitations)).
- Everyone's tips for a match are hidden until it kicks off, then revealed.

## Features

- Dashboard with countdown to the tip deadline, rank, tips status and next kick-off
- Fixtures and predictions entry, with quick-pick buttons for home win, draw and away win
- Upcoming fixtures by gameweek, filterable by club, shown in the viewer's local time
- Leaderboard and a Premier League table snapshot
- Results with a plain-English explanation of each score
- Statistics and a season performance chart
- Club colour themes, plus light and dark mode
- Mobile-friendly layout

## Tech stack

- Plain HTML, CSS and JavaScript. There is no build step and no framework.
- [Supabase](https://supabase.com) for the database (Postgres), Row Level Security and anonymous authentication, loaded with `supabase-js` from a CDN
- [GitHub Pages](https://pages.github.com) for hosting
- Font Awesome and Google Fonts (Manrope, Inter)

## Project structure

```
index.html   Page markup and script includes
style.css    All styling, including light/dark and club themes
app.js       All application logic
```

`app.js` is organised in numbered sections:

| Section | What it holds |
| --- | --- |
| 1. Data | The `DB` object: sample data and the shape of the data the app expects |
| 2. Data access layer | Supabase client and the `API` object |
| 3. State and helpers | Shared state, formatting, scoring |
| 4–10 | Navigation, views (dashboard, fixtures, leaderboard, results, stats), club colours, theme |
| 11. Init | Loads data from Supabase, then renders every view |

### How data flows

The app keeps a synchronous in-memory cache (`DB`) so every render function stays simple. Supabase is read and written through the `API` object:

- `API.loadFixtures()` loads all fixtures (and any results) into `DB.fixtures` and `DB.results` once at startup.
- `API.loadMyTips()` loads the signed-in player's saved tips. This round's tips fill the entry form, and past rounds replace the sample tips.
- `API.saveTips()` upserts one row per fixture into the `tips` table.
- `getFixtures()`, `getResults()` and `getMyTips()` read from the cache.

`init()` runs `loadFixtures()` first, then `loadMyTips()`. If tips fail to load, the app keeps working with sample data and logs a warning.

### What is live and what is sample data

| Data | Source |
| --- | --- |
| Fixtures and kick-off times | Supabase `fixtures` |
| Results | Supabase `fixtures` (`home_goals` / `away_goals`) |
| Your tips and Joker | Supabase `tips` |
| Other players, leaderboard, activity feed, season stats, Premier League table | Sample data in `DB` |

## Setup

### 1. Create a Supabase project

Create a project at supabase.com, then open the **SQL Editor**.

### 2. Create the tables

```sql
-- Fixtures
create table public.fixtures (
  id          bigint generated always as identity primary key,
  gameweek    smallint    not null check (gameweek > 0),
  kickoff     timestamptz not null,                                  -- stored in UTC
  home        text        not null check (char_length(home) = 3),    -- team code, e.g. 'ARS'
  away        text        not null check (char_length(away) = 3),
  home_goals  smallint    check (home_goals >= 0),                   -- null until played
  away_goals  smallint    check (away_goals >= 0),
  constraint fixtures_teams_differ check (home <> away),
  constraint fixtures_goals_paired check ((home_goals is null) = (away_goals is null)),
  constraint fixtures_unique_match unique (gameweek, home, away)
);

create index fixtures_gameweek_kickoff_idx on public.fixtures (gameweek, kickoff);

alter table public.fixtures enable row level security;
grant usage on schema public to anon, authenticated;
grant select on public.fixtures to anon, authenticated;

create policy "Fixtures are publicly readable"
  on public.fixtures for select
  to anon, authenticated
  using (true);

-- Tips
create table public.tips (
  user_id    uuid     not null default auth.uid() references auth.users(id) on delete cascade,
  fixture_id bigint   not null references public.fixtures(id) on delete cascade,
  home       smallint not null check (home between 0 and 20),
  away       smallint not null check (away between 0 and 20),
  joker      boolean  not null default false,
  primary key (user_id, fixture_id)
);

-- True until the first kick-off of the fixture's gameweek
create or replace function public.round_is_open(fid bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select now() < (
    select min(k.kickoff) from public.fixtures k
    where k.gameweek = (select f.gameweek from public.fixtures f where f.id = fid)
  );
$$;
grant execute on function public.round_is_open(bigint) to authenticated;

alter table public.tips enable row level security;
grant select, insert, update on public.tips to authenticated;

create policy "Read own tips" on public.tips
  for select to authenticated
  using (user_id = auth.uid());

create policy "Insert own tips while round open" on public.tips
  for insert to authenticated
  with check (user_id = auth.uid() and public.round_is_open(fixture_id));

create policy "Update own tips while round open" on public.tips
  for update to authenticated
  using (user_id = auth.uid() and public.round_is_open(fixture_id))
  with check (user_id = auth.uid() and public.round_is_open(fixture_id));
```

Then add your fixtures, either with `insert` statements or in the Table Editor. Team codes must match the keys of `DB.teams` in `app.js` (for example `ARS`, `MCI`, `LIV`).

### 3. Turn on anonymous sign-ins

In your Supabase project, open the Authentication settings and enable **Allow anonymous sign-ins**. Without this, tips cannot be saved.

### 4. Add your project details to `app.js`

In section 2 of `app.js`:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
const SUPABASE_KEY = 'YOUR-PUBLISHABLE-OR-ANON-KEY';
```

- The URL ends at `.supabase.co`. Do not add `/rest/v1/`, because the library adds it.
- Use the **publishable** (or legacy **anon**) key. It is designed to be public, and Row Level Security protects the data.
- **Never** commit the `secret` or `service_role` key.

### 5. Run it locally

Serve the folder with any static server and open the printed address:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000. Opening `index.html` directly from disk is not recommended, because browser storage and sign-in can behave differently on `file://` addresses.

## Deployment

The site is served by GitHub Pages from the `main` branch.

1. Commit your changes to `main`.
2. Wait for the **pages build and deployment** run in the **Actions** tab to show a green tick (about a minute).
3. Hard refresh the site (Ctrl+Shift+R, or Cmd+Shift+R on Mac) so the browser does not use a cached `app.js`.

## Running the league week to week

**Add or change fixtures:** edit the `fixtures` table in the Supabase Table Editor, then refresh the site. The app reads fixtures when the page loads, so changes appear on the next load. Kick-off times are stored in UTC and shown in each viewer's local time.

**Enter results** once a match finishes. Set both scores together:

```sql
update public.fixtures
set home_goals = 2, away_goals = 1
where gameweek = 12 and home = 'NFO' and away = 'CHE';
```

**Open the next round:** change `gameweek` in `DB.competition` in `app.js`, commit, and deploy. This value decides which round is open for tipping.

## Security model

- Row Level Security is enabled on both tables. Fixtures are readable by anyone. Tips are readable and writable only by the player who owns them.
- The tip lock is enforced in the database (`round_is_open`), not just in the browser. Once the first match of a round kicks off, inserts and updates for that round are rejected.
- The publishable key in `app.js` is public by design. Access is controlled by the policies above.

## Known limitations

- **Identity is per browser.** Players sign in anonymously, so a player's identity lives in that browser's local storage. Clearing site data, switching devices, or using a different browser creates a new player, and the old tips cannot be reached from it. A real login would fix this.
- **Other players are sample data.** The leaderboard, rankings, activity feed and "Everyone's tips" for other players are not yet calculated from real tips.
- **Joker is saved but not scored.** It is stored on each tip row and restored on reload, but scoring does not double points yet, and nothing stops a Joker being played every round.
- **Results are entered by hand** in Supabase.
- **The current gameweek is set in code** (`DB.competition.gameweek`).
- **Fixtures load once per page load,** so there is no live update.

## Roadmap

- Real sign-in (for example an email magic link) so tips follow a player across devices
- Scoring and a leaderboard calculated from real tips and results
- Joker rules: one per season, and doubled points in scoring
- Showing real players' tips after kick-off
- Optional: results and fixtures loaded automatically from a data feed

## Troubleshooting

Open the browser developer tools (F12) and check the **Console** and **Network** tabs.

| Symptom | Likely cause and fix |
| --- | --- |
| "Couldn't load fixtures" on the page | Read the Console error. See the rows below. |
| `404` on a `rest/v1/rest/v1/fixtures` request | `SUPABASE_URL` still ends in `/rest/v1/`. End it at `.supabase.co`. |
| `permission denied for table fixtures` (code `42501`) | The `anon` role has no table access. Run `grant select on public.fixtures to anon, authenticated;`. |
| `Anonymous sign-ins are disabled` | Enable anonymous sign-ins in the Supabase Authentication settings. |
| "Couldn't save your tips" | Anonymous sign-ins are off, or the round has locked. Check the Console error. |
| Changes do not appear after deploying | Hard refresh, or open the site in a private window to skip the cache. |
| `Cannot read properties of undefined (reading 'createClient')` | The `supabase-js` script tag is missing from `index.html`, or is not above `app.js`. |
