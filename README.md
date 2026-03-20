# Sage

Multi-platform AI expense tracker.

## Project Structure

- `web/`: Next.js web application.
- `shared/`: Shared TypeScript models and Gemini AI helpers.


## Setup & Database

### Supabase Details
- **Project URL:** `https://your-project.supabase.co`
- **Publishable Key:** `your-anon-key`

### Database Schema
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

CREATE TABLE incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Salary','Bonus','Investment','Gift','Other'
  )),
  note TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

