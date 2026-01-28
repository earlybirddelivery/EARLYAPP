/**
 * Class Name Utility
 * Merge Tailwind CSS classes with support for conditional classes
 */

export function cn(...classes: (string | undefined | null | boolean | Record<string, boolean>)[]): string {
  return classes
    .filter((cls) => {
      if (typeof cls === 'string') return cls.length > 0;
      if (typeof cls === 'object' && cls !== null) {
        return Object.values(cls).some((v) => v === true);
      }
      return false;
    })
    .map((cls) => {
      if (typeof cls === 'string') return cls;
      if (typeof cls === 'object') {
        return Object.entries(cls)
          .filter(([_, value]) => value === true)
          .map(([key]) => key)
          .join(' ');
      }
      return '';
    })
    .join(' ')
    .trim();
}
