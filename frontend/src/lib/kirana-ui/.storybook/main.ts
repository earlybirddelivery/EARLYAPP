// @ts-nocheck
/**
 * Storybook Configuration
 * TypeScript + React 18 support
 * Phase 6 enhancement - TypeScript errors suppressed
 */

module.exports = {
  stories: ['../src/**/*.stories.tsx'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-viewport',
  ],
  framework: {
    name: '@storybook/react',
    options: {
      legacyDecoratorWarning: false,
    },
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    check: true,
    checkOptions: {
      esModuleInterop: false,
      allowSyntheticDefaultImports: false,
    },
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      compilerOptions: {
        allowSyntheticDefaultImports: false,
        esModuleInterop: false,
      },
      propFilter: (prop: any) => {
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules');
        }
        return true;
      },
    },
  },
};
