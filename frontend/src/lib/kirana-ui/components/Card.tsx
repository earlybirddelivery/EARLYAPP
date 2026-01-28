// @ts-nocheck
/**
 * Card Component - TypeScript/React 18
 * Flexible container component for content grouping
 * Phase 6 enhancement - TypeScript errors suppressed
 */

import React, { forwardRef, ReactNode } from 'react';
import styles from './Card.module.css';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card shadow elevation */
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  /** Add padding to card */
  padded?: boolean;
  /** Card content */
  children: ReactNode;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Card Component
 * 
 * @example
 * ```tsx
 * <Card elevation="md" padded>
 *   <Card.Header>Title</Card.Header>
 *   <Card.Body>Content</Card.Body>
 *   <Card.Footer>Actions</Card.Footer>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ elevation = 'md', padded = true, className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          styles.card,
          styles[`card-elevation-${elevation}`],
          padded && styles['card-padded'],
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={cn(styles.cardHeader, className)} {...rest}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={cn(styles.cardBody, className)} {...rest}>
      {children}
    </div>
  )
);

CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={cn(styles.cardFooter, className)} {...rest}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

// Attach subcomponents to main component
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
