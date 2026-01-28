# Kirana-UI Component API Reference

Complete documentation for all components in the Kirana-UI library.

---

## Basic Components

### Button

Versatile button component with multiple variants and sizes.

```typescript
import { Button } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}
```

**Variants:**
- `primary` - Main action button (blue)
- `secondary` - Secondary action (gray)
- `danger` - Destructive action (red)
- `success` - Positive action (green)
- `outline` - Border style
- `ghost` - Text-only style

**Sizes:**
- `sm` - Small (8px padding, 12px font)
- `md` - Medium (12px padding, 14px font) - default
- `lg` - Large (16px padding, 16px font)
- `xl` - Extra large (20px padding, 18px font)

**Examples:**

Basic button:
```typescript
<Button variant="primary">Click me</Button>
```

Loading state:
```typescript
<Button isLoading variant="primary">Save</Button>
```

With icon:
```typescript
<Button icon={<SaveIcon />} variant="primary">Save</Button>
```

Full width:
```typescript
<Button fullWidth variant="primary">Submit</Button>
```

---

### Input

Text input with label, error message, and hint text.

```typescript
import { Input } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'dense';
  isRequired?: boolean;
  className?: string;
}
```

**Features:**
- Label with required indicator
- Error message display
- Hint text support
- Left-aligned icon
- Dense compact variant
- Dark mode support
- Focus ring styling

**Examples:**

Basic input:
```typescript
<Input label="Name" placeholder="Enter your name" />
```

With validation:
```typescript
<Input
  label="Email"
  type="email"
  error="Invalid email format"
  isRequired
/>
```

With icon:
```typescript
<Input
  label="Search"
  icon={<SearchIcon />}
  placeholder="Search..."
/>
```

Hint text:
```typescript
<Input
  label="Password"
  type="password"
  hint="Must be at least 8 characters"
/>
```

Dense variant:
```typescript
<Input variant="dense" label="Username" />
```

---

### Card

Flexible container component for grouping content.

```typescript
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@earlybird/kirana-ui';
```

**Card Props:**
```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'dense';
  className?: string;
}
```

**Card Variants:**
- `default` - Standard card with subtle shadow
- `outlined` - Border-based card
- `elevated` - Prominent shadow card
- `dense` - Compact spacing

**Subcomponents:**

```typescript
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
}
```

**Examples:**

Basic card:
```typescript
<Card>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>
```

Full card layout:
```typescript
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Subtitle or description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Main content</p>
  </CardContent>
  <CardFooter>
    <Button variant="primary">Action</Button>
  </CardFooter>
</Card>
```

---

## Form Components

### Form

Form wrapper with validation support.

```typescript
import { Form, FormGroup, FormLabel, FormError } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}
```

**Example:**
```typescript
<Form onSubmit={handleSubmit}>
  <FormGroup>
    <FormLabel htmlFor="name">Name</FormLabel>
    <Input id="name" />
    <FormError>Name is required</FormError>
  </FormGroup>
</Form>
```

### Select

Dropdown selection component.

```typescript
import { Select } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  isRequired?: boolean;
  className?: string;
}
```

**Example:**
```typescript
<Select
  label="Category"
  options={[
    { value: 'tech', label: 'Technology' },
    { value: 'business', label: 'Business' }
  ]}
/>
```

### Modal

Dialog/modal component with header, content, and footer.

```typescript
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}
```

**Example:**
```typescript
const [isOpen, setIsOpen] = useState(false);

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Confirm">
  <ModalContent>
    <p>Are you sure?</p>
  </ModalContent>
  <ModalFooter>
    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button variant="danger">Delete</Button>
  </ModalFooter>
</Modal>
```

---

## Layout Components

### Container

Responsive container with max-width constraint.

```typescript
import { Container } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}
```

**Sizes:**
- `sm` - 640px
- `md` - 768px
- `lg` - 1024px
- `xl` - 1280px
- `full` - 100%

### Grid

CSS Grid layout component.

```typescript
import { Grid, GridItem } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number;
  gap?: number;
  className?: string;
}
```

**Example:**
```typescript
<Grid columns={3} gap={4}>
  <GridItem>Item 1</GridItem>
  <GridItem>Item 2</GridItem>
  <GridItem>Item 3</GridItem>
</Grid>
```

### Stack

Flexible box layout (HStack, VStack).

```typescript
import { Stack, HStack, VStack } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
}
```

**Examples:**
```typescript
<HStack gap={4}>
  <Button>Cancel</Button>
  <Button>Submit</Button>
</HStack>

<VStack gap={2}>
  <Input label="Name" />
  <Input label="Email" />
</VStack>
```

---

## Display Components

### Badge

Label badge component.

```typescript
import { Badge } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Example:**
```typescript
<Badge variant="success">Active</Badge>
<Badge variant="danger">Error</Badge>
```

### Alert

Alert box with variants.

```typescript
import { Alert, AlertTitle, AlertDescription } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  className?: string;
}
```

**Example:**
```typescript
<Alert variant="success" title="Success">
  Your changes have been saved.
</Alert>
```

### Toast

Toast notification component.

```typescript
import { useToast } from '@earlybird/kirana-ui';
```

**Usage:**
```typescript
function MyComponent() {
  const { showToast } = useToast();

  return (
    <button onClick={() => showToast('Success!', 'success')}>
      Show Toast
    </button>
  );
}
```

### Spinner

Loading spinner component.

```typescript
import { Spinner } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}
```

**Example:**
```typescript
<Spinner size="lg" />
```

### ProgressBar

Progress indicator component.

```typescript
import { ProgressBar } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  className?: string;
}
```

**Example:**
```typescript
<ProgressBar value={65} label="65%" />
```

### Tabs

Tabbed interface component.

```typescript
import { Tabs, TabList, Tab, TabContent } from '@earlybird/kirana-ui';
```

**Props:**
```typescript
interface TabsProps {
  defaultTab?: string;
  onChange?: (tab: string) => void;
  children: React.ReactNode;
  className?: string;
}
```

**Example:**
```typescript
<Tabs defaultTab="tab1">
  <TabList>
    <Tab id="tab1">Tab 1</Tab>
    <Tab id="tab2">Tab 2</Tab>
  </TabList>
  <TabContent id="tab1">Content 1</TabContent>
  <TabContent id="tab2">Content 2</TabContent>
</Tabs>
```

---

## Hooks

### useTheme

Access theme context.

```typescript
import { useTheme } from '@earlybird/kirana-ui';

function MyComponent() {
  const { theme, isDark } = useTheme();
  // theme: 'light' | 'dark' | 'system'
  // isDark: boolean
}
```

### useDarkMode

Toggle dark mode.

```typescript
import { useDarkMode } from '@earlybird/kirana-ui';

function ThemeToggle() {
  const { isDark, toggle } = useDarkMode();

  return <button onClick={toggle}>{isDark ? 'Light' : 'Dark'}</button>;
}
```

### useResponsive

Detect responsive breakpoints.

```typescript
import { useResponsive } from '@earlybird/kirana-ui';

function MyComponent() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

### useToast

Show toast notifications.

```typescript
import { useToast } from '@earlybird/kirana-ui';

function MyComponent() {
  const { showToast } = useToast();

  return (
    <button onClick={() => showToast('Saved!', 'success')}>
      Save
    </button>
  );
}
```

---

## Utilities

### cn

Merge Tailwind CSS classes.

```typescript
import { cn } from '@earlybird/kirana-ui';

const classes = cn(
  'px-4 py-2',
  isActive && 'bg-blue-500',
  disabled && 'opacity-50 cursor-not-allowed'
);
```

---

## Theming

### Default Light Theme
```javascript
{
  primary: '#3b82f6',
  secondary: '#6b7280',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#0ea5e9',
  background: '#ffffff',
  surface: '#f9fafb',
  text: '#1f2937'
}
```

### Default Dark Theme
```javascript
{
  primary: '#60a5fa',
  secondary: '#9ca3af',
  danger: '#f87171',
  success: '#34d399',
  warning: '#fbbf24',
  info: '#38bdf8',
  background: '#111827',
  surface: '#1f2937',
  text: '#f3f4f6'
}
```

---

## Accessibility

All components follow WCAG 2.1 AA standards:

- ✅ Keyboard navigation
- ✅ Screen reader support (ARIA)
- ✅ Focus management
- ✅ Color contrast (4.5:1 minimum)
- ✅ Semantic HTML
- ✅ Touch-friendly (48px minimum)

---

## TypeScript Support

Full TypeScript support with complete type definitions.

```typescript
import { Button, ButtonProps, Card, CardProps } from '@earlybird/kirana-ui';

// Type-safe component usage
const SafeButton: React.FC<ButtonProps> = (props) => (
  <Button {...props} />
);
```

---

## Dark Mode

All components automatically support dark mode:

```typescript
import { ThemeProvider } from '@earlybird/kirana-ui';

<ThemeProvider>
  <App />
</ThemeProvider>
```

User's system preference is automatically detected. Manual override available via `useDarkMode()`.

---

**For more details and examples, see the main Kirana-UI documentation.**
