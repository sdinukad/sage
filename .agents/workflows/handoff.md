---
description: Create a session handoff document for the next session
---

Use this workflow when ending a coding session to ensure a smooth transition.

1. Ensure the `docs/handoffs/` directory exists and update `.gitignore`:
   - Run: `mkdir -p docs/handoffs && (grep -q "docs/handoffs/" .gitignore || echo "docs/handoffs/" >> .gitignore)`

2. Create a handoff document using a direct shell heredoc to avoid tool hangs:
   - Filename format: `docs/handoffs/YYYY-MM-DD-HH-MM-session-summary.md`
   - Command: `cat << 'EOF' > docs/handoffs/FILENAME.md ... EOF`
   - Content:
     - **Goal**: What was the primary objective of this session?
     - **Actions Taken**: A detailed list of what was changed and why.
     - **Key Decisions**: Rationale for major design or technical changes.
     - **Blockers/Remaining Work**: What needs to be done next?
     - **Reference Files**: Key files modified during this session.

3. (Optional) Provide the filename to the user as a final message.
