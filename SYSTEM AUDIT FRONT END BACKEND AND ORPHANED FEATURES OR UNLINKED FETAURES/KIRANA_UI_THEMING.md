# Kirana-UI Theming Guide

Complete guide to theming and customizing Kirana-UI components.

---

## Table of Contents

1. [Theme System](#theme-system)
2. [Default Themes](#default-themes)
3. [Using Themes](#using-themes)
4. [Customizing Themes](#customizing-themes)
5. [Dark Mode](#dark-mode)
6. [Creating Custom Themes](#creating-custom-themes)
7. [Advanced Theming](#advanced-theming)

---

## Theme System

Kirana-UI uses a flexible theming system based on:
- React Context API for theme distribution
- CSS variables for dynamic theming
- Tailwind CSS for styling
- localStorage for persistence

### How It Works

1. **ThemeProvider** wraps your app and manages theme state
2. **useTheme()** hook provides access to current theme
3. **CSS Variables** update dynamically when theme changes
4. **Components** use CSS variables for colors
5. **localStorage** saves user's theme preference

---

## Default Themes

### Light Theme

```javascript
const lightTheme = {
  primary: '#3b82f6',      // Blue
  secondary: '#6b7280',    // Gray
  danger: '#ef4444',       // Red
  success: '#10b981',      // Green
  warning: '#f59e0b',      // Amber
  info: '#0ea5e9',         // Cyan
  background: '#ffffff',   // White
  surface: '#f9fafb',      // Gray-50
  text: '#1f2937',         // Gray-900
};
```

**Used for:**
- Primary actions (buttons, links)
- Success messages (alerts, badges)
- Informational content (info boxes)
- Normal text and backgrounds

### Dark Theme

```javascript
const darkTheme = {
  primary: '#60a5fa',      // Blue-400
  secondary: '#9ca3af',    // Gray-400
  danger: '#f87171',       // Red-400
  success: '#34d399',      // Green-400
  warning: '#fbbf24',      // Amber-400
  info: '#38bdf8',         // Cyan-400
  background: '#111827',   // Gray-900
  surface: '#1f2937',      // Gray-800
  text: '#f3f4f6',         // Gray-100
};
```

**Used for:**
- Reduced eye strain (dark backgrounds)
- Better contrast with light text
- Professional appearance
- Better for battery life on OLED screens

---

## Using Themes

### Setup

Wrap your app with ThemeProvider:

```typescript
import { ThemeProvider } from '@earlybird/kirana-ui';

export default function App() {
  return (
    <ThemeProvider>
      <MainContent />
    </ThemeProvider>
  );
}
```

### Accessing Theme

Use the `useTheme()` hook:

```typescript
import { useTheme } from '@earlybird/kirana-ui';

function MyComponent() {
  const { theme, isDark } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Is dark mode: {isDark ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### Theming Components

Components automatically use theme colors:

```typescript
// Button uses primary color
<Button variant="primary">Click me</Button>

// Alert uses danger color
<Alert variant="danger">Error occurred</Alert>

// All text uses theme text color
<p>Some text</p>
```

---

## Customizing Themes

### Theme Structure

```typescript
interface Theme {
  primary: string;      // Brand color
  secondary: string;    // Secondary color
  danger: string;       // Error/destructive color
  success: string;      // Success color
  warning: string;      // Warning color
  info: string;         // Info/informational color
  background: string;   // Page background
  surface: string;      // Card/container background
  text: string;         // Text color
}
```

### Custom Light Theme

```typescript
const customLightTheme = {
  primary: '#8b5cf6',      // Purple instead of blue
  secondary: '#ec4899',    // Pink
  danger: '#dc2626',       // Dark red
  success: '#059669',      // Dark green
  warning: '#d97706',      // Orange
  info: '#06b6d4',         // Cyan
  background: '#fafafa',   // Light gray
  surface: '#f3f4f6',      // Gray
  text: '#111827',         // Very dark gray
};
```

### Custom Dark Theme

```typescript
const customDarkTheme = {
  primary: '#a78bfa',      // Light purple
  secondary: '#f472b6',    // Light pink
  danger: '#ef4444',       // Bright red
  success: '#4ade80',      // Light green
  warning: '#fb923c',      // Light orange
  info: '#22d3ee',         // Light cyan
  background: '#0f172a',   // Very dark blue
  surface: '#1e293b',      // Dark blue-gray
  text: '#e2e8f0',         // Light gray
};
```

### Apply Custom Themes

```typescript
import { ThemeProvider } from '@earlybird/kirana-ui';
import { customLightTheme, customDarkTheme } from './themes';

<ThemeProvider
  defaultTheme="light"
  themes={{
    light: customLightTheme,
    dark: customDarkTheme,
  }}
>
  <App />
</ThemeProvider>
```

---

## Dark Mode

### Automatic Dark Mode

Dark mode is automatically detected from system preference:

```typescript
// Just wrap with ThemeProvider - dark mode works automatically
<ThemeProvider>
  <App />
</ThemeProvider>
```

System preference is checked via `prefers-color-scheme` media query.

### Manual Dark Mode Toggle

Use the `useDarkMode()` hook:

```typescript
import { useDarkMode } from '@earlybird/kirana-ui';

function ThemeToggle() {
  const { isDark, toggle } = useDarkMode();

  return (
    <button onClick={toggle} className="p-2 rounded">
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
```

### Dark Mode Persistence

User's choice is automatically saved to localStorage:

```typescript
// If user toggles dark mode, it's saved
// On next page load, their preference is restored
// Even across browser sessions
```

### Force Light Mode

```typescript
<ThemeProvider forcedTheme="light">
  <App />
</ThemeProvider>
```

### Force Dark Mode

```typescript
<ThemeProvider forcedTheme="dark">
  <App />
</ThemeProvider>
```

### System Preference Only

```typescript
<ThemeProvider storageKey={null}>
  {/* Uses system preference, doesn't save user choice */}
  <App />
</ThemeProvider>
```

---

## Creating Custom Themes

### Step 1: Define Colors

Choose your color palette:

```typescript
// Brand colors
const brandColor = '#7c3aed';      // Your brand purple
const accentColor = '#06b6d4';     // Accent cyan

// Functional colors
const errorColor = '#dc2626';      // Red for errors
const successColor = '#16a34a';    // Green for success
const warningColor = '#d97706';    // Orange for warnings
const infoColor = '#0284c7';       // Blue for info
```

### Step 2: Create Themes

```typescript
// Light theme
export const myLightTheme = {
  primary: brandColor,
  secondary: accentColor,
  danger: errorColor,
  success: successColor,
  warning: warningColor,
  info: infoColor,
  background: '#ffffff',
  surface: '#f8fafc',
  text: '#0f172a',
};

// Dark theme (lighter versions for contrast)
export const myDarkTheme = {
  primary: '#a78bfa',      // Light purple
  secondary: '#22d3ee',    // Light cyan
  danger: '#ef4444',       // Bright red
  success: '#4ade80',      // Light green
  warning: '#fb923c',      // Light orange
  info: '#38bdf8',         // Light blue
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
};
```

### Step 3: Register Themes

```typescript
import { ThemeProvider } from '@earlybird/kirana-ui';
import { myLightTheme, myDarkTheme } from './themes';

<ThemeProvider
  themes={{
    light: myLightTheme,
    dark: myDarkTheme,
  }}
>
  <App />
</ThemeProvider>
```

### Step 4: Use in Components

Components automatically use your theme:

```typescript
// Uses your primary color (brandColor)
<Button variant="primary">Action</Button>

// Uses your success color
<Alert variant="success">Success!</Alert>

// Uses your text color
<p>Some text</p>
```

---

## Advanced Theming

### Theme with Extended Colors

```typescript
interface ExtendedTheme extends Theme {
  border: string;
  shadow: string;
  radius: string;
}

const advancedTheme = {
  // Base colors
  primary: '#3b82f6',
  secondary: '#6b7280',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#0ea5e9',
  background: '#ffffff',
  surface: '#f9fafb',
  text: '#1f2937',
  // Extended
  border: '#e5e7eb',
  shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  radius: '0.5rem',
};
```

### Theme with Gradients

```typescript
const gradientTheme = {
  ...lightTheme,
  primaryGradient: 'linear-gradient(to right, #3b82f6, #06b6d4)',
  successGradient: 'linear-gradient(to right, #10b981, #6ee7b7)',
};
```

### Conditional Theming by Route

```typescript
import { ThemeProvider } from '@earlybird/kirana-ui';
import { useLocation } from 'react-router-dom';
import { dashboardTheme, landingTheme } from './themes';

function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <ThemeProvider
      themes={{
        light: isDashboard ? dashboardTheme.light : landingTheme.light,
        dark: isDashboard ? dashboardTheme.dark : landingTheme.dark,
      }}
    >
      <Routes />
    </ThemeProvider>
  );
}
```

### Multi-Brand Theming

```typescript
const brands = {
  default: {
    light: defaultLightTheme,
    dark: defaultDarkTheme,
  },
  premium: {
    light: premiumLightTheme,
    dark: premiumDarkTheme,
  },
};

interface AppProps {
  brand: 'default' | 'premium';
}

export function App({ brand }: AppProps) {
  const brandTheme = brands[brand];

  return (
    <ThemeProvider
      themes={{
        light: brandTheme.light,
        dark: brandTheme.dark,
      }}
    >
      <MainApp />
    </ThemeProvider>
  );
}
```

---

## Tailwind CSS Integration

### Theme Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
      },
    },
  },
};
```

### CSS Variables

Components use CSS variables:

```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #6b7280;
  --color-danger: #ef4444;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-info: #0ea5e9;
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-text: #1f2937;
}

[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-secondary: #9ca3af;
  --color-danger: #f87171;
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-info: #38bdf8;
  --color-background: #111827;
  --color-surface: #1f2937;
  --color-text: #f3f4f6;
}
```

### Using Theme Colors in Tailwind

```typescript
// Works with Tailwind classes
<div className="bg-primary text-text">Content</div>

// Also works with dynamic classes
<div className={`bg-${variant} text-white`}>
  {/* Note: Dynamic classes may not work, use cn() instead */}
</div>

// Better: use cn() utility
import { cn } from '@earlybird/kirana-ui';
<div className={cn('text-white', variant === 'primary' && 'bg-primary')}>
  Content
</div>
```

---

## Best Practices

### 1. Consistent Color Meanings

```typescript
// ✅ Good - consistent meaning
primary: brandColor,    // Main brand color
danger: redColor,       // Destructive actions
success: greenColor,    // Positive feedback
```

```typescript
// ❌ Bad - confusing meaning
primary: randomColor,   // What is this?
danger: blueColor,      // Red should be danger
```

### 2. Sufficient Contrast

Ensure WCAG AA compliance (4.5:1 contrast ratio):

```typescript
// ✅ Good - high contrast
text: '#1f2937',     // Dark gray on white background
background: '#ffffff'

// ❌ Bad - poor contrast
text: '#f3f4f6',     // Light gray on white (barely visible)
background: '#ffffff'
```

### 3. Semantic Color Usage

```typescript
// ✅ Good - clear intent
success: greenColor,      // For positive actions
danger: redColor,         // For destructive actions
warning: orangeColor,     // For caution/warnings

// ❌ Bad - no clear intent
color1: '#3b82f6',
color2: '#ef4444',
color3: '#10b981',
```

### 4. Persistent Theming

Save theme choice to avoid flashing:

```typescript
// ✅ Good - theme is persisted
<ThemeProvider storageKey="app-theme">
  <App />
</ThemeProvider>

// ❌ Bad - theme resets on reload
<ThemeProvider storageKey={null}>
  <App />
</ThemeProvider>
```

### 5. Respect System Preference

Allow user's OS theme to be respected:

```typescript
// ✅ Good - respects system preference
<ThemeProvider>  {/* Automatically detects prefers-color-scheme */}
  <App />
</ThemeProvider>

// ❌ Bad - forces light mode
<ThemeProvider forcedTheme="light">
  <App />
</ThemeProvider>
```

---

## Troubleshooting

### Issue: Theme not applying

**Problem:** Components don't use custom colors.

**Solution:**
1. Verify ThemeProvider wraps app
2. Check theme object structure
3. Verify CSS variables are set
4. Check browser DevTools for CSS variables

```typescript
// Debug: Check theme values
const { theme } = useTheme();
console.log('Current theme:', theme);
```

---

### Issue: Dark mode not working

**Problem:** Dark mode toggle doesn't change appearance.

**Solution:**
1. Check `prefers-color-scheme` is supported
2. Verify `darkMode: 'class'` in Tailwind config
3. Clear browser cache
4. Check that `dark:` classes exist in CSS

```javascript
// tailwind.config.js
darkMode: 'class',  // Required for dark mode
```

---

### Issue: Colors look washed out

**Problem:** Theme colors don't have good contrast.

**Solution:**
Use a color contrast checker:
- https://webaim.org/resources/contrastchecker/
- Aim for 4.5:1 ratio (WCAG AA)
- 7:1 ratio for better accessibility

```typescript
// Example: Better contrast
const accessibleTheme = {
  text: '#0f172a',     // Very dark (not gray-700)
  background: '#ffffff' // Pure white (not gray-50)
};
```

---

### Issue: Theme changes not persisting

**Problem:** User's theme choice is lost on reload.

**Solution:**
```typescript
// Verify storageKey is set
<ThemeProvider storageKey="my-app-theme">
  <App />
</ThemeProvider>

// Check localStorage manually
console.log(localStorage.getItem('my-app-theme'));
```

---

## Examples

### Corporate Theme

```typescript
export const corporateLight = {
  primary: '#003d82',      // Professional blue
  secondary: '#666666',    // Gray
  danger: '#d9534f',       // Red
  success: '#5cb85c',      // Green
  warning: '#f0ad4e',      // Orange
  info: '#5bc0de',         // Light blue
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#333333',
};

export const corporateDark = {
  primary: '#66b3ff',
  secondary: '#cccccc',
  danger: '#ff6b6b',
  success: '#66cc66',
  warning: '#ffcc66',
  info: '#66d9ff',
  background: '#1a1a1a',
  surface: '#2d2d2d',
  text: '#ffffff',
};
```

### Modern Minimalist Theme

```typescript
export const minimalLight = {
  primary: '#000000',      // Pure black
  secondary: '#808080',    // Gray
  danger: '#ff0000',       // Red
  success: '#00aa00',      // Green
  warning: '#ffaa00',      // Orange
  info: '#0099ff',         // Blue
  background: '#fafafa',
  surface: '#ffffff',
  text: '#222222',
};

export const minimalDark = {
  primary: '#ffffff',
  secondary: '#b0b0b0',
  danger: '#ff4444',
  success: '#44ff44',
  warning: '#ffaa44',
  info: '#44aaff',
  background: '#111111',
  surface: '#222222',
  text: '#eeeeee',
};
```

### Brand-Focused Theme

```typescript
export const brandTheme = {
  primary: '#ff6b35',      // Brand orange
  secondary: '#004e89',    // Brand blue
  danger: '#d62828',
  success: '#2a9d8f',
  warning: '#e9c46a',
  info: '#264653',
  background: '#fffbf7',   // Warm white
  surface: '#f4ede4',      // Warm gray
  text: '#1a1a1a',
};
```

---

**For more information, see [KIRANA_UI_SETUP.md](./KIRANA_UI_SETUP.md)**
