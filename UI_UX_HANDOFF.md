# Sage Web: UI/UX Handoff & Contribution Guide

Welcome to the **Sage** frontend! Sage is a premium, mobile-first AI expense tracker.
This document provides guidelines for human UI/UX designers, frontend developers, and AI agents on how to safely improve the design, animations, and user experience without breaking the underlying application logic (state, databases, and AI integrations).

## 🛠 Tech Stack Overview
- **Framework**: Next.js (App Router) & React
- **Styling**: Tailwind CSS & standard CSS
- **Backend & Auth**: Supabase
- **AI Integration**: Google Gemini API

---

## 📂 Where to Find UI Code

Almost all visual elements you will want to touch are inside the `/web` directory.

- **`web/src/components/`**: Reusable UI elements (e.g., `AddExpenseModal.tsx`, `HeroCard.tsx`, `ChatBubble.tsx`). **Start here for most UI changes.**
- **`web/src/app/`**: Next.js pages and layouts (e.g., `web/src/app/dashboard/page.tsx`). Modify these for page-level structural changes and layout composition.
- **`web/src/app/globals.css`**: Global stylesheet. Contains CSS variables for the color palette (`--sage-*`, `--ink-*`), typography definitions, and custom animations.
- **`web/tailwind.config.ts`**: Tailwind configuration. Modify this to add new design tokens, custom colors, or keyframe animations globally.

---

## ✅ What YOU CAN Edit (Safe Zones)

You are encouraged to modify the following to make the app look and feel more premium, dynamic, and beautiful:

1. **Tailwind Classes**: Feel free to change, add, or remove Tailwind classes in the `className="..."` props to adjust colors, padding, margins, shadows, and typography.
2. **HTML/JSX Structure**: You can wrap elements in new `<div>`s, rearrange visual hierarchy, or change semantic tags (e.g., changing a `div` to a `button` for accessibility) as long as you preserve the event handlers attached to them.
3. **CSS Variables & Animations**: Update `globals.css` and `tailwind.config.ts` to refine the color palette, fonts, or to add rich CSS keyframe animations (e.g., slide-ups, fades).
4. **Icons & Assets**: Swap out SVG paths or icons.
5. **Presentational Components**: Create new, purely visual components in `src/components/` and import them into existing pages.

---

## 🚫 What YOU MUST NOT Edit (Danger Zones)

Do not touch or remove the following without explicit instructions from a core software engineer, as this will break the application's functionality:

1. **State Hooks**: Do not remove, rename, or alter `useState`, `useEffect`, `useRef`, or `useMemo` declarations.
2. **Event Handlers**: Do not delete or disconnect `onClick`, `onSubmit`, `onChange`, etc.
   > *Example*: If a `<button onClick={handleSubmit}>` is being redesigned, ensure `onClick={handleSubmit}` remains on whatever element replaces it.
3. **Data Binding**: Do not remove `value={...}` or state-driven rendering logic `{loading ? <Spinner /> : <Content />}`.
4. **API & Database Logic**: Do not touch any code prefixed with `supabase.`, `fetch(`, or calls to the Gemini API (`/api/ai/...`). Do not modify files inside `web/src/app/api/`.
5. **Component Props**: Do not change the defined TypeScript interfaces for existing components (e.g., `interface ExpenseRowProps`) unless you are only adding *optional* presentational props like `className?: string`.

---

## 🤖 Special Instructions for AI Agents

If you are an AI agent autonomously modifying the UI/UX:
1. **Target Specificity**: Only target the exact visual components requested by the user. 
2. **Preserve Logic**: When regenerating a piece of JSX to apply new styles, strictly copy over all React props that bind state or handle events. *Never* drop an `onClick` or `onChange`.
3. **Design Aesthetic**: Use the premium design system.
   - Utilize existing custom configuration colors (e.g., `bg-sage-600`, `text-ink-900`).
   - Incorporate micro-animations (`transition-all duration-300 ease-in-out`, hover effects, active states) to make the UI feel alive and responsive.
   - Ensure you are working within mobile-first constraints (e.g., using safe area insets `pb-[env(safe-area-inset-bottom)]`).
4. **No Placeholders**: Do not insert placeholder text or "lorem ipsum" into functional areas. Maintain the dynamic data bindings (`{expense.amount}`).
5. **Do Not Break Forms**: When styling input fields, labels, and forms, ensure standard HTML form validation and accessibility attributes (`required`, `htmlFor`, `type`) are preserved.

---

## 🎨 Premium Design Tenets

When improving the app, keep these principles in mind:
- **Serene & Professional**: Colors should feel grounded, calming (sage greens), and high-end. Avoid harsh primary colors.
- **Glassmorphism & Depth**: Use subtle shadows (`shadow-sm`, `shadow-md`), borders, and soft gradients to establish visual hierarchy without clutter.
- **Micro-Interactions**: Buttons and list items should have clear `hover:`, `active:`, and `focus:` states.
- **Typography First**: Maintain the use of DM Serif Display for headers and DM Sans for clean readability on data-heavy views. Let typography breathe with generous spacing (`gap`, `leading`, `tracking`).

By following these guidelines, you can safely transform Sage into a world-class application interface while ensuring the core engine keeps humming perfectly.
