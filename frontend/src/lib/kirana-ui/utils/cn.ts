/**
 * Class name utility for conditional styling
 * Combines and deduplicates class names
 */

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes
    .filter((cls) => typeof cls === 'string' && cls.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
