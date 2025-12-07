# ABCD Tools Platform

A Next.js application for automating social media posts with **visual action recording** - a robust approach that captures what users see instead of fragile DOM selectors.

## 🎯 Visual Recording Approach

This platform uses **visual/coordinate-based recording** instead of traditional DOM selectors, making automation resilient to UI changes.

### Key Benefits

- ✅ **Robust Against UI Changes**: Works even when CSS classes, IDs, or structure change
- ✅ **Visual Matching**: Uses screenshots, text, and positions to find elements
- ✅ **Multiple Fallbacks**: Tries visual search first, falls back to selectors if needed
- ✅ **Human-Like Behavior**: Records actual user interactions with visual context
- ✅ **Self-Healing**: Adapts to minor UI changes automatically

### How It Works

1. **Record**: Capture user interactions with full visual data (screenshots, positions, text)
2. **Store**: Save visual data with backup selectors for fast execution
3. **Execute**: Find elements using visual search, fallback to selectors if needed
4. **Adapt**: Works even when UI changes slightly (text, position, styling)

### Example: Why Visual Recording Works

**Traditional Selector Approach** ❌
```javascript
// Breaks when Instagram changes CSS class
button.login-btn  // ❌ Fails if class renamed to .sign-in-button
```

**Visual Recording Approach** ✅
```javascript
// Works even if class changes
{
  visual: {
    screenshot: "...",      // Visual match
    text: "Log In",          // Text match
    position: { x: 50%, y: 40% },  // Position match
  },
  backup_selector: "button.login-btn"  // Fast fallback
}
```

---

## 👨‍💻 For Developers

### Prerequisites

1. **Node.js** (v18 or higher) - Download from [nodejs.org](https://nodejs.org/)
2. **pnpm** - Install globally:
   ```bash
   npm install -g pnpm
   ```
3. **Supabase** - Set up a Supabase project and configure environment variables

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd abcd-tools
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run database migrations**
   ```bash
   pnpm migrate
   ```

5. **Seed the database (optional)**
   ```bash
   pnpm seed
   ```

### Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Run database migrations
pnpm migrate

# Run fresh migrations (drops all tables)
pnpm migrate:fresh

# Seed database with sample data
pnpm seed
```

### Recording Workflows

The platform includes a powerful visual recording tool to capture browser interactions.

#### Record a New Workflow

```bash
pnpm record
```

This will:
1. Prompt you for the platform (instagram/facebook/twitter)
2. Ask for the starting URL
3. Open a browser window with the recording overlay
4. Capture all your interactions (clicks, typing, scrolling)
5. Save the recording as a JSON file in the `recordings/` directory

**Example:**
```bash
$ pnpm record

🎬 Micro-Actions Recorder
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Platform (instagram/facebook/twitter): instagram
Starting URL (e.g., https://instagram.com/accounts/login): https://instagram.com
Session name (optional, press ENTER for auto-generated): 

📱 Opening browser in mobile mode for instagram...
💡 TIP: The page will look like mobile instagram
🎬 Recording overlay will show status in top-right corner

[Browser opens - perform your actions]
[Press Ctrl+C when done]

✅ Recording saved to recordings/instagram_2025-12-07T16-10-38-757Z.json
```

#### Recording Tips

- **Wait for page load**: Ensure all resources are loaded before interacting
- **Use stable elements**: Prefer buttons and form fields over dynamic content
- **Provide context**: The recorder captures surrounding text and elements automatically
- **Stop recording**: Press `Ctrl+C` in the terminal when finished

### Project Structure

```
abcd-tools/
├── pages/              # Next.js pages and API routes
├── src/
│   ├── modules-agents/     # Agent execution logic
│   ├── modules-client/     # Client installer and packaging
│   ├── modules-installer/  # Installation scripts
│   ├── modules-logic/      # Business logic and services
│   ├── modules-recorder/   # Visual recording engine
│   └── modules-view/       # UI components and utilities
├── tools/              # CLI tools (record.mjs, etc.)
├── recordings/         # Saved recording JSON files
├── docs/              # Documentation files
└── supabase/          # Database migrations and seeders
```

### Additional Resources

📖 **Learn More**: 
- [Visual Recording Guide](docs/VISUAL_RECORDING_GUIDE.md) - Best practices and troubleshooting
- [Selector vs Visual Comparison](docs/SELECTOR_VS_VISUAL.md) - When to use each approach
- [Workflows Documentation](docs/WORKFLOWS.md) - How workflows work
- [API Documentation](docs/API.md) - API reference

---

## 👥 For Users

### Getting Started

#### 1. Create an Account

1. Visit the website and click **"Register"** or navigate to `/register`
2. Enter your email and password (minimum 8 characters)
3. Accept the Terms and Policy
4. Click **"Register"**
5. Check your email to verify your account

#### 2. Install the Agent

The agent is a lightweight application that runs on your local machine to process your posts securely.

1. **Login** to your account
2. Navigate to **"Clients"** in the dashboard
3. Click **"Download Client"** to get the agent installer
4. Run the installer on your computer
5. The agent will appear in your **Clients** list with status "Offline" initially

#### 3. Add Social Media Accounts

1. Go to **"Accounts"** in the dashboard
2. Click **"Add Account"**
3. Select:
   - **Platform**: Instagram, Facebook, or Twitter
   - **Client**: Choose the client/agent you installed
   - **Username**: Your social media username
   - **Password**: Your social media password
4. Click **"Add Account"**

**Note**: Free tier allows up to 3 accounts. Upgrade for unlimited accounts.

#### 4. Create and Queue Posts

1. Navigate to **"Create Post"** or **"Posts"** → **"Create"**
2. **Upload an image**:
   - Supported formats: JPG, PNG, WEBP
   - Maximum size: 10MB
3. **Write your caption**
4. **Select target accounts**: Choose which accounts to post to
5. **Schedule (optional)**: Set a date/time for future posting, or leave empty for immediate queue
6. Click **"Create Post"**

The post will be added to your queue and processed when you wake up your agent.

#### 5. Wake Up Your Agent

1. Go to **"Clients"** in the dashboard
2. Find your installed client
3. Click **"Wake Up"** button
4. The agent will process all queued posts automatically

**Note**: The agent must be running on your machine for posts to be processed.

### Features

#### Multi-Platform Posting
- Post to Instagram, Facebook, and Twitter simultaneously
- Select multiple accounts per post
- Maintain consistent messaging across platforms

#### Queue & Schedule
- Create posts in advance
- Queue multiple posts at once
- Schedule posts for specific dates/times
- Process all queued posts on-demand

#### Post History
- View all your posts in **"Post History"**
- See job status (pending, processing, completed, failed)
- Track which accounts received each post
- View detailed job information

#### Account Management
- Add multiple accounts per platform
- Edit account credentials
- Delete accounts
- Filter accounts by platform or status

#### Security
- **Client-side encryption**: Your credentials are encrypted before transmission
- **Local processing**: All automation happens on your machine
- **No cloud storage**: Your passwords never leave your control

### Dashboard Navigation

- **Dashboard**: Overview of your account and recent activity
- **Posts**: Create new posts and view post history
- **Accounts**: Manage your social media accounts
- **Clients**: Download and manage your local agents
- **Settings**: Update your profile and preferences

### Troubleshooting

#### Agent Not Processing Posts

1. Check that the agent is installed and running
2. Verify the agent status shows "Online" in the Clients page
3. Ensure you have active accounts added
4. Check that posts are in "queued" status

#### Account Verification Failed

1. Verify your username and password are correct
2. Check if the account is locked (some platforms lock accounts after multiple failed attempts)
3. Try removing and re-adding the account

#### Post Failed

1. Check the post history for error details
2. Verify the target accounts are still active
3. Ensure the image URL is accessible
4. Check if the platform has any restrictions

### Support

For issues or questions:
- Check the [Visual Recording Guide](docs/VISUAL_RECORDING_GUIDE.md)
- Review the [Workflows Documentation](docs/WORKFLOWS.md)
- Contact support through the dashboard

---

## 🚀 Deployment

This project is configured for Vercel deployment. See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

---

## 📄 License

[Add your license information here]
