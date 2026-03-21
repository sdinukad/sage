[← Back to Overview](../README.md)

# Sage UI Redesign Handoff

The Sage mobile web UI has been completely redesigned to align with the premium "Sage" brand identity. This redesign focuses on a mobile-first, professional, and dark-themed aesthetic with serif typography and smooth interactions.

## Key Changes

### 1. Global Styles & Foundations
- **Color Palette**: Implemented `--sage-*` (greens) and `--ink-*` (grayscale) variables.
- **Typography**: Integrated **DM Serif Display** for headings and **DM Sans** for body text.
- **Safe Areas**: Added support for `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to ensure compatibility with modern mobile devices (iPhone notch/home indicator).
- **Dark Mode**: Fully supported via CSS variables and Tailwind's `dark:` classes.

### 2. Core Components
- **MobileShell**: A unified wrapper for all protected routes, providing a sticky header, bottom navigation tabs, and a prominent Floating Action Button (FAB).
- **BottomSheet**: A reusable, native-feeling slide-up modal used for adding expenses.
- **AddExpenseModal**: completely redesigned with a large amount input, real-time AI category suggestions, and auto-dismiss after saving.
- **ChatBubble & ConfirmationCard**: Custom components for the Sage AI interface, including "thinking" animations and interactive decision cards.

### 3. Page Implementations
- **Login/Register**: A premium dual-panel layout with a dark green top panel and a white card that overlaps it.
- **Dashboard**: Features a new `HeroCard` for monthly summaries, a scrollable category breakdown, and a "Recent Expenses" list.
- **History**: Grouped expense lists by month with subtotals and horizontally scrollable category filters.
- **Chat**: Dual-mode (Ask/Edit) interface for interacting with the Sage AI.
- **Profile**: Simple and clean profile view with logout functionality.

## Technical Improvements
- **Gemini AI**: Fixed an issue where an invalid model name (`gemini-2.5-flash`) was causing API failures. The system now uses `gemini-1.5-flash` for more reliable categorization and chat responses.
- **Animations**: Added `fadeSlideUp`, `slideUp`, and `fadeIn` animations for smoother state transitions.
- **Tailwind Config**: Synchronized `tailwind.config.ts` with the new design system tokens.

## Verification
- Verified on mobile viewports (390x844).
- Verified end-to-end registration and login flow.
- Verified AI categorization suggestion logic in the Add Expense modal.

## Setup & Deployment

### Vercel Deployment
1. Push the `/web` directory to GitHub.
2. In Vercel, select the `/web` root directory.
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (Server-side)

### Local Development
1. Navigate to `/web`.
2. Run `npm install` and `npm run dev`.

---
*Sage - Your money, made clear.*
