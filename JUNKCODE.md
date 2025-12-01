## Junk Code Tracker (God Files & Mixed Concerns)

Use this file to log any places where API handling, business logic, and view rendering are all tangled together in one file.
Each entry should be short, concrete, and actionable.

### How to log a junk/god file

- **File**: `path/to/file.js`
- **Smells**:
  - [ ] Mixes React JSX / UI with direct DB or Supabase calls
  - [ ] API route handler also renders a view or manipulates DOM
  - [ ] Business logic (validation, orchestration) lives in the page instead of a service/module
  - [ ] Large “do everything” function (hard to unit test, hard to read)
  - [ ] Tight coupling between layers (changing API or DB forces UI edits in the same file)
- **Impact**: _1–3 bullet points on why this is risky (bugs, duplication, hard to change, etc.)_
- **Refactor idea**:
  - [ ] Extract service/module for business logic
  - [ ] Move API handler to `pages/api/...` and keep it thin
  - [ ] Keep UI components free of direct DB / Supabase calls (use view-layer utilities instead)
  - [ ] Add tests around the extracted logic
- **Priority**: `ASAP` / `Soon` / `Nice-to-have`

> Example (template):
>
> - **File**: `pages/example.js`
> - **Smells**:
>   - [x] Page component calls `supabase` directly
>   - [x] Contains both route handling and JSX rendering
> - **Impact**: Hard to reuse auth logic, and any API change requires touching the page.
> - **Refactor idea**:
>   - [x] Move Supabase calls into `src/modules-logic/services/...`
>   - [x] Keep page as a thin UI that talks to `/api/...` via `modules-view/utils/api.js`
> - **Priority**: `ASAP`


