# Hi Spot — Campus 3D Map Event Participation PWA

Hi Spot is a location-based event participation web app that displays campus events on a 3D map. Users receive push notifications for nearby events, can join events within a geofence radius, and earn points through photo verification.

## Features

- **3D Campus Map**: Mapbox GL JS with 3D building extrusion
- **Real-time Updates**: Supabase Realtime for instant participation count updates
- **Geofencing**: Join events only when within specified radius
- **First-Come-First-Served**: Concurrent participation with SELECT FOR UPDATE
- **Photo Verification**: Upload proof photos to earn points
- **Push Notifications**: FCM notifications for nearby events
- **PWA**: Installable on mobile devices with offline support

## Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS 4**
- **Mapbox GL JS** for 3D maps
- **Firebase** for FCM push notifications

### Backend
- **Supabase**
  - PostgreSQL database
  - Edge Functions (Deno/TypeScript)
  - Realtime (Postgres Changes)
  - Storage (proof images)

## Project Structure

```
hi-spot/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # Root layout with PWA setup
│   │   ├── page.tsx             # Main map page
│   │   └── firebase-config.js/  # Firebase config API route
│   ├── components/
│   │   ├── map/                 # Map-specific components
│   │   │   ├── MapView.tsx      # Mapbox 3D map container
│   │   │   ├── EventPin.tsx     # Event markers
│   │   │   └── EventPopup.tsx   # Pin tap popup
│   │   ├── event/               # Event domain components
│   │   │   ├── EventDetailPanel.tsx  # Bottom sheet detail view
│   │   │   └── ProofUpload.tsx       # Photo verification UI
│   │   └── ServiceWorkerRegistrar.tsx
│   ├── hooks/
│   │   ├── useMap.ts            # Mapbox instance context
│   │   ├── useEvents.ts         # Event list + Realtime
│   │   ├── useGeolocation.ts    # GPS tracking
│   │   ├── useJoinEvent.ts      # Join event flow
│   │   ├── useUploadProof.ts    # Photo upload flow
│   │   └── useFCMToken.ts       # FCM token management
│   ├── lib/
│   │   ├── api.ts               # Edge Function wrappers
│   │   ├── haversine.ts         # Distance calculation
│   │   ├── constants.ts         # Map config & colors
│   │   ├── firebase.ts          # Firebase SDK setup
│   │   └── supabase/
│   │       └── client.ts        # Supabase browser client
│   └── types/
│       └── index.ts             # Shared TypeScript types
├── supabase/
│   ├── migrations/              # Database schema
│   │   ├── 20250101000000_initial_schema.sql
│   │   ├── 20250101000001_get_nearby_users_rpc.sql
│   │   ├── 20250101000002_lazy_close_and_haversine_rpcs.sql
│   │   ├── 20250101000003_join_event_rpc.sql
│   │   ├── 20250101000004_upload_proof_rpc.sql
│   │   └── 20250101000005_verify_point_rpc.sql
│   └── functions/               # Edge Functions
│       ├── update-location/
│       ├── create-event/
│       ├── list-active-events/
│       ├── check-geofence/
│       ├── join-event/
│       ├── upload-proof/
│       └── verify-point/
└── public/
    ├── manifest.json            # PWA manifest
    └── firebase-messaging-sw.js # FCM service worker
```

## Setup

### Prerequisites

- Node.js 18+
- Supabase CLI
- Mapbox account (for API token)
- Firebase project (for FCM)

### Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# FCM (for Edge Functions)
FCM_SERVER_KEY=your_fcm_server_key
```

### Installation

```bash
# Install dependencies
npm install

# Start Supabase locally
supabase start

# Apply migrations
supabase db push

# Create Storage bucket
supabase storage create proof-images

# Deploy Edge Functions
supabase functions deploy update-location
supabase functions deploy create-event
supabase functions deploy list-active-events
supabase functions deploy check-geofence
supabase functions deploy join-event
supabase functions deploy upload-proof
supabase functions deploy verify-point

# Set Edge Function secrets
supabase secrets set FCM_SERVER_KEY=your_fcm_server_key

# Run development server
npm run dev
```

## API Endpoints

### Edge Functions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/update-location` | PATCH | Update user GPS location |
| `/create-event` | POST | Create event + send FCM notifications |
| `/list-active-events` | GET | Get active events (with Lazy Close) |
| `/check-geofence` | POST | Verify user is within event radius |
| `/join-event` | POST | Join event (first-come-first-served) |
| `/upload-proof` | POST | Upload photo + earn points |
| `/verify-point` | POST | Admin approve/reject points |

## Database Schema

### Tables

- **users**: User profiles with location and FCM token
- **events**: Events with geofence and slot limits
- **participations**: User-event join records
- **point_logs**: Point transaction history

### Key Features

- **Lazy Close**: Expired events auto-close on query
- **Haversine Distance**: PostGIS-free coordinate distance calculation
- **SELECT FOR UPDATE**: Concurrent participation control
- **Point Pre-allocation**: Points awarded immediately, verified later

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 3D Map | Mapbox GL JS Standard | Built-in 3D building extrusion |
| Distance Calc | Haversine (SQL + JS) | No PostGIS needed, sufficient accuracy |
| Expiry | Lazy Close (server) | No pg_cron, client never judges expiry |
| Concurrency | SELECT FOR UPDATE | PostgreSQL native, no extra infra |
| Points | Pre-allocate + verify | Immediate user reward experience |
| Realtime | Supabase Postgres Changes | Built-in, merge-only updates |
| Push | FCM (not Web Push) | Firebase SDK integration |
| Auth | None (user_id based) | Hackathon MVP scope |

## User Flow

1. **Notification**: User receives FCM push for nearby event
2. **Map View**: Tap notification → see 3D map with event pins
3. **Event Detail**: Tap pin → popup → detail panel
4. **Geofence Check**: Panel checks if user is within radius
5. **Join**: User joins event (first-come-first-served)
6. **Photo Proof**: Upload photo to verify participation
7. **Points**: Earn points immediately (admin verifies later)
8. **Realtime**: Other users see updated slot count instantly

## Development

### Run Tests

```bash
# TypeScript check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

### Local Development

```bash
# Start Supabase
supabase start

# Start Next.js dev server
npm run dev

# View Supabase Studio
supabase studio
```

## Deployment

### Vercel (Frontend)

```bash
vercel --prod
```

### Supabase (Backend)

```bash
# Link to production project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Deploy functions
supabase functions deploy --no-verify-jwt
```

## MVP Scope

### Included
- 3D campus map with event pins
- Geofenced event participation
- Photo verification
- Real-time slot updates
- FCM push notifications
- PWA installation

### Excluded (Future)
- User authentication
- Admin dashboard UI
- Custom 3D building models
- Event recommendations
- Chat/comments
- Payment/deposits
- Multi-language support

## License

MIT

## Credits

Built for Kirothon hackathon using Kiro spec-driven development.
