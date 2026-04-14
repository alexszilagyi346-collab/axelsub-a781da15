# AxelSub - Anime Streaming Platform

A Hungarian anime streaming platform with subtitles ("Magyar feliratú animék egy helyen").

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend/Auth/DB**: Supabase (existing project: `zdwhtyeqhhplpyqmnyiz`)
- **Data Fetching**: TanStack React Query
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form + Zod

## Project Structure

```
src/
  App.tsx          - Root component with routes
  pages/           - Page components (Index, Browse, AnimeDetail, Admin, Profile, History, News)
  components/      - Reusable UI components (player, episode list, comments, etc.)
  hooks/           - Custom React hooks (useAuth, useAnimes, useWatchHistory, etc.)
  integrations/
    supabase/      - Supabase client and auto-generated types
  types/           - TypeScript type definitions
supabase/
  migrations/      - Database schema SQL migrations (applied to Supabase project)
  functions/       - Supabase Edge Functions (og-image)
```

## Running the App

```bash
npm run dev
```

Starts the Express SSR server (with Vite middleware in dev mode) on port 5000. The server handles:
- Bot/crawler requests: injects OG meta tags dynamically from Supabase
- All other requests: served by Vite dev server with HMR

For production: `npm run build` then `npm start` (serves built `dist/` via sirv).

## Environment Variables

Set in Replit's environment system (shared):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

## Key Features

- User authentication (Supabase Auth)
- Anime browsing and search with advanced filters
- Video player with subtitle support, multiple quality levels, OP/ED skip
- Episode management
- Watch history, favorites, watchlist
- Comment system with replies
- Ratings (1-10 scale)
- Notifications & subscriptions
- Admin panel (role-based access)
- News posts
- Site settings management

## Database

Managed by Supabase. Schema defined in `supabase/migrations/`. Tables include:
`animes`, `episodes`, `profiles`, `user_roles`, `watch_history`, `favorites`, `watchlist`, `comments`, `ratings`, `notifications`, `anime_subscriptions`, `news_posts`, `site_settings`

## Deployment

Build: `npm run build` → outputs to `dist/`
The app is a static SPA — deploy as a static site.
