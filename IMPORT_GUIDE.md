# Import Guide - Using Path Aliases

This project uses path aliases configured in `next.config.js` and `jsconfig.json` for cleaner imports.

## Available Path Aliases

- `@components` → `src/modules-view/components`
- `@utils` → `src/modules-view/utils`
- `@modules-logic` → `src/modules-logic`
- `@modules-agents` → `src/modules-agents`
- `@modules-view` → `src/modules-view`

## Usage Examples

### Importing Components

```javascript
// ✅ Good - Using alias
import Layout from '@components/Layout'
import Navbar from '@components/Navbar'
import AccountCard from '@components/AccountCard'
import PostComposer from '@components/PostComposer'

// ❌ Bad - Using relative paths
import Layout from '../../components/Layout'
import Navbar from '../../../components/Navbar'
```

### Importing Utils

```javascript
// ✅ Good - Using alias
import { apiClient } from '@utils/api'
import { encrypt, decrypt } from '@utils/encryption'
import { supabase } from '@utils/supabase'
import { PLATFORM_LIMITS } from '@utils/constants'

// ❌ Bad - Using relative paths
import { apiClient } from '../../utils/api'
```

### Importing Business Logic

```javascript
// ✅ Good - Using alias
import { authService } from '@modules-logic/services/auth'
import { accountService } from '@modules-logic/services/accounts'
import { User } from '@modules-logic/models/User'

// ❌ Bad - Using relative paths
import { authService } from '../../../modules-logic/services/auth'
```

### Importing Agents

```javascript
// ✅ Good - Using alias
import { BaseAgent } from '@modules-agents/base/BaseAgent'
import { InstagramAgent } from '@modules-agents/platforms/InstagramAgent'
import { stealth } from '@modules-agents/utils/stealth'

// ❌ Bad - Using relative paths
import { BaseAgent } from '../../modules-agents/base/BaseAgent'
```

### Importing from Modules-View

```javascript
// ✅ Good - Using alias
import { someUtil } from '@modules-view/utils/someUtil'
import SomeComponent from '@modules-view/components/SomeComponent'

// ❌ Bad - Using relative paths
import { someUtil } from '../utils/someUtil'
```

## In Pages Directory

When importing from pages (e.g., in `pages/_app.js` or page components):

```javascript
// Importing styles (relative path is fine for styles)
import '../styles/globals.css'

// Importing components (use alias)
import Layout from '@components/Layout'
import Navbar from '@components/Navbar'

// Importing utils (use alias)
import { apiClient } from '@utils/api'
```

## In API Routes

When importing in API routes (e.g., `pages/api/auth/login.js`):

```javascript
// Importing services (use alias)
import { authService } from '@modules-logic/services/auth'
import { User } from '@modules-logic/models/User'

// Importing utils (use alias)
import { validateEmail } from '@utils/validation'
```

## Benefits

1. **Cleaner imports**: No more `../../../` paths
2. **Easier refactoring**: Move files without breaking imports
3. **Better IDE support**: Autocomplete and go-to-definition work better
4. **Consistent structure**: All imports follow the same pattern

## IDE Support

The `jsconfig.json` file provides IDE support for these aliases:
- Autocomplete when typing `@`
- Go-to-definition works correctly
- Refactoring tools understand the aliases

