# Kirana-UI Setup & Installation Guide

Complete setup instructions for Kirana-UI component library.

---

## Table of Contents

1. [Installation](#installation)
2. [Setup](#setup)
3. [Basic Usage](#basic-usage)
4. [Theme Configuration](#theme-configuration)
5. [Dark Mode](#dark-mode)
6. [TypeScript](#typescript)
7. [Storybook](#storybook)
8. [Troubleshooting](#troubleshooting)

---

## Installation

### via npm

```bash
npm install @earlybird/kirana-ui
```

### via yarn

```bash
yarn add @earlybird/kirana-ui
```

### via pnpm

```bash
pnpm add @earlybird/kirana-ui
```

### Requirements

- React 18.0.0 or higher
- React DOM 18.0.0 or higher
- Tailwind CSS 3.0.0 or higher

---

## Setup

### 1. Install Peer Dependencies

If not already installed:

```bash
npm install react react-dom tailwindcss
```

### 2. Configure Tailwind CSS

Update your `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@earlybird/kirana-ui/dist/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#6b7280',
        danger: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
        info: '#0ea5e9',
      },
    },
  },
  plugins: [],
};
```

### 3. Import CSS

In your main application file (e.g., `src/main.tsx` or `src/index.tsx`):

```typescript
import '@earlybird/kirana-ui/dist/styles.css';
import './index.css';
```

### 4. Add ThemeProvider

Wrap your application with ThemeProvider:

```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@earlybird/kirana-ui';
import App from './App';
import '@earlybird/kirana-ui/dist/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

---

## Basic Usage

### Import Components

```typescript
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@earlybird/kirana-ui';
```

### Create a Simple Form

```typescript
import { Button, Input, Card, CardHeader, CardContent, CardFooter } from '@earlybird/kirana-ui';
import { useState } from 'react';

export function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ name, email });
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <h2 className="text-xl font-bold">Sign Up</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            isRequired
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            isRequired
          />
        </form>
      </CardContent>
      <CardFooter>
        <Button variant="primary" type="submit" fullWidth>
          Create Account
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## Theme Configuration

### Customize Theme

Create a custom theme configuration:

```typescript
// src/theme.ts
export const lightTheme = {
  primary: '#3b82f6',
  secondary: '#6b7280',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#0ea5e9',
  background: '#ffffff',
  surface: '#f9fafb',
  text: '#1f2937',
};

export const darkTheme = {
  primary: '#60a5fa',
  secondary: '#9ca3af',
  danger: '#f87171',
  success: '#34d399',
  warning: '#fbbf24',
  info: '#38bdf8',
  background: '#111827',
  surface: '#1f2937',
  text: '#f3f4f6',
};
```

### Apply Custom Theme

```typescript
import { ThemeProvider } from '@earlybird/kirana-ui';
import { lightTheme, darkTheme } from './theme';

<ThemeProvider defaultTheme="light" themes={{ light: lightTheme, dark: darkTheme }}>
  <App />
</ThemeProvider>
```

---

## Dark Mode

### Automatic Dark Mode

Dark mode is automatically enabled based on system preference (uses `prefers-color-scheme`):

```typescript
// No configuration needed - works out of the box!
<ThemeProvider>
  <App />
</ThemeProvider>
```

### Manual Dark Mode Toggle

```typescript
import { useDarkMode } from '@earlybird/kirana-ui';

export function ThemeToggle() {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      onClick={toggle}
      className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded"
    >
      {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
    </button>
  );
}
```

### Check Current Theme

```typescript
import { useTheme } from '@earlybird/kirana-ui';

export function CurrentTheme() {
  const { theme, isDark } = useTheme();

  return <p>Current theme: {theme} {isDark && '(Dark mode)'}</p>;
}
```

### Persistence

Dark mode preference is automatically saved to localStorage and restored on page reload.

---

## TypeScript

### Full TypeScript Support

All components are fully typed:

```typescript
import { Button, ButtonProps, Input, InputProps, Card, CardProps } from '@earlybird/kirana-ui';

// Type-safe component props
const MyButton: React.FC<ButtonProps> = (props) => (
  <Button variant="primary" {...props} />
);

const MyInput: React.FC<InputProps> = (props) => (
  <Input label="Username" {...props} />
);

const MyCard: React.FC<CardProps> = (props) => (
  <Card variant="elevated" {...props} />
);
```

### Component Prop Types

Each component has strict TypeScript interfaces:

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'dense';
  isRequired?: boolean;
}
```

### Type Utilities

```typescript
import { cn } from '@earlybird/kirana-ui';

// Type-safe class merging
const buttonClass = cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500',
  disabled && 'opacity-50'
);
```

---

## Storybook

### View Component Demos

Run Storybook to see all components and their variations:

```bash
npm run storybook
```

Storybook opens at `http://localhost:6006`

### Features

- **Interactive Demos** - Change props and see results in real-time
- **Dark Mode Toggle** - Test components in both light and dark modes
- **Responsive Preview** - See how components look on different screen sizes
- **Accessibility Audit** - Built-in a11y checking
- **Code View** - See the JSX code for each component

### Storybook File Structure

```
storybook/
├── stories/
│   ├── Button.stories.tsx
│   ├── Input.stories.tsx
│   ├── Card.stories.tsx
│   ├── Form.stories.tsx
│   ├── Modal.stories.tsx
│   └── ... (60+ stories total)
├── preview.ts          # Global configuration
└── manager.ts          # UI customization
```

---

## Common Patterns

### Form with Validation

```typescript
import { Form, Input, Button, Alert } from '@earlybird/kirana-ui';
import { useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate and submit
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        isRequired
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        isRequired
      />
      <Button type="submit" variant="primary" fullWidth>
        Login
      </Button>
    </Form>
  );
}
```

### Responsive Layout

```typescript
import { Container, HStack, VStack, Button } from '@earlybird/kirana-ui';
import { useResponsive } from '@earlybird/kirana-ui';

export function ResponsiveLayout() {
  const { isMobile } = useResponsive();

  return (
    <Container size="lg">
      {isMobile ? (
        <VStack gap={4}>
          <Button fullWidth>Option 1</Button>
          <Button fullWidth>Option 2</Button>
        </VStack>
      ) : (
        <HStack gap={4}>
          <Button>Option 1</Button>
          <Button>Option 2</Button>
        </HStack>
      )}
    </Container>
  );
}
```

### Toast Notifications

```typescript
import { Button, useToast } from '@earlybird/kirana-ui';

export function NotificationDemo() {
  const { showToast } = useToast();

  return (
    <div className="space-y-2">
      <Button onClick={() => showToast('Success!', 'success')}>
        Success
      </Button>
      <Button onClick={() => showToast('Error occurred', 'danger')}>
        Error
      </Button>
      <Button onClick={() => showToast('Warning', 'warning')}>
        Warning
      </Button>
    </div>
  );
}
```

---

## Troubleshooting

### Styles Not Applied

**Problem:** Components render but have no styling.

**Solution:**
1. Check that Tailwind CSS is installed: `npm install tailwindcss`
2. Verify `@earlybird/kirana-ui/dist/styles.css` is imported
3. Check `tailwind.config.js` includes the library:
```javascript
content: [
  './node_modules/@earlybird/kirana-ui/dist/**/*.js',
]
```
4. Restart dev server: `npm run dev`

---

### Theme Not Applying

**Problem:** Theme customization not working.

**Solution:**
1. Ensure `ThemeProvider` wraps your app:
```typescript
<ThemeProvider>
  <App />
</ThemeProvider>
```
2. Check theme configuration is correct
3. Verify components are using `useTheme()` hook
4. Check browser DevTools - look for `theme-light` or `theme-dark` class on html element

---

### Dark Mode Not Working

**Problem:** Dark mode toggle doesn't change appearance.

**Solution:**
1. Check system has `prefers-color-scheme` support (modern browsers)
2. Use `useDarkMode()` hook to toggle:
```typescript
const { isDark, toggle } = useDarkMode();
```
3. Ensure `dark:` classes are in Tailwind content:
```javascript
content: ['./src/**/*.{js,jsx,ts,tsx}']
```
4. Clear browser cache and rebuild

---

### TypeScript Errors

**Problem:** TypeScript shows type errors.

**Solution:**
1. Ensure `@earlybird/kirana-ui` package.json has `types` field
2. Check `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "skipLibCheck": true
  }
}
```
3. Update component imports with full type:
```typescript
import type { ButtonProps } from '@earlybird/kirana-ui';
```

---

### Import Errors

**Problem:** "Cannot find module @earlybird/kirana-ui"

**Solution:**
1. Install package: `npm install @earlybird/kirana-ui`
2. Verify package is in `node_modules/@earlybird`
3. Check `package.json` has the dependency:
```json
{
  "dependencies": {
    "@earlybird/kirana-ui": "^2.0.0"
  }
}
```
4. Run: `npm install` to ensure dependencies are installed

---

### Component Not Found

**Problem:** Specific component not exported.

**Solution:**
1. Check component name spelling:
```typescript
// Correct
import { Button, Input, Card } from '@earlybird/kirana-ui';

// Wrong (these don't exist)
import { PrimaryButton, TextField } from '@earlybird/kirana-ui';
```
2. See [KIRANA_UI_COMPONENTS.md](./KIRANA_UI_COMPONENTS.md) for all available components
3. Check Storybook for component variations: `npm run storybook`

---

### Performance Issues

**Problem:** Slow component rendering.

**Solution:**
1. Use `React.memo()` for expensive components:
```typescript
export const MemoizedButton = React.memo(Button);
```
2. Implement lazy loading:
```typescript
const Modal = React.lazy(() => import('@earlybird/kirana-ui').then(m => ({ default: m.Modal })));
```
3. Check for unnecessary re-renders with React DevTools Profiler
4. Verify Tailwind CSS is properly purged in production build

---

## Getting Help

### Documentation
- [Component API Reference](./KIRANA_UI_COMPONENTS.md)
- [Migration Guide](./KIRANA_UI_MIGRATION.md)
- [Theming Guide](./KIRANA_UI_THEMING.md)

### Community
- GitHub Issues: Report bugs and request features
- Storybook: View all components and usage examples
- Documentation: Complete API reference

### Support
For issues or questions:
1. Check this troubleshooting section
2. Search existing GitHub issues
3. Create a new GitHub issue with:
   - Description of problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (React version, npm version, etc.)

---

## Next Steps

1. ✅ Install the package
2. ✅ Setup Tailwind CSS
3. ✅ Add ThemeProvider
4. ✅ Import and use components
5. ✅ Explore Storybook: `npm run storybook`
6. ✅ Read component documentation
7. ✅ Build your application!

---

**Happy building with Kirana-UI!** 🚀
