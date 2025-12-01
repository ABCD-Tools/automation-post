# Setup Instructions

## Project Structure

This project uses a standard Next.js structure with path aliases for better organization.

### Directory Structure

- `pages/` - Next.js pages and API routes (standard location)
- `styles/` - Global CSS files
- `src/modules-view/components/` - React components (accessible via `@components`)
- `src/modules-view/utils/` - Utility functions (accessible via `@utils`)
- `src/modules-logic/` - Business logic modules (accessible via `@modules-logic`)
- `src/modules-agents/` - Browser automation agents (accessible via `@modules-agents`)
- `src/modules-view/` - View-related modules (accessible via `@modules-view`)

### Path Aliases

The project uses path aliases configured in `next.config.js`:

- `@components` → `src/modules-view/components`
- `@utils` → `src/modules-view/utils`
- `@modules-logic` → `src/modules-logic`
- `@modules-agents` → `src/modules-agents`
- `@modules-view` → `src/modules-view`

### Usage Example

```javascript
// Instead of:
import Button from '../../../components/Button'

// Use:
import Button from '@components/Button'
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Vercel Deployment

The project is configured for Vercel deployment. No additional setup required.

