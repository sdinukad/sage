---
description: Build project and deploy to GitHub only if production-ready
---

# 🚀 Sage Deployment Workflow
This workflow is the "gatekeeper" for production. It ensures the application is bug-free and type-safe before reaching Railway.

> [!IMPORTANT]
> **NEVER** push directly to `main` without completing these steps first. Broken builds on Railway disrupt service and cost money.

## Phase 0: Pre-flight Verification (30 Seconds)
Run these commands to catch 99% of common issues instantly.

// turbo
1. Check for TypeScript errors:
```bash
npm run type-check --workspace=web
```

// turbo
2. Check for Linting/Styling warnings:
```bash
npm run lint --workspace=web
```

---

## Phase 1: Full Production Build (2 Minutes)
If Phase 0 passes, verify the final bundle.

// turbo
3. Run the full build:
```bash
npm run build --workspace=web
```

---

## Phase 2: Secure Push
Only proceed if Phase 1 completed with **`✓ Compiled successfully`**.

4. Stage all fixes and changes:
```bash
git add .
```

5. Commit with a clear, descriptive message:
```bash
git commit -m "deploy: [Your description here]"
```

6. Final push to trigger Railway:
```bash
git push
```
