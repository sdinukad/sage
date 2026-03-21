# Sage - AI-Powered Expense Tracker

Sage is a modern, conversation-centric personal finance assistant. By combining local BERT-Tiny intelligence with cloud-based Gemini logic and Supabase infrastructure, Sage provides an effortless way to track your spending.

## Documentation Index

We have created detailed documentation to help you get started, understand the architecture, and use Sage effectively.

### For Everyone
-   **[Introduction](docs/introduction.md)**: What is Sage and why we built it.
-   **[User Guide](docs/user-guide.md)**: A non-technical guide on how to interact with the AI assistant.
-   **[UI/UX Handoff](docs/ui-ux-handoff.md)**: A guide for designers to customize the look and feel.

### For Developers
-   **[Getting Started](docs/getting-started.md)**: Step-by-step setup instructions for your local environment.
-   **[System Architecture](docs/architecture.md)**: Technical overview, data flow, and Mermaid diagrams.
-   **[Local AI Engine](docs/local-ai-engine.md)**: Deep dive into the fine-tuned BERT-Tiny model.
-   **[Local AI Guide](docs/local-ai-guide.md)**: Additional technical details on the AI training and integration.
-   **[Design System](docs/design-system.md)**: Visual identity, color palette, and component library.
-   **[Design Handoff](docs/design-handoff.md)**: Technical redesign notes and component implementation.
-   **[Development Guide](docs/development-guide.md)**: Project structure and coding standards.

## Tech Stack

-   **Frontend**: Next.js, Tailwind CSS, ONNX Runtime Web.
-   **Backend**: Supabase (PostgreSQL, RLS, Auth).
-   **AI**: BERT-Tiny (Local, ONNX).
-   **Shared Logic**: TypeScript.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/dinuka/sage.git

# Navigate to web
cd web
npm install
npm run dev
```

For detailed instructions, see the **[Getting Started Guide](docs/getting-started.md)**.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.
