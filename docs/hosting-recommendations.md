# Hosting Recommendations (Alpha/Beta)

To avoid the "slow cold start" issue common with serverless platforms like Vercel, I recommend using a **persistent hosting provider**. This ensures your Sage AI model (ONNX) stays loaded in memory and responds instantly.

## 1. Railway (Top Choice for Performance)
Railway runs your application as a persistent service, meaning it's always "on" and ready to respond.

-   **Why it's better for Sage**: 
    -   The ONNX model (~5MB) is loaded once when the server starts and remains in memory.
    -   No "cold start" delay (which can be 2-5 seconds on Vercel).
    -   Excellent developer experience (similar to Vercel/Netlify but for persistent containers).
-   **Cost**: Free trial available, then typically ~$5/month based on usage.
-   **Setup**: 
    1. Connect your GitHub repo.
    2. Railway will detect the Next.js project and suggest a "Service".
    3. **Important (Monorepo)**: Since the app is in the `/web` folder, make sure the `Root Directory` in your Railway Service settings is set to `/web`. I have added a `railway.json` to the root of the project to automate this for you.
    4. Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the service environment variables.

### Will the Railway Free Tier work?
**Yes!** Here is why:
-   **0.5 GB RAM (512MB)**: Next.js typically uses ~200MB. Our tiny BERT-based ONNX model is only 5MB and very efficient. Even during inference, the RAM usage will stay well within 512MB.
-   **0.5 GB Volume Storage**: We use Supabase for persistent data, so we don't need much disk space on Railway itself. 0.5GB is plenty for the app code and the 5MB model file.

## 2. Render
Render is another great persistent host with a very clean interface.

-   **Pros**: 
    -   Simple "Web Service" setup for Node.js/Next.js.
    -   Free tier available (but it spins down after 15 mins of inactivity—so use the "Starter" plan for no cold starts).
-   **Cons**: The free tier itself has cold starts, so you'd need the paid tier ($7/month) to avoid them.

## 3. Fly.io
Fly.io is fantastic if you want your app to be geographically close to your users (Edge), but it has a steeper learning curve (requires a `fly.toml` config).

---

## Comparison at a Glance

| Feature | Vercel (Serverless) | Railway (Persistent) | Render (Persistent) |
| :--- | :--- | :--- | :--- |
| **Cold Starts** | Yes (Slow first request) | **No (Instant)** | **No (Instant on paid)** |
| **AI Model Loading** | Every cold start | Once on deployment | Once on deployment |
| **Ease of Use** | 10/10 | 9/10 | 9/10 |
| **Free Tier** | Very generous | Credit-based | Limited (has cold starts) |

**Recommendation**: Go with **Railway**. It hits the sweet spot between ease of use and the persistent performance you're looking for.
