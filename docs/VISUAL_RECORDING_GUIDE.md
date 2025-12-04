# Visual Recording Best Practices Guide

## Overview

This guide provides best practices for creating reliable visual recordings that work consistently even when UI changes occur. Following these guidelines will ensure your automations are robust and maintainable.

## Table of Contents

1. [What Makes Good Visual Recordings](#what-makes-good-visual-recordings)
2. [Recording Best Practices](#recording-best-practices)
3. [Troubleshooting](#troubleshooting)
4. [Examples](#examples)
5. [Common Pitfalls](#common-pitfalls)

---

## What Makes Good Visual Recordings

### Key Principles

1. **Record on Clean Page State**
   - Wait for page to fully load before recording
   - Avoid recording during animations or transitions
   - Ensure no popups or overlays are blocking elements

2. **Ensure Elements Are Fully Visible**
   - Elements should not be off-screen or partially hidden
   - Scroll to element if needed before recording
   - Avoid recording elements in collapsed menus or modals

3. **Use Stable Elements**
   - Prefer buttons, links, and form fields over dynamic content
   - Avoid recording carousels, rotating banners, or auto-updating content
   - Choose elements with consistent text labels

4. **Provide Context**
   - Record surrounding text and elements for better matching
   - Include unique identifiers when possible
   - Avoid recording generic elements (e.g., "Submit" buttons without context)

---

## Recording Best Practices

### Before Recording

#### ✅ DO:
- **Wait for page load**: Ensure all resources are loaded
  ```javascript
  // Wait for network to be idle
  await page.goto(url, { waitUntil: 'networkidle2' });
  ```

- **Clear browser state**: Start with a clean session
  - Clear cookies and cache if needed
  - Use incognito/private mode for testing

- **Use consistent viewport**: Record at standard size (1280x720 recommended)
  - This ensures position calculations are consistent
  - Relative positions (% of viewport) work across screen sizes

#### ❌ DON'T:
- Record immediately after page load (wait for animations)
- Record during page transitions or redirects
- Record with browser extensions that modify the page
- Record on mobile viewports (use desktop for consistency)

### During Recording

#### ✅ DO:
- **Click elements directly**: Don't rely on coordinates alone
  - Visual recorder captures element context automatically
  - Provides better matching data

- **Type naturally**: Type at human-like speed
  - Recorder merges consecutive typing events
  - Template variables are auto-detected

- **Wait between actions**: Allow page to respond
  - Automatic waits are added, but manual waits help
  - Especially important after navigation or form submission

- **Record complete workflows**: Include all steps
  - Don't skip intermediate steps
  - Each action provides context for the next

#### ❌ DON'T:
- Record too quickly (actions may be missed)
- Record during loading states
- Record elements that are animating
- Record duplicate actions unnecessarily

### After Recording

#### ✅ DO:
- **Review the recording**: Check visual data quality
  - Verify screenshots are clear
  - Check that positions are reasonable
  - Ensure text was captured correctly

- **Test immediately**: Run the workflow right after recording
  - Catches issues early
  - Verifies recording quality

- **Optimize if needed**: Use screenshot optimization for large recordings
  - Reduces storage size
  - Maintains visual accuracy

#### ❌ DON'T:
- Skip verification step
- Record sensitive data (use template variables)
- Keep recordings with missing visual data

---

## Troubleshooting

### "Element not found" Error

**Symptoms**: Executor cannot find the target element

**Possible Causes**:
1. Element text changed
2. Element moved to different position
3. Element removed from page
4. Page structure changed

**Solutions**:

#### Check 1: Element Text Changed
```javascript
// Original recording
visual: { text: "Log In" }

// Current page
// Button now says "Sign In" or "Login"
```

**Fix**: 
- Use visual-first execution method
- Visual search uses position + image similarity
- Should still find element even if text changed

#### Check 2: Element Position Changed
```javascript
// Original position
position: { relative: { x: 50, y: 30 } }

// New position (moved)
position: { relative: { x: 60, y: 40 } }
```

**Fix**:
- Visual search has 15% position tolerance
- If moved more than 15%, may need to re-record
- Check if element is still on page

#### Check 3: Element Removed
```javascript
// Element no longer exists on page
// Selector returns null
// Visual search finds no matches
```

**Fix**:
- Verify page URL is correct
- Check if element was removed in UI update
- Re-record workflow on new UI

#### Check 4: Page Structure Changed
```javascript
// Complete UI redesign
// All selectors invalid
// Visual data doesn't match
```

**Fix**:
- Re-record entire workflow
- Update execution method to visual-first
- Consider splitting into smaller workflows

### "Multiple matches" Warning

**Symptoms**: Visual search finds multiple candidates

**Possible Causes**:
1. Similar elements on page (e.g., multiple "Submit" buttons)
2. Position tolerance too wide
3. Text too generic

**Solutions**:

#### Solution 1: Use More Specific Context
```javascript
// Generic
visual: { text: "Submit" }

// Better
visual: { 
  text: "Submit",
  surroundingText: ["Login Form", "Enter your credentials"]
}
```

**Fix**: Re-record with more surrounding context

#### Solution 2: Tighten Position Tolerance
```javascript
// Current: 15% tolerance
// If element moved < 15%, should still find it
// If multiple matches, image comparison will pick best
```

**Fix**: Visual executor automatically uses image comparison when multiple matches found

#### Solution 3: Use Unique Text
```javascript
// Instead of "Submit", use "Log In to Instagram"
// More specific text = fewer matches
```

**Fix**: Record element with more unique text when possible

### "Low confidence match" Warning

**Symptoms**: Image similarity score < 70%

**Possible Causes**:
1. Screenshot quality too low
2. Element appearance changed significantly
3. Different browser/OS rendering

**Solutions**:

#### Solution 1: Re-record with Better Quality
```javascript
// Ensure element is fully visible
// Wait for animations to complete
// Use higher quality screenshot (not optimized too much)
```

**Fix**: Re-record action with element in stable state

#### Solution 2: Check Element Appearance
```javascript
// Element may have been redesigned
// Colors, fonts, or layout changed
```

**Fix**: If element appearance changed significantly, re-record

#### Solution 3: Verify Browser/OS
```javascript
// Different browsers render differently
// Fonts, spacing, colors may vary
```

**Fix**: Record and execute on same browser/OS when possible

---

## Examples

### Example 1: Good Recording - Login Form

```javascript
// ✅ GOOD: Complete context
{
  type: "click",
  visual: {
    screenshot: "data:image/png;base64,...",
    text: "Log In",
    position: { relative: { x: 50, y: 40 } },
    surroundingText: [
      "Instagram",
      "Username or email",
      "Password"
    ]
  },
  backup_selector: "button[type='submit']"
}
```

**Why it's good**:
- Clear text label
- Good surrounding context
- Backup selector available
- Position is reasonable

### Example 2: Bad Recording - Generic Button

```javascript
// ❌ BAD: Too generic
{
  type: "click",
  visual: {
    screenshot: "data:image/png;base64,...",
    text: "Submit",  // Too generic
    position: { relative: { x: 50, y: 50 } },
    surroundingText: []  // No context
  },
  backup_selector: "button"  // Too generic
}
```

**Why it's bad**:
- Generic text ("Submit" appears multiple times)
- No surrounding context
- Generic selector
- Hard to match uniquely

### Example 3: Good Recording - Input Field

```javascript
// ✅ GOOD: Specific input field
{
  type: "type",
  visual: {
    screenshot: "data:image/png;base64,...",
    text: "",
    placeholder: "Username or email",
    position: { relative: { x: 50, y: 30 } },
    surroundingText: [
      "Log in to Instagram",
      "Username or email",
      "Password"
    ]
  },
  backup_selector: "input[name='username']",
  text: "{{username}}"
}
```

**Why it's good**:
- Placeholder provides context
- Specific selector (name attribute)
- Template variable used
- Good surrounding text

---

## Common Pitfalls

### Pitfall 1: Recording During Animations

**Problem**: Element position changes during animation

**Solution**: Wait for animations to complete before recording

```javascript
// Wait for animation
await page.waitForTimeout(500);
// Then record
```

### Pitfall 2: Recording Off-Screen Elements

**Problem**: Element not fully visible, screenshot incomplete

**Solution**: Scroll to element first

```javascript
// Scroll to element
await page.evaluate((selector) => {
  document.querySelector(selector).scrollIntoView();
}, selector);
// Then record
```

### Pitfall 3: Recording Dynamic Content

**Problem**: Carousel or rotating content changes between record and execution

**Solution**: Avoid recording dynamic content, or record specific slide

```javascript
// Wait for specific content
await page.waitForSelector('.carousel-slide.active');
// Then record
```

### Pitfall 4: Not Using Template Variables

**Problem**: Real credentials stored in recording

**Solution**: Always use template variables

```javascript
// ✅ GOOD
text: "{{username}}"
text: "{{password}}"

// ❌ BAD
text: "myusername123"
text: "mypassword456"
```

### Pitfall 5: Recording Too Quickly

**Problem**: Actions may be missed or merged incorrectly

**Solution**: Allow natural timing between actions

```javascript
// Automatic waits are added, but manual waits help
await page.waitForTimeout(1000);
```

---

## Quick Reference Checklist

### Before Recording
- [ ] Page fully loaded (networkidle2)
- [ ] No animations or transitions
- [ ] No popups or overlays
- [ ] Consistent viewport size (1280x720)
- [ ] Clean browser state

### During Recording
- [ ] Click elements directly (not coordinates)
- [ ] Type at natural speed
- [ ] Wait between actions
- [ ] Record complete workflows
- [ ] Use template variables for sensitive data

### After Recording
- [ ] Review visual data quality
- [ ] Test workflow immediately
- [ ] Verify screenshots are clear
- [ ] Check positions are reasonable
- [ ] Optimize if recording is large

### When Troubleshooting
- [ ] Check if element text changed
- [ ] Verify element position
- [ ] Confirm element still exists
- [ ] Review surrounding context
- [ ] Try visual-first execution method
- [ ] Re-record if UI changed significantly

---

## Additional Resources

- [Visual Executor Documentation](../src/modules-client/VISUAL_EXECUTOR.md)
- [Recorder CLI Guide](../tools/RECORDER_CLI.md)
- [Test Scripts](../tools/test-visual-recording.js)

---

## Support

If you encounter issues not covered in this guide:

1. Check the troubleshooting section
2. Review test scripts for examples
3. Verify recording quality
4. Try re-recording the workflow
5. Contact development team with:
   - Recording file
   - Error message
   - Page URL
   - Browser/OS information

