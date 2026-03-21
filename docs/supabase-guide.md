# Supabase Beginner's Guide & Migration Notes

Welcome to Supabase! Think of it as an "all-in-one" backend that gives you a database, authentication, and file storage out of the box. Since you're new to it, here’s a breakdown of the key concepts you'll need for Sage.

## 1. What is Supabase?
At its core, Supabase is a suite of tools built around **PostgreSQL** (a very powerful database). 
-   **Auth**: Handles user logins, signups, and magic links.
-   **Database**: Stores your expenses, incomes, and profiles.
-   **Realtime**: Lets your app listen for database changes instantly.

## 2. What are "Migrations"?
Migrations are like "Version Control for your Database." Instead of manually clicking buttons in a dashboard to create tables, you write SQL scripts.

**Why bother?**
-   **Consistency**: You can recreate your exact database structure on a new project (e.g., moving from local to "Beta").
-   **Safety**: You have a history of every change made to the schema.
-   **Teamwork**: Other developers (or agents!) can run your migrations to get the same setup.

## 3. How to handle Migrations in Sage
In a standard Supabase project, migrations are `.sql` files found in a `supabase/migrations` folder. 

### How to apply them:
1.  **Dashboard SQL Editor**: 
    -   Open your Supabase Project Dashboard.
    -   Go to **SQL Editor**.
    -   Paste the contents of your migration `.sql` file and click **Run**.
2.  **Supabase CLI (Advanced)**:
    -   If you have the CLI installed, you can run `supabase db push` to push all local migrations to your hosted project.

## 4. Row Level Security (RLS)
This is the most important concept for Sage. RLS ensures that **User A cannot see User B's expenses**.

-   **The Policy**: In your migrations, you'll see lines like:
    ```sql
    CREATE POLICY "Users can view their own expenses" 
    ON expenses FOR SELECT 
    USING (auth.uid() = user_id);
    ```
-   **Crucial for Beta**: When you host your app, RLS *must* be enabled on every table. Otherwise, anyone with your public "Anon Key" could potentially read all data.

---

## 5. Environment Setup for Hosting
When you deploy Sage to Railway or Vercel, you'll need two things from your Supabase Dashboard (**Settings > API**):
1.  `NEXT_PUBLIC_SUPABASE_URL`: Your project's unique URL.
2.  `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public API key.

> [!IMPORTANT]
> Never share your **Service Role Key**. It bypasses all security (RLS) and should only be used in private, server-side environments if absolutely necessary.
