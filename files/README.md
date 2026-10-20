# Hail — ride-hailing on Expo (iOS, Android, Web)

Passenger, driver and admin apps in one Expo Router codebase, backed by Supabase (Postgres + PostGIS, RLS, Realtime).

## Setup

```bash
npm install
npx expo install --fix          # aligns native package versions to your installed Expo SDK
cp .env.example .env            # fill in Supabase + Mapbox keys

supabase start                  # local stack (or create a hosted project)
psql "$DB_URL" -f supabase/schema.sql   # or put it in supabase/migrations/ and `supabase db reset`
npm run db:types                # replace the hand-written src/types/database.ts

npx expo start --web            # web
npx expo run:ios / run:android  # native (needs a dev build: background location + react-native-maps)
```

Make your first admin: sign up, then in the SQL editor
`update public.profiles set role = 'admin' where id = '<auth user uuid>';`

Drivers can't go online until an admin approves them (Fleet tab).

## How it fits together

- **Routing**: `app/_layout.tsx` holds fonts, providers and `AuthGate`, which sends each user to the route group for their `profiles.role`.
- **Writes go through SQL functions**: `request_ride` (server-side fare), `accept_ride` (atomic claim), `set_ride_status` (validated transitions). Clients can only read `rides`.
- **Realtime**: ride status (passenger + driver), driver location (`locations` upsert, one row per user), admin fleet map, SOS alerts.
- **Maps**: `RideMap.tsx` (react-native-maps) on native, `RideMap.web.tsx` (mapbox-gl) on web, same props.
- **Location**: `useDriverLocation` throttles foreground writes and starts a background task on native.

## Known gaps (deliberate scaffold limits)

- Distance/duration for fares come from the client's Mapbox call. For production, recompute in an Edge Function before `request_ride`.
- "Turn-by-turn" shows Mapbox step instructions for the next maneuver. Voice guidance and snap-to-route need the Mapbox Navigation SDK (native module).
- No driver document upload UI or vehicle form yet; the table, bucket and admin review exist.
- No payments, ratings, push notifications or driver offer expiry on the server.
- Realtime can't tell a driver that someone else claimed an offer (RLS hides the row), so offers are polled every 10 s and `accept_ride` rejects stale ones.
