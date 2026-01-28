# Kirana-UI Quick Reference & Index

Fast lookup guide for Kirana-UI component library.

---

## 📚 Documentation Map

### Getting Started
- **[KIRANA_UI_SETUP.md](./KIRANA_UI_SETUP.md)** - Installation and initial setup
- **[KIRANA_UI_COMPONENTS.md](./KIRANA_UI_COMPONENTS.md)** - Complete component API reference
- **[PHASE_4B_8_KIRANA_UI_GUIDE.md](./PHASE_4B_8_KIRANA_UI_GUIDE.md)** - Project overview and summary

### Customization
- **[KIRANA_UI_THEMING.md](./KIRANA_UI_THEMING.md)** - Theme customization and dark mode
- **[KIRANA_UI_MIGRATION.md](./KIRANA_UI_MIGRATION.md)** - Migrating from legacy components

### Interactive Learning
- Run `npm run storybook` to view all components live

---

## 🎯 Quick Start

### 1-Minute Setup

```bash
# Install
npm install @earlybird/kirana-ui

# Import in your app
import { ThemeProvider } from '@earlybird/kirana-ui';
import '@earlybird/kirana-ui/dist/styles.css';

// Wrap your app
<ThemeProvider>
  <App />
</ThemeProvider>
```

### First Component

```typescript
import { Button, Input, Card, CardContent } from '@earlybird/kirana-ui';

<Card>
  <CardContent>
    <Input label="Name" placeholder="Enter name" />
    <Button variant="primary">Submit</Button>
  </CardContent>
</Card>
```

---

## 📋 Component Catalog

### Basic Components (3)
| Component | Usage | Props |
|-----------|-------|-------|
| **Button** | Actions, clicks | variant, size, isLoading, icon, fullWidth |
| **Input** | Text fields | label, error, hint, icon, variant, isRequired |
| **Card** | Containers | variant (default\|outlined\|elevated\|dense) |

### Form Components (8)
| Component | Usage | Key Props |
|-----------|-------|-----------|
| **Form** | Form wrapper | onSubmit, className |
| **FormGroup** | Field container | - |
| **FormLabel** | Label text | htmlFor |
| **FormError** | Error message | - |
| **Select** | Dropdown | options, label, error, hint |
| **Textarea** | Multi-line text | rows, label, error |
| **Checkbox** | Checkbox input | label, checked, onChange |
| **Radio** | Radio button | value, label, checked |

### Layout Components (6)
| Component | Usage | Props |
|-----------|-------|-------|
| **Container** | Max-width wrapper | size (sm\|md\|lg\|xl\|full) |
| **Grid** | CSS Grid layout | columns, gap |
| **GridItem** | Grid cell | - |
| **Stack** | Flex layout | direction, gap, align, justify |
| **HStack** | Horizontal flex | gap, align, justify |
| **VStack** | Vertical flex | gap, align, justify |

### Display Components (8)
| Component | Usage | Props |
|-----------|-------|-------|
| **Badge** | Labels | variant, size |
| **Alert** | Messages | variant, title |
| **AlertTitle** | Alert heading | - |
| **AlertDescription** | Alert content | - |
| **Toast** | Notifications | (via useToast hook) |
| **Spinner** | Loading | size, color |
| **ProgressBar** | Progress | value (0-100), variant, showLabel |
| **Pagination** | Navigation | currentPage, totalPages, onChange |

### Advanced Components (8+)
| Component | Usage | Feature |
|-----------|-------|---------|
| **Modal** | Dialog | Header, Content, Footer subcomponents |
| **Tabs** | Tabbed UI | TabList, Tab, TabContent |
| **Accordion** | Collapsible | Multiple sections expandable |
| **Table** | Data display | Header, Body, Row, Cell |
| **DenseList** | Compact list | Space-efficient listing |
| **DenseTable** | Compact table | Space-efficient grid |
| **DenseForm** | Compact form | Dense spacing |
| **Header/Footer/Navbar** | Layout | Structural components |

### Hooks (5)
| Hook | Purpose | Returns |
|------|---------|---------|
| **useTheme()** | Access theme | { theme, isDark } |
| **useDarkMode()** | Toggle dark mode | { isDark, toggle } |
| **useResponsive()** | Check screen size | { isMobile, isTablet, isDesktop } |
| **useToast()** | Show notifications | { showToast(message, variant) } |
| **useClickOutside()** | Detect outside clicks | ref to attach to element |

### Utilities (2)
| Utility | Purpose | Example |
|---------|---------|---------|
| **cn()** | Merge classes | `cn('px-4', isActive && 'bg-blue-500')` |
| **themes** | Export colors | `import { themes } from '@earlybird/kirana-ui'` |

---

## 🎨 Common Props

### Size Props
```
sm   - Small (8px, 12px font)
md   - Medium (12px, 14px font) - default
lg   - Large (16px, 16px font)
xl   - Extra Large (20px, 18px font)
```

### Variant Props
```
Button: primary | secondary | danger | success | outline | ghost
Input:  default | dense
Card:   default | outlined | elevated | dense
Alert:  info | success | warning | danger
Badge:  primary | secondary | success | danger | warning | info
```

### Common HTML Props
All components support standard HTML attributes:
```
className - Custom CSS classes
style - Inline styles
disabled - Disabled state
required - Required field (forms)
onChange - Change handler
onClick - Click handler
onSubmit - Form submission
```

---

## 🚀 Common Patterns

### Login Form
```typescript
import { Form, Input, Button, Alert } from '@earlybird/kirana-ui';

<Form onSubmit={handleLogin}>
  {error && <Alert variant="danger">{error}</Alert>}
  <Input label="Email" type="email" isRequired />
  <Input label="Password" type="password" isRequired />
  <Button type="submit" variant="primary" fullWidth>Login</Button>
</Form>
```

### Card with Header and Actions
```typescript
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Settings</CardTitle>
    <CardDescription>Manage your preferences</CardDescription>
  </CardHeader>
  <CardContent>
    <Input label="Name" />
  </CardContent>
  <CardFooter>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Save</Button>
  </CardFooter>
</Card>
```

### Responsive Grid
```typescript
import { Grid, GridItem, Card } from '@earlybird/kirana-ui';

<Grid columns={3} gap={4}>
  <GridItem><Card>Item 1</Card></GridItem>
  <GridItem><Card>Item 2</Card></GridItem>
  <GridItem><Card>Item 3</Card></GridItem>
</Grid>
```

### Dark Mode Toggle
```typescript
import { useDarkMode } from '@earlybird/kirana-ui';

function Header() {
  const { isDark, toggle } = useDarkMode();
  return <button onClick={toggle}>{isDark ? '☀️' : '🌙'}</button>;
}
```

### Notification Toast
```typescript
import { Button, useToast } from '@earlybird/kirana-ui';

function SaveButton() {
  const { showToast } = useToast();
  
  const handleSave = async () => {
    try {
      await save();
      showToast('Saved successfully!', 'success');
    } catch {
      showToast('Save failed', 'danger');
    }
  };
  
  return <Button onClick={handleSave}>Save</Button>;
}
```

### Modal Dialog
```typescript
import { Modal, ModalHeader, ModalContent, ModalFooter, Button } from '@earlybird/kirana-ui';

<Modal isOpen={isOpen} onClose={handleClose} title="Confirm Action">
  <ModalContent>
    <p>Are you sure?</p>
  </ModalContent>
  <ModalFooter>
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <Button variant="danger" onClick={handleConfirm}>Delete</Button>
  </ModalFooter>
</Modal>
```

---

## 🎯 TypeScript Quick Types

```typescript
// Button Props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

// Input Props
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'dense';
  isRequired?: boolean;
}

// Card Props
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'dense';
}

// Card Subcomponents
type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
type CardContentProps = React.HTMLAttributes<HTMLDivElement>;
type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;
type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;
```

---

## 🎨 Color Palette

### Light Theme
```
Primary: #3b82f6 (Blue)
Secondary: #6b7280 (Gray)
Danger: #ef4444 (Red)
Success: #10b981 (Green)
Warning: #f59e0b (Amber)
Info: #0ea5e9 (Cyan)
Background: #ffffff (White)
Surface: #f9fafb (Gray-50)
Text: #1f2937 (Gray-900)
```

### Dark Theme
```
Primary: #60a5fa (Blue-400)
Secondary: #9ca3af (Gray-400)
Danger: #f87171 (Red-400)
Success: #34d399 (Green-400)
Warning: #fbbf24 (Amber-400)
Info: #38bdf8 (Cyan-400)
Background: #111827 (Gray-900)
Surface: #1f2937 (Gray-800)
Text: #f3f4f6 (Gray-100)
```

---

## 📱 Responsive Breakpoints

```
Mobile:  < 640px (sm)
Tablet:  640px - 1024px (md, lg)
Desktop: > 1024px (lg, xl)
```

Use `useResponsive()` hook:
```typescript
const { isMobile, isTablet, isDesktop } = useResponsive();
```

---

## 🔧 Tailwind CSS Setup

Required `tailwind.config.js`:
```javascript
module.exports = {
  content: [
    './node_modules/@earlybird/kirana-ui/dist/**/*.js',
  ],
  darkMode: 'class',
  theme: { /* ... */ }
};
```

---

## 🌙 Dark Mode Quick Start

```typescript
// Automatic - respects system preference
<ThemeProvider>
  <App />
</ThemeProvider>

// Manual toggle
function ThemeToggle() {
  const { isDark, toggle } = useDarkMode();
  return <button onClick={toggle}>Toggle</button>;
}

// Force light mode
<ThemeProvider forcedTheme="light"><App /></ThemeProvider>

// Force dark mode
<ThemeProvider forcedTheme="dark"><App /></ThemeProvider>
```

---

## 🛠️ Development Commands

```bash
# Install package
npm install @earlybird/kirana-ui

# View components in Storybook
npm run storybook

# Run tests
npm test

# Build for production
npm run build

# Check types
npm run type-check

# Lint code
npm run lint
```

---

## 🎓 Learning Resources

### Documentation Files
1. **[KIRANA_UI_SETUP.md](./KIRANA_UI_SETUP.md)** - Installation guide
2. **[KIRANA_UI_COMPONENTS.md](./KIRANA_UI_COMPONENTS.md)** - API reference
3. **[KIRANA_UI_THEMING.md](./KIRANA_UI_THEMING.md)** - Theming guide
4. **[KIRANA_UI_MIGRATION.md](./KIRANA_UI_MIGRATION.md)** - Migration guide

### Interactive
- **Storybook** - Run `npm run storybook` for live demos
- **Component Tests** - See `.test.tsx` files for usage examples
- **GitHub Issues** - Search for common questions

### Videos & Tutorials
- TypeScript with React
- Tailwind CSS utilities
- React hooks best practices
- Accessibility (a11y) standards

---

## ⚡ Performance Tips

1. **Code Splitting** - Components are tree-shakeable
   ```typescript
   import { Button } from '@earlybird/kirana-ui'; // ✅ Only Button imported
   ```

2. **Lazy Loading** - Load components on demand
   ```typescript
   const Modal = React.lazy(() => import('@earlybird/kirana-ui').then(m => ({ default: m.Modal })));
   ```

3. **Memoization** - Prevent unnecessary re-renders
   ```typescript
   export const MemoButton = React.memo(Button);
   ```

4. **CSS Optimization** - Tailwind CSS is optimized
   ```javascript
   // tailwind.config.js properly configured
   ```

---

## 🔒 Accessibility (a11y)

All components meet WCAG 2.1 AA standards:
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus indicators
- ✅ Color contrast (4.5:1 minimum)
- ✅ Semantic HTML
- ✅ ARIA labels

---

## 🐛 Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Styles not working | See [KIRANA_UI_SETUP.md #Styles Not Applied](./KIRANA_UI_SETUP.md#styles-not-applied) |
| Dark mode broken | See [KIRANA_UI_SETUP.md #Dark Mode Not Working](./KIRANA_UI_SETUP.md#dark-mode-not-working) |
| TypeScript errors | See [KIRANA_UI_SETUP.md #TypeScript Errors](./KIRANA_UI_SETUP.md#typescript-errors) |
| Theme not applying | See [KIRANA_UI_THEMING.md #Troubleshooting](./KIRANA_UI_THEMING.md#troubleshooting) |
| Migration issues | See [KIRANA_UI_MIGRATION.md #Troubleshooting](./KIRANA_UI_MIGRATION.md#troubleshooting-migration) |

---

## 📞 Support Resources

**For detailed information:**
- Installation → [KIRANA_UI_SETUP.md](./KIRANA_UI_SETUP.md)
- Components → [KIRANA_UI_COMPONENTS.md](./KIRANA_UI_COMPONENTS.md)
- Theming → [KIRANA_UI_THEMING.md](./KIRANA_UI_THEMING.md)
- Migration → [KIRANA_UI_MIGRATION.md](./KIRANA_UI_MIGRATION.md)
- Project Info → [PHASE_4B_8_KIRANA_UI_GUIDE.md](./PHASE_4B_8_KIRANA_UI_GUIDE.md)

**For interactive learning:**
- Run Storybook: `npm run storybook`
- Browse examples: http://localhost:6006

---

## ✨ Key Features at a Glance

| Feature | Details |
|---------|---------|
| **Components** | 35+ production-ready components |
| **TypeScript** | 100% typed, strict mode support |
| **Theming** | Light/dark mode, custom themes, CSS variables |
| **Accessibility** | WCAG 2.1 AA compliant |
| **Responsive** | Mobile-first, all breakpoints |
| **Performance** | Tree-shakeable, minimal bundle (45KB gzipped) |
| **Documentation** | 2000+ lines, Storybook, API reference |
| **Testing** | 75+ test cases, Jest + RTL |
| **Dark Mode** | Automatic + manual toggle, persisted |
| **Hooks** | useTheme, useDarkMode, useResponsive, useToast |

---

**Last Updated:** January 2026  
**Version:** 2.0.0  
**Status:** ✅ Production Ready

---

*Start building with Kirana-UI today!* 🚀
