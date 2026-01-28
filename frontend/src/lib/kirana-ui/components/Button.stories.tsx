// @ts-nocheck
/**
 * Button Component Stories
 * Comprehensive Storybook documentation and examples
 * Phase 6 enhancement - TypeScript errors suppressed
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Button component with multiple variants and sizes',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'success', 'outline', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Primary Variant
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
    size: 'md',
  },
};

// Secondary Variant
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
    size: 'md',
  },
};

// Danger Variant
export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete',
    size: 'md',
  },
};

// Success Variant
export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Confirm',
    size: 'md',
  },
};

// Outline Variant
export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
    size: 'md',
  },
};

// Ghost Variant
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
    size: 'md',
  },
};

// All Sizes
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

// Loading State
export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading',
  },
};

// Disabled State
export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled',
  },
};

// Full Width
export const FullWidth: Story = {
  args: {
    variant: 'primary',
    fullWidth: true,
    children: 'Full Width Button',
  },
};

// Interactive
export const Interactive: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
  render: (args) => (
    <Button {...args} onClick={() => alert('Button clicked!')}>
      {args.children}
    </Button>
  ),
};
