# How Workflows Work

## Overview

Workflows are **sequences of micro-actions** that automate complex browser tasks (e.g., "Instagram Login", "Post Photo", "Like Post"). They combine reusable micro-actions into executable automation scripts.

---

## Architecture

### 1. Micro-Actions (Building Blocks)

Micro-actions are **atomic, reusable browser actions** stored in the `micro_actions` table. Each micro-action represents a single browser operation.

#### Micro-Action Structure

```javascript
{
  id: "uuid",
  name: "Click 'Login' button",
  description: "Clicks the login button on Instagram",
  type: "click",  // click, type, wait, navigate, upload, extract, scroll, screenshot
  platform: "instagram",  // instagram, facebook, twitter, all
  params: {
    // Visual data (primary method - robust against UI changes)
    visual: {
      screenshot: "base64_encoded_image_or_url",
      text: "Login",  // Visible text on element
      position: {
        absolute: { x: 100, y: 200 },
        relative: { x: 50.5, y: 30.2 }  // Percentage of viewport
      },
      boundingBox: { x: 50, y: 150, width: 200, height: 50 },
      surroundingText: ["Sign in", "Welcome back"],
      contextScreenshot: "base64_full_page_screenshot"
    },
    // Fallback selector (optional, for legacy support)
    backup_selector: "button[type='submit']",
    // Execution strategy
    execution_method: "visual_first"  // "visual_first" | "selector_first" | "visual_only"
  },
  is_active: true,
  version: "1.0.0"
}
```

#### Key Features

- **Visual-First Approach**: Uses screenshots, text, and position data instead of fragile DOM selectors
- **Template Variables**: Params can use `{{username}}`, `{{password}}`, etc. (replaced at execution time)
- **Platform-Specific or Universal**: Can target specific platforms or work across all
- **Versioned**: Can be updated without breaking existing workflows

#### Action Types

- `click` - Click an element
- `type` - Type text into an input field
- `wait` - Wait for a duration (with optional randomization)
- `navigate` - Navigate to a URL
- `upload` - Upload a file
- `extract` - Extract data from page (store in variable)
- `scroll` - Scroll the page
- `screenshot` - Take a screenshot

---

### 2. Workflows (Sequences)

Workflows are **ordered sequences of micro-actions** stored in the `workflows` table. Each workflow step references a micro-action by ID and can override its parameters.

#### Workflow Structure

```javascript
{
  id: "uuid",
  name: "Instagram Login",
  description: "Logs into Instagram account",
  platform: "instagram",
  type: "auth",  // auth, post, story, comment, like
  steps: [
    {
      micro_action_id: "uuid-of-navigate-action",
      params_override: {
        url: "https://instagram.com/login"
      }
    },
    {
      micro_action_id: "uuid-of-wait-action",
      params_override: {
        duration: 2000
      }
    },
    {
      micro_action_id: "uuid-of-type-action",
      params_override: {
        text: "{{username}}"  // Template variable
      }
    },
    {
      micro_action_id: "uuid-of-type-action",
      params_override: {
        text: "{{password}}"
      }
    },
    {
      micro_action_id: "uuid-of-click-action"
      // No override - uses micro-action's default params
    }
  ],
  requires_auth: false,
  auth_workflow_id: null,  // If this workflow needs auth, reference another workflow
  is_active: true,
  version: "1.0.0"
}
```

#### Workflow Types

- `auth` - Authentication workflows (login, logout)
- `post` - Posting content (photo, video, carousel)
- `story` - Story workflows
- `comment` - Comment workflows
- `like` - Like/unlike workflows

#### Key Features

- **Parameter Override**: Each step can override micro-action params
- **Template Variables**: Steps can use `{{variable}}` syntax
- **Workflow Composition**: Workflows can reference other workflows (via `auth_workflow_id`)
- **Platform-Specific**: Each workflow targets a specific platform

---

## Execution Flow

### 1. Workflow Loading

When a workflow is executed:

1. **Load workflow** from `workflows` table by ID
2. **Resolve auth workflow** if `requires_auth = true` and `auth_workflow_id` is set
3. **Load all micro-actions** referenced in steps from `micro_actions` table

### 2. Step Execution

For each step in sequence:

1. **Merge Parameters**:
   ```javascript
   // Base params from micro-action
   const baseParams = microAction.params;
   
   // Override with workflow step params
   const finalParams = {
     ...baseParams,
     ...step.params_override
   };
   ```

2. **Replace Template Variables**:
   ```javascript
   // Variables provided at execution time
   const variables = {
     username: "john_doe",
     password: "secret123",
     imagePath: "/path/to/image.jpg"
   };
   
   // Replace {{variable}} in params
   if (finalParams.text) {
     finalParams.text = finalParams.text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
       return variables[key] || match;
     });
   }
   ```

3. **Execute Action**:
   - Use `WorkflowExecutor` class
   - Delegates to `EnhancedVisualExecutor` for visual-based actions
   - Supports retry logic with progressive threshold relaxation
   - Tracks execution method (visual, selector, or position-based)

### 3. Execution Methods

The executor tries multiple methods in order (based on `execution_method`):

#### Visual First (`visual_first`)
1. Try visual search (screenshot matching, text matching, position matching)
2. Fallback to backup selector if visual fails
3. Last resort: click at recorded coordinates

#### Selector First (`selector_first`)
1. Try backup selector (fast path)
2. Fallback to visual search if selector fails
3. Last resort: click at recorded coordinates

#### Visual Only (`visual_only`)
1. Only use visual search (ignores selectors completely)
2. Last resort: click at recorded coordinates

### 4. Error Handling

- **Retry Logic**: Failed actions are retried with relaxed thresholds
- **Progress Tracking**: Each step logs success/failure with method used
- **Screenshot on Error**: Captures screenshots when actions fail
- **Breakpoint Support**: Can pause execution at specific steps
- **Execution Reports**: Detailed reports with confidence scores

---

## Example: Instagram Login Workflow

### Step 1: Create Micro-Actions

```javascript
// Micro-action 1: Navigate
{
  name: "Navigate to Instagram",
  type: "navigate",
  platform: "instagram",
  params: {
    url: "https://instagram.com",
    waitUntil: "networkidle2"
  }
}

// Micro-action 2: Type Username
{
  name: "Type in username field",
  type: "type",
  platform: "instagram",
  params: {
    visual: {
      screenshot: "...",
      text: "Phone number, username, or email",
      position: { relative: { x: 50, y: 40 } }
    },
    backup_selector: "input[name='username']",
    text: "{{username}}",
    execution_method: "visual_first"
  }
}

// Micro-action 3: Type Password
{
  name: "Type in password field",
  type: "type",
  platform: "instagram",
  params: {
    visual: {
      screenshot: "...",
      text: "Password",
      position: { relative: { x: 50, y: 50 } }
    },
    backup_selector: "input[name='password']",
    text: "{{password}}",
    execution_method: "visual_first"
  }
}

// Micro-action 4: Click Login
{
  name: "Click Login button",
  type: "click",
  platform: "instagram",
  params: {
    visual: {
      screenshot: "...",
      text: "Log in",
      position: { relative: { x: 50, y: 60 } }
    },
    backup_selector: "button[type='submit']",
    execution_method: "visual_first"
  }
}
```

### Step 2: Create Workflow

```javascript
{
  name: "Instagram Login",
  platform: "instagram",
  type: "auth",
  steps: [
    { micro_action_id: "navigate-action-id" },
    { micro_action_id: "wait-action-id", params_override: { duration: 2000 } },
    { micro_action_id: "type-username-action-id" },
    { micro_action_id: "type-password-action-id" },
    { micro_action_id: "click-login-action-id" },
    { micro_action_id: "wait-action-id", params_override: { duration: 3000 } }
  ],
  requires_auth: false
}
```

### Step 3: Execute Workflow

```javascript
const executor = new WorkflowExecutor(page);
await executor.executeWorkflow(workflow, {
  username: "john_doe",
  password: "secret123"
});
```

---

## Database Schema

### `micro_actions` Table

```sql
CREATE TABLE micro_actions (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  params JSONB NOT NULL,  -- Visual data + backup_selector + execution_method
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version VARCHAR(20) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT TRUE
);
```

### `workflows` Table

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  platform VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,  -- auth, post, story, comment, like
  steps JSONB NOT NULL,  -- Array of {micro_action_id, params_override}
  requires_auth BOOLEAN DEFAULT FALSE,
  auth_workflow_id UUID REFERENCES workflows(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version VARCHAR(20) DEFAULT '1.0.0'
);
```

---

## Best Practices

### Creating Micro-Actions

1. **Make them atomic**: One action = one browser operation
2. **Use visual data**: Always record screenshots and text for robustness
3. **Provide backup selectors**: Include CSS selectors as fallback
4. **Use template variables**: For dynamic values like `{{username}}`
5. **Platform-agnostic when possible**: Use `platform: "all"` for reusable actions

### Creating Workflows

1. **Start with navigation**: Always begin with a `navigate` action
2. **Add waits strategically**: Insert `wait` actions after navigation and before critical interactions
3. **Override params when needed**: Use `params_override` to customize micro-actions for specific use cases
4. **Compose workflows**: Use `auth_workflow_id` to chain workflows (e.g., "Post" workflow calls "Login" first)
5. **Test incrementally**: Test each step as you build the workflow

### Execution

1. **Provide all variables**: Ensure all `{{variable}}` references are provided at execution time
2. **Handle errors gracefully**: Use retry logic and error screenshots for debugging
3. **Monitor execution**: Track which execution method succeeded (visual vs selector)
4. **Version workflows**: Update version numbers when making breaking changes

---

## API Endpoints

All endpoints require **admin authentication** via Bearer token.

### Micro-Actions

#### `GET /api/admin/micro-actions/list`

List all micro-actions with filtering, search, and pagination.

**Query Parameters:**
- `platform` (string, optional): Filter by platform (`all`, `instagram`, `facebook`, `twitter`)
- `type` (string, optional): Filter by action type (`all`, `click`, `type`, `wait`, `navigate`, `upload`, `extract`, `scroll`, `screenshot`)
- `search` (string, optional): Search in name and description
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 50, max: 100)

**Response:**
```json
{
  "microActions": [
    {
      "id": "uuid",
      "name": "Click Login Button",
      "description": "Clicks the login button",
      "type": "click",
      "platform": "instagram",
      "params": { /* ... */ },
      "is_active": true,
      "version": "1.0.0",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

#### `POST /api/admin/micro-actions/create`

Create a new micro-action.

**Request Body:**
```json
{
  "name": "Click Login Button",
  "description": "Clicks the login button on Instagram",
  "type": "click",
  "platform": "instagram",
  "params": {
    "visual": {
      "screenshot": "base64_encoded_image",
      "text": "Log in",
      "position": { "relative": { "x": 50, "y": 60 } }
    },
    "backup_selector": "button[type='submit']",
    "execution_method": "visual_first"
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Click Login Button",
  /* ... other fields ... */
}
```

#### `PUT /api/admin/micro-actions/[id]`

Update an existing micro-action.

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "params": { /* updated params */ },
  "is_active": true
}
```

**Response:**
```json
{
  "id": "uuid",
  /* ... updated fields ... */
}
```

#### `DELETE /api/admin/micro-actions/[id]`

Delete a micro-action (soft delete - sets `is_active = false`).

**Response:**
```json
{
  "message": "Micro-action deleted",
  "data": { /* deleted micro-action */ }
}
```

#### `POST /api/admin/micro-actions/import`

Import micro-actions from a recorded session file.

**Request Body:**
```json
{
  "microActions": [
    {
      "name": "Click Button",
      "type": "click",
      "platform": "instagram",
      "params": { /* ... */ }
    }
  ]
}
```

**Response:**
```json
{
  "message": "Successfully imported 5 micro-action(s)"
}
```

---

### Workflows

#### `GET /api/admin/workflows/list`

List all workflows with filtering and pagination. Automatically populates micro-action details in steps.

**Query Parameters:**
- `platform` (string, optional): Filter by platform (`all`, `instagram`, `facebook`, `twitter`)
- `type` (string, optional): Filter by workflow type (`all`, `auth`, `post`, `story`, `comment`, `like`)
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 50)

**Response:**
```json
{
  "workflows": [
    {
      "id": "uuid",
      "name": "Instagram Login",
      "description": "Logs into Instagram",
      "platform": "instagram",
      "type": "auth",
      "steps": [
        {
          "micro_action_id": "uuid",
          "params_override": { "url": "https://instagram.com/login" },
          "micro_action": {
            "id": "uuid",
            "name": "Navigate to URL",
            "type": "navigate",
            "platform": "instagram",
            "params": { /* ... */ }
          }
        }
      ],
      "requires_auth": false,
      "auth_workflow_id": null,
      "is_active": true,
      "version": "1.0.0",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 50
}
```

#### `POST /api/admin/workflows/create`

Create a new workflow.

**Request Body:**
```json
{
  "name": "Instagram Login",
  "description": "Logs into Instagram account",
  "platform": "instagram",
  "type": "auth",
  "steps": [
    {
      "micro_action_id": "uuid-of-navigate-action",
      "params_override": {
        "url": "https://instagram.com/login"
      }
    },
    {
      "micro_action_id": "uuid-of-type-action",
      "params_override": {
        "text": "{{username}}"
      }
    }
  ],
  "requires_auth": false,
  "auth_workflow_id": null
}
```

**Validation:**
- `name`, `platform`, `type`, `steps` are required
- `platform` must be one of: `instagram`, `facebook`, `twitter`
- `type` must be one of: `auth`, `post`, `story`, `comment`, `like`
- `steps` must be a non-empty array
- Each step must have a `micro_action_id`
- All `micro_action_id` values must exist in `micro_actions` table
- If `auth_workflow_id` is provided, it must exist in `workflows` table

**Response:**
```json
{
  "id": "uuid",
  "name": "Instagram Login",
  /* ... other fields ... */
}
```

#### `GET /api/admin/workflows/[id]`

Get a single workflow by ID. Automatically populates micro-action details in steps.

**Response:**
```json
{
  "id": "uuid",
  "name": "Instagram Login",
  "description": "Logs into Instagram",
  "platform": "instagram",
  "type": "auth",
  "steps": [
    {
      "micro_action_id": "uuid",
      "params_override": { /* ... */ },
      "micro_action": { /* full micro-action object */ }
    }
  ],
  "requires_auth": false,
  "auth_workflow_id": null,
  "is_active": true,
  "version": "1.0.0",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### `PUT /api/admin/workflows/[id]`

Update an existing workflow.

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Workflow Name",
  "description": "Updated description",
  "platform": "instagram",
  "type": "auth",
  "steps": [ /* updated steps array */ ],
  "requires_auth": true,
  "auth_workflow_id": "uuid-of-auth-workflow",
  "is_active": true
}
```

**Validation:**
- If `steps` is provided, same validation as create endpoint
- If `auth_workflow_id` is provided, it must exist and not be the same as the current workflow ID

**Response:**
```json
{
  "id": "uuid",
  /* ... updated fields ... */
}
```

#### `DELETE /api/admin/workflows/[id]`

Delete a workflow (soft delete - sets `is_active = false`).

**Response:**
```json
{
  "message": "Workflow deleted",
  "data": { /* deleted workflow */ }
}
```

---

### Error Responses

All endpoints may return these error responses:

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Admin access required"
}
```

**400 Bad Request:**
```json
{
  "error": "Missing required fields: name, platform, type, steps"
}
```

**404 Not Found:**
```json
{
  "error": "Workflow not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## Visual Recording Integration

Micro-actions can be created from recorded browser sessions:

1. **Record session**: Use the recorder to capture user interactions
2. **Convert to micro-actions**: Recorded actions are automatically converted to micro-action format
3. **Import**: Import the recording file to create micro-actions
4. **Use in workflows**: Add imported micro-actions to workflow steps

The recorder captures:
- Screenshots (element and context)
- Visible text
- Position (absolute and relative)
- Bounding boxes
- Surrounding text context
- Backup CSS selectors

This makes workflows **robust against UI changes** because they rely on visual data rather than fragile DOM selectors.
