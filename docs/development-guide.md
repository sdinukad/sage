[← Back to Overview](../README.md)

# Development Guide

This guide is intended for developers who want to contribute to Sage or understand the codebase in more detail.

## Project Structure

Sage is organized as a monorepo with the following main directories:

-   **`ai/`**: Python-based AI training and ONNX export.
    -   `train_intent.py`: Main script for training the BERT-Tiny model.
    -   `export_onnx.py`: Script to convert the PyTorch model to ONNX.
    -   `data/`: Training and validation datasets.
-   **`web/`**: Next.js frontend application.
    -   `src/components/`: Reusable UI components.
    -   `src/pages/`: Application pages and routing.
    -   `src/shared/`: Client-side logic for AI and Supabase integration.
-   **`shared/`**: TypeScript models and business logic shared across platforms.
    -   `gemini.ts`: Integration with the Gemini API.
    -   `models.ts`: Define data structures for `Expense`, `User`, and `Category`.

---

## Coding Standards

-   **TypeScript**: We use TypeScript for all frontend and shared logic. Ensure type safety by avoiding `any` where possible.
-   **Tailwind CSS**: Use Tailwind for styling. Follow the design system tokens defined in `docs/design-system.md`.
-   **Component Pattern**: Prefer functional components and hooks. Keep components focused and reusable.
-   **AI Interaction**: Use the `LocalAI` class in `web/src/shared/local-ai.ts` for intent and entity extraction. Handle fallbacks to Gemini gracefully.

---

## Security Best Practices

### Environment Variables
**NEVER commit sensitive information like API keys or database passwords.**
- Use `.env.local` for local development.
- Provide a template in `.env.example`.
- All keys should be managed through secure environment variable management in production (e.g., Vercel, Supabase Dashboard).

### Database Access
- Use **Supabase Row-Level Security (RLS)** for all tables.
- Ensure that users can only access their own data.
- Regularly review migrations in `supabase/migrations/` for security implications.

---

## Contributing

1.  **Fork the repository**.
2.  **Create a feature branch**: `git checkout -b feature/your-feature-name`.
3.  **Make your changes** and ensure all tests pass.
4.  **Submit a Pull Request** with a clear description of your changes.

---

## Resources

-   [Next.js Documentation](https://nextjs.org/docs)
-   [Supabase Documentation](https://supabase.com/docs)
-   [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html)
-   [Gemini API Documentation](https://ai.google.dev/docs)
