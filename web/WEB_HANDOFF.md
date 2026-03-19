# Web Deployment Handoff

## Vercel Deployment Steps
1. Push the `/web` directory to a new GitHub repository or use the existing monorepo.
2. In the Vercel dashboard, create a new project and select the `/web` root directory.
3. Add the following Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: `YOUR_PROJECT_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Found in Supabase dashboard)
   - `GEMINI_API_KEY`: (Your Google AI API Key)
4. Deploy!

## Local Development
1. Navigate to `/web`.
2. Ensure `.env.local` has valid credentials.
3. Run `npm install` and `npm run dev`.

## Notes
- All AI logic is handled via server-side API routes for security.
- The `GEMINI_API_KEY` is never exposed to the client.
- RLS policies in Supabase handle data security automatically.
