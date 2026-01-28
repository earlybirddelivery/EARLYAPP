/**
 * KiranaUI Component Library - Modernized
 * 
 * A production-ready React component library with:
 * - React 18+ hooks support
 * - Full TypeScript support
 * - Tailwind CSS integration
 * - Accessibility (WCAG 2.1 AA)
 * - Responsive design
 * - Dark mode support
 * 
 * @author EarlyBird Team
 * @version 2.0 (Modernized)
 * @date January 2026
 */

// Core Components
export { Button } from './Button';
export { Input } from './Input';
export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from './Card';
export { Modal } from './Modal';
export { Table, TableHeader, TableBody, TableRow, TableCell } from './Table';
export { Dropdown, DropdownItem } from './Dropdown';
export { Sidebar, SidebarItem } from './Sidebar';
export { Header } from './Header';
export { Footer } from './Footer';
export { Navbar } from './Navbar';

// Form Components
export { Form, FormGroup, FormLabel, FormError } from './Form';
export { Select, SelectOption } from './Select';
export { Textarea } from './Textarea';
export { Checkbox } from './Checkbox';
export { Radio, RadioGroup } from './Radio';
export { Toggle } from './Toggle';
export { Slider } from './Slider';

// Layout Components
export { Container } from './Container';
export { Grid, GridItem } from './Grid';
export { Stack, HStack, VStack } from './Stack';
export { Divider } from './Divider';
export { Spacer } from './Spacer';

// Feedback Components
export { Badge } from './Badge';
export { Alert, AlertTitle, AlertDescription } from './Alert';
export { Toast, ToastProvider } from './Toast';
export { Spinner } from './Spinner';
export { ProgressBar } from './ProgressBar';

// Display Components
export { Tabs, TabList, Tab, TabContent } from './Tabs';
export { Accordion, AccordionItem } from './Accordion';
export { DenseList, DenseListItem } from './DenseList';
export { StatCard } from './StatCard';

// Specialized Components
export { DenseForm } from './DenseForm';
export { DenseTable } from './DenseTable';
export { Note } from './Note';
export { SearchInput } from './SearchInput';
export { Pagination } from './Pagination';

// Types
export type { ButtonProps } from './Button';
export type { InputProps } from './Input';
export type { CardProps } from './Card';
export type { ModalProps } from './Modal';
export type { TableProps } from './Table';
export type { FormGroupProps } from './Form';
export type { SelectProps } from './Select';
export type { TabsProps } from './Tabs';
export type { AlertProps } from './Alert';
export type { ToastProps } from './Toast';
export type { DenseListProps } from './DenseList';
export type { StatCardProps } from './StatCard';

// Theme & Utilities
export { useTheme, ThemeProvider } from './hooks/useTheme';
export { useResponsive } from './hooks/useResponsive';
export { useToast } from './hooks/useToast';
export { useDarkMode } from './hooks/useDarkMode';

export { cn } from './utils/cn';
export { themes } from './themes';
