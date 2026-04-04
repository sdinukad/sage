---
description: Build project and deploy to GitHub only if production-ready
---

This workflow ensures that the application passes all production build checks (ESLint, TypeScript, etc.) before pushing to GitHub. This prevents broken builds on Railway.

1. Run the production build to catch any errors:
```bash
npm run build --workspace=web
```

2. If the build succeeds, stage all changes:
```bash
git add .
```

3. Commit the changes with a descriptive message:
```bash
git commit -m "Production-ready build: [Your description here]"
```

4. Push to the main branch:
```bash
git push
```
