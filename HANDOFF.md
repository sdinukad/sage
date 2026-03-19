# Sage Project Handoff

## Supabase Details
- **Project URL:** `YOUR_PROJECT_URL`
- **Anon Key:** (Found in Supabase dashboard > Settings > API)
  - Legacy Anon: `YOUR_LEGACY_ANON_KEY`
  - Publishable Key: `YOUR_ANON_KEY`

## Database Schema
### Expenses Table
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Food','Transport','Bills','Entertainment','Health','Shopping','Other'
  )),
  note TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Views
- `monthly_totals`: Aggregates expenses by category and month.

## Environment Variables
Agent 2 (web) needs:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` (Server-side ONLY, never prefix with `NEXT_PUBLIC_`)

## Folder Structure
- `web/`: Next.js app
- `mobile/`: Flutter app
- `shared/`: Shared models and AI logic
  - `models.ts`: Shared TypeScript types
  - `gemini.ts`: AI helper functions

## Note on Gemini API
The `GEMINI_API_KEY` should be kept secure and used only in server-side contexts. The `gemini.ts` helpers use the `gemini-2.0-flash` model.
