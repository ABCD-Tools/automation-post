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

### Quick Start

```bash
# Record a workflow
npm run record

# Test recording
npm run test:recording

# Test execution
npm run test:execution
```

📖 **Learn More**: 
- [Visual Recording Guide](docs/VISUAL_RECORDING_GUIDE.md) - Best practices and troubleshooting
- [Selector vs Visual Comparison](docs/SELECTOR_VS_VISUAL.md) - When to use each approach

## Setup

### Prerequisites

1. Install Node.js (v18 or higher) from [nodejs.org](https://nodejs.org/)
2. Install pnpm globally:
```bash
npm install -g pnpm
```

### Install Dependencies

Install project dependencies:
```bash
pnpm install
```

Run development server:
```bash
pnpm dev
```

Build for production:
```bash
pnpm build
```

Start production server:
```bash
pnpm start
```

## Deployment

This project is configured for Vercel deployment.

