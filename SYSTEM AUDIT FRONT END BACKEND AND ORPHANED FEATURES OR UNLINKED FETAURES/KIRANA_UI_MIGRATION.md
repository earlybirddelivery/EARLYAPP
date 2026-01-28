# Kirana-UI Migration Guide

Step-by-step guide for migrating from legacy Kirana-UI components to the modernized version.

---

## Overview

The modernized Kirana-UI provides:
- ✅ React 18+ support
- ✅ Full TypeScript typing
- ✅ Dark mode built-in
- ✅ Better accessibility
- ✅ Responsive design
- ✅ Smaller bundle size
- ✅ Better performance

---

## Before & After

### Button

**Legacy:**
```javascript
// Old code - no types, no dark mode
import Button from './kirana-ui';
<Button type="primary" size="large">Click Me</Button>
```

**Modern:**
```typescript
// New code - full types, dark mode, variants
import { Button } from '@earlybird/kirana-ui';
<Button variant="primary" size="lg">Click Me</Button>
```

### Input

**Legacy:**
```javascript
// Old - basic input only
<Input label="Name" />
```

**Modern:**
```typescript
// New - error handling, hints, icons, variants
<Input
  label="Name"
  error={nameError}
  hint="First and last name"
  icon={<UserIcon />}
  isRequired
/>
```

### Card

**Legacy:**
```javascript
// Old - no subcomponents
<Card>Content</Card>
```

**Modern:**
```typescript
// New - structured subcomponents
<Card variant="elevated">
  <CardHeader>
    <CardTitle>My Card</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

## Migration Steps

### Step 1: Install New Package

```bash
npm install @earlybird/kirana-ui
```

### Step 2: Setup Tailwind CSS

Ensure your `tailwind.config.js` includes:

```javascript
module.exports = {
  content: [
    './node_modules/@earlybird/kirana-ui/dist/**/*.js',
  ],
};
```

### Step 3: Add ThemeProvider

Wrap your app with ThemeProvider:

```typescript
import { ThemeProvider } from '@earlybird/kirana-ui';

<ThemeProvider>
  <App />
</ThemeProvider>
```

### Step 4: Update Imports

Replace old imports with new ones:

```typescript
// Old (remove)
import Button from './legacy/Button';
import Input from './legacy/Input';

// New (add)
import { Button, Input } from '@earlybird/kirana-ui';
```

### Step 5: Update Component Usage

Update component props and structure (see examples below).

### Step 6: Test and Verify

- Test all pages with new components
- Check dark mode works
- Verify responsive design
- Validate form submissions
- Test accessibility

### Step 7: Deploy

Deploy updated code to production.

---

## Component-by-Component Migration

### Button

**Old:**
```javascript
<Button type="primary" large onClick={handleClick}>Submit</Button>
<Button type="secondary">Cancel</Button>
<Button type="danger">Delete</Button>
<Button loading={isLoading}>Save</Button>
```

**New:**
```typescript
<Button variant="primary" size="lg" onClick={handleClick}>Submit</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger">Delete</Button>
<Button isLoading>Save</Button>
```

**Changes:**
- `type` → `variant` (primary, secondary, danger, success, outline, ghost)
- `large` → `size="lg"` (sm, md, lg, xl)
- `loading` → `isLoading`
- NEW: Icon support `icon={<Icon />}`
- NEW: Full width `fullWidth={true}`

---

### Input

**Old:**
```javascript
<Input label="Name" type="text" placeholder="Enter name" />
<Input error="Email invalid" />
```

**New:**
```typescript
<Input
  label="Name"
  type="text"
  placeholder="Enter name"
  isRequired
/>
<Input
  error="Email invalid"
  hint="Format: user@example.com"
  icon={<MailIcon />}
/>
```

**Changes:**
- Label now shows required indicator automatically
- NEW: `error` prop shows validation errors
- NEW: `hint` prop for helper text
- NEW: `icon` prop for input icons
- NEW: `variant="dense"` for compact layout
- NEW: Full dark mode support

---

### Card

**Old:**
```javascript
<Card>
  <h2>Title</h2>
  <p>Content</p>
  <button>Action</button>
</Card>
```

**New:**
```typescript
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Changes:**
- Subcomponents: CardHeader, CardContent, CardFooter
- CardTitle and CardDescription for structured headings
- NEW: Variants (default, outlined, elevated, dense)
- NEW: Better spacing and transitions
- NEW: Dark mode support

---

### Form

**Old:**
```javascript
<form onSubmit={handleSubmit}>
  <div>
    <label>Name</label>
    <input type="text" />
  </div>
  {nameError && <span>{nameError}</span>}
</form>
```

**New:**
```typescript
import { Form, FormGroup, FormLabel, FormError, Input, Button } from '@earlybird/kirana-ui';

<Form onSubmit={handleSubmit}>
  <FormGroup>
    <FormLabel htmlFor="name">Name</FormLabel>
    <Input id="name" isRequired />
    {nameError && <FormError>{nameError}</FormError>}
  </FormGroup>
  <Button type="submit">Submit</Button>
</Form>
```

**Changes:**
- Use structured Form components
- Better styling for errors
- Consistent spacing
- Accessibility built-in

---

### Modal

**Old:**
```javascript
{isOpen && (
  <div className="modal">
    <div className="modal-content">
      <h2>Confirm</h2>
      <p>Are you sure?</p>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onConfirm}>Confirm</button>
    </div>
  </div>
)}
```

**New:**
```typescript
import { Modal, ModalHeader, ModalContent, ModalFooter, Button } from '@earlybird/kirana-ui';

<Modal isOpen={isOpen} onClose={handleClose} title="Confirm">
  <ModalContent>
    <p>Are you sure?</p>
  </ModalContent>
  <ModalFooter>
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <Button variant="danger" onClick={handleConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

**Changes:**
- Built-in modal wrapper
- Automatic backdrop and overlay
- Keyboard handling (Escape to close)
- Focus management
- NEW: Size variants (sm, md, lg, xl)

---

### Common Props Changes

| Old Prop | New Prop | Notes |
|----------|----------|-------|
| `className` | `className` | Still supported, merged with internal classes |
| `style` | `style` | Still supported |
| `disabled` | `disabled` | Still supported (standard HTML) |
| `type="primary"` | `variant="primary"` | More semantic naming |
| `large` | `size="lg"` | Consistent size naming |
| `loading` | `isLoading` | Consistent boolean naming |
| `error={error}` | `error={error}` | Same, but now styled better |
| N/A | `isRequired` | New prop for required indicator |
| N/A | `icon={icon}` | New prop for icon support |
| N/A | `hint={text}` | New prop for helper text |

---

## Breaking Changes

### Removed Props

1. **Color props** - Use CSS variables instead
   ```typescript
   // Old (removed)
   <Button color="red" />
   
   // New (use CSS or Tailwind)
   <Button className="bg-red-500" />
   ```

2. **Custom styling props** - Use className instead
   ```typescript
   // Old (removed)
   <Button padding="20px" fontSize="16px" />
   
   // New (use className)
   <Button className="px-5 text-base" />
   ```

3. **Icon element injection in text** - Use icon prop
   ```typescript
   // Old (removed)
   <Button>
     <Icon /> Click
   </Button>
   
   // New (use icon prop)
   <Button icon={<Icon />}>Click</Button>
   ```

### Changed Behavior

1. **Dark mode is automatic** - No configuration needed
2. **Responsive is built-in** - Use responsive utilities
3. **Accessibility is required** - Semantic HTML always used
4. **TypeScript is enforced** - Type safety guaranteed

---

## Gradual Migration

If you have many components, you can migrate gradually:

### Phase 1: Install and Setup
- Install new package
- Setup Tailwind CSS
- Add ThemeProvider

### Phase 2: Core Components
- Migrate Button components first (most common)
- Migrate Input fields
- Migrate Card containers

### Phase 3: Complex Components
- Migrate Modal dialogs
- Migrate Form groups
- Migrate custom layouts

### Phase 4: Cleanup
- Remove old component code
- Remove legacy CSS
- Update imports everywhere
- Run tests

---

## Common Migration Patterns

### Pattern 1: Button Groups

**Old:**
```javascript
<div className="btn-group">
  <Button type="primary">Save</Button>
  <Button type="secondary">Cancel</Button>
</div>
```

**New:**
```typescript
import { HStack, Button } from '@earlybird/kirana-ui';

<HStack gap={2}>
  <Button variant="primary">Save</Button>
  <Button variant="secondary">Cancel</Button>
</HStack>
```

### Pattern 2: Form Layouts

**Old:**
```javascript
<div className="form-container">
  <div className="form-row">
    <Input label="First" />
    <Input label="Last" />
  </div>
</div>
```

**New:**
```typescript
import { Container, Grid, GridItem, Input } from '@earlybird/kirana-ui';

<Container>
  <Grid columns={2} gap={4}>
    <GridItem>
      <Input label="First" />
    </GridItem>
    <GridItem>
      <Input label="Last" />
    </GridItem>
  </Grid>
</Container>
```

### Pattern 3: Conditional Styling

**Old:**
```javascript
<Button className={isLoading ? 'btn-loading' : 'btn-normal'}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>
```

**New:**
```typescript
<Button isLoading={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>
```

### Pattern 4: Error Handling

**Old:**
```javascript
{error && <div className="error-message">{error}</div>}
<Input value={value} onChange={onChange} />
```

**New:**
```typescript
<Input
  value={value}
  onChange={onChange}
  error={error}
  hint="Help text here"
/>
```

---

## Testing After Migration

### Manual Testing Checklist

- [ ] Button clicks work
- [ ] Form submission works
- [ ] Error messages display
- [ ] Dark mode toggles
- [ ] Responsive design works on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader can read content
- [ ] No console errors or warnings

### Automated Testing

Update your test suite:

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@earlybird/kirana-ui';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalled();
  });
});
```

---

## Rollback Plan

If you need to rollback:

```bash
# Remove new package
npm uninstall @earlybird/kirana-ui

# Restore old component files
git checkout -- src/components/legacy/

# Update imports back to old paths
```

---

## Troubleshooting Migration

### Issue: Styles look different

**Solution:** Check Tailwind CSS is properly configured
```javascript
// tailwind.config.js
content: ['./node_modules/@earlybird/kirana-ui/dist/**/*.js']
```

### Issue: Dark mode not working

**Solution:** Ensure ThemeProvider wraps entire app
```typescript
<ThemeProvider>
  <App />
</ThemeProvider>
```

### Issue: TypeScript errors

**Solution:** Update imports to include types
```typescript
import type { ButtonProps } from '@earlybird/kirana-ui';
```

### Issue: Components render but no styling

**Solution:** Make sure Tailwind CSS styles are imported
```typescript
import '@earlybird/kirana-ui/dist/styles.css';
```

---

## FAQ

**Q: Can I use old and new components together?**
A: Yes, but it's not recommended. Migrate components gradually.

**Q: Will my custom CSS still work?**
A: Yes, className prop still works. Use Tailwind classes for new components.

**Q: Do I need to change my state management?**
A: No, components work with any state management (useState, Redux, etc.)

**Q: Is dark mode optional?**
A: No, it's built-in. But you can hide the toggle if not needed.

**Q: What about accessibility?**
A: New components are fully accessible. Old components had some gaps.

---

## Getting Help

- See [KIRANA_UI_SETUP.md](./KIRANA_UI_SETUP.md) for setup help
- See [KIRANA_UI_COMPONENTS.md](./KIRANA_UI_COMPONENTS.md) for API reference
- Run `npm run storybook` to see all components in action
- Check GitHub issues for common problems

---

**Migration Status Tracking**

Keep track of migrated components:

```markdown
## Migrated Components
- [x] Button
- [x] Input
- [x] Card
- [ ] Modal
- [ ] Form
- [ ] Tabs
- [ ] ...
```

---

**Happy migrating!** 🚀
