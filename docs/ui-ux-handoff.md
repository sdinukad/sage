[← Back to Overview](../README.md)

# 🎨 Sage Web: UI/UX Design & Handoff Guide

Welcome to **Sage**! This guide is written for designers and UI specialists who want to make the app look and feel premium without needing to be a software engineer.

---

## 🏗️ The 20-Second Tech Stack
*   **Framework**: Next.js (The skeleton)
*   **Styling**: **Tailwind CSS** (The paint and layout)
*   **AI**: **Local Intelligence** (No external APIs like Gemini—it runs in the browser/server natively!)
*   **Database**: Supabase (Where the numbers live)

---

## 📂 The "Dressing Room" (Where to Change Looks)

If you want to change colors, fonts, spacing, or icons, looking in these **Safe Zones** is where you should spend 90% of your time:

### 🌈 1. The Global Style (`web/src/app/globals.css`)
*   **What's inside**: The core color palette (Sages, Inks, Accents) and standard fonts.
*   **Change this to**: Update the "vibe" of the whole app at once by tweaking the CSS variables at the top.

### 🧩 2. Individual Parts (`web/src/components/`)
Think of these as the LEGO bricks that build the app.
*   **`ChatBubble.tsx`**: How the AI and your messages look.
*   **`HeroCard.tsx`**: The big balance card on the dashboard.
*   **`ExpenseRow.tsx`**: How each line of spending is styled.
*   **`MobileShell.tsx`**: The navigation menu at the bottom.
*   **`ConfirmationCard.tsx`**: The card that pops up when the AI says "Should I add this?"

### 📄 3. The Full Pages (`web/src/app/(protected)/`)
*   **`dashboard/page.tsx`**: The main overview screen.
*   **`history/page.tsx`**: The scrollable list of all expenses.
*   **`chat/page.tsx`**: The chat interface.

---

## ✅ How to Change Things (The "Safe" Way)

### 1. Adjusting Looks (Easy)
Just look for `className="..."` on any element. You can add standard Tailwind classes like `text-sage-600`, `rounded-xl`, or `shadow-lg`.
> **Designer Tip**: If you want a smoother feel, add `transition-all duration-300 ease-in-out` to your classes!

### 2. Rearranging Layout (Medium)
You can move `<div>` blocks around or wrap them in new ones to change the structure.
*   **Rule of Thumb**: As long as you don't delete words starting with `onClick`, `onChange`, or `{...}`, you won't break anything!

---

## 🚫 The "Engine Room" (What NOT to Touch)

Please avoid deleting or renaming the following, as it will break the app's ability to save data or talk to the AI:

1.  **State (The logic)**: Anything that says `useState`, `useEffect`, or `useRef`. These are the "memory" of the component.
2.  **Handlers (The wiring)**: Don't delete things like `onClick={handleSubmit}` or `onChange={handleChange}`. If you move a button, make sure those `onClick` labels move with it!
3.  **Data Links**: Anything inside curly braces, like `{expense.amount}` or `{user.name}`. These are the wires connecting the database to the screen.
4.  **AI Models**: Do **not** touch the `/web/models` folder. That's the AI's actual brain file.

---

## 🎨 Design Principles for Sage
*   **Serene Sage**: Use soft greens and grounded darks. Avoid "bright" or "neon" colors.
*   **Deep Hierarchy**: Use very subtle borders (`border-sage-100/10`) and soft shadows rather than distinct lines.
*   **Alive & Responsive**: Nothing should just "appear." Use `framer-motion` (already installed!) or CSS transitions for soft fades and slides.
*   **Breathing Room**: Don't be afraid of white space. Let the data breathe with `gap-4` or `p-6` as your defaults.

---
*For technical AI training details, see [local-ai-guide.md](./local-ai-guide.md).*
