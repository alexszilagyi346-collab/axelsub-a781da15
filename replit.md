# AxelSub - Anime Streaming Platform

A Hungarian anime streaming platform with subtitles ("Magyar feliratú animék egy helyen").

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend/Auth/DB**: Supabase (existing project: `zdwhtyeqhhplpyqmnyiz`)
- **Data Fetching**: TanStack React Query
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form + Zod
- **Server**: Express (Node.js) for SSR/OG tag injection

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
server/
  index.mjs        - Express server: handles bot/crawler OG tag injection + serves Vite in dev
supabase/
  migrations/      - Database schema SQL migrations (applied to the Supabase project)
  functions/       - Supabase Edge Functions (og-image — deployed separately to Supabase)
```

## Running the App

```bash
npm run dev
```

Starts the Express SSR server (with Vite middleware in dev mode) on port 5000. The server handles:
- Bot/crawler requests (Facebook, Discord, Twitter, etc.): injects OG meta tags dynamically fetched from Supabase
- All other requests: served by Vite dev server with HMR

For production: `npm run build` then `npm start` (serves built `dist/` via sirv).

## Environment Variables

Set in Replit's environment system (shared) — do not hardcode these:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key (safe to expose in browser)
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
- Admin panel (role-based access: admin, moderator, shop_manager)
- Manga reader with chapters
- Anime/episode request system
- Shop (products, orders, settings)
- News posts
- Site settings management

## Database

Managed by Supabase. Schema defined in `supabase/migrations/`. Key tables:
`animes`, `episodes`, `profiles`, `user_roles`, `watch_history`, `favorites`, `watchlist`,
`comments`, `ratings`, `notifications`, `anime_subscriptions`, `news_posts`, `site_settings`,
`mangas`, `manga_chapters`, `anime_requests`, `shop_products`, `shop_orders`, `shop_order_items`, `shop_settings`

## Deployment

Build: `npm run build` → outputs to `dist/`
Start: `npm start` → runs Express server serving the built files
