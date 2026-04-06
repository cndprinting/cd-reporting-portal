# C&D Reporting Portal

Campaign Performance Dashboard for C&D Printing (cndprinting.com).

Track direct mail and digital campaign performance across all channels — mail tracking, call tracking, Google Ads, Facebook/Instagram Ads, behavioral ads, Gmail Ads, YouTube Ads, and QR codes.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom components built on Radix UI primitives
- **Icons**: Lucide React
- **Charts**: Recharts
- **ORM**: Prisma 7
- **Database**: PostgreSQL
- **Auth**: Custom email/password (NextAuth-ready)

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (or use the demo mode which runs without a database)

### Installation

```bash
npm install
```

### Demo Mode (No Database Required)

The app runs with demo data by default. Just start the dev server:

```bash
npm run dev
```

Visit http://localhost:3000 and log in with any credentials (auth is bypassed in demo mode). The app is pre-loaded with:

- 3 sample companies
- 5 campaigns across all channels
- 35-60 days of daily metrics
- All dashboard pages functional

### Production Setup (With Database)

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Update `DATABASE_URL` in `.env` with your PostgreSQL connection string.

3. Generate the Prisma client:
```bash
npm run db:generate
```

4. Push the schema to your database:
```bash
npm run db:push
```

5. Seed the database with demo data:
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

### Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@cndprinting.com | demo123 | Admin |
| manager@cndprinting.com | demo123 | Account Manager |
| john@sunshinerealty.com | demo123 | Customer |
| lisa@palmcoastins.com | demo123 | Customer |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup, forgot password
│   ├── (dashboard)/     # All authenticated pages
│   │   └── dashboard/
│   │       ├── overview/       # Main dashboard
│   │       ├── campaigns/      # Campaign list & detail
│   │       ├── mail-tracking/  # Channel pages
│   │       ├── call-tracking/
│   │       ├── google-ads/
│   │       ├── facebook-ads/
│   │       ├── behavioral-ads/
│   │       ├── gmail-ads/
│   │       ├── youtube-ads/
│   │       ├── qr-codes/
│   │       ├── admin/          # Admin area
│   │       ├── settings/
│   │       ├── reports/
│   │       └── orders/
│   └── api/             # API routes
├── components/
│   ├── ui/              # Reusable UI primitives
│   ├── layout/          # Sidebar, topbar, app shell
│   └── dashboard/       # KPI cards, charts, tables
├── lib/
│   ├── prisma.ts        # Database client
│   ├── auth.ts          # Auth utilities
│   ├── utils.ts         # Formatting helpers
│   ├── demo-data.ts     # Demo/seed data generator
│   └── services/        # Data adapter pattern
└── generated/           # Prisma generated client
```

## Roles & Permissions

| Role | Access |
|------|--------|
| **Admin** | Full access to all accounts, users, campaigns, and admin tools |
| **Account Manager** | Manage assigned customer accounts and their campaigns |
| **Customer** | View-only access to their own company's data |

## Connecting Real Data Sources

The app uses a services/adapter pattern (`src/lib/services/base-adapter.ts`) designed for easy integration with real APIs:

- **Direct Mail**: Connect your mail tracking vendor API
- **Google Ads**: Google Ads API integration
- **Meta Ads**: Facebook/Instagram Marketing API
- **Call Tracking**: CallRail, CallTrackingMetrics, etc.
- **QR Analytics**: Your QR code platform API
- **CRM**: Internal order/CRM systems

Each adapter implements the `DataAdapter` interface. Swap demo implementations with real API calls in the adapter factory.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Prisma Studio |

## Environment Variables

See `.env.example` for all available configuration options.
