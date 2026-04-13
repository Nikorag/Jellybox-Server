import path from 'path'
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  previewHead: (head) => `
    ${head}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <style>:root { --font-inter: 'Inter', ui-sans-serif, system-ui, sans-serif; }</style>
  `,
  async viteFinal(config) {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      // Path alias
      '@': path.resolve(__dirname, '../src'),
      // Next.js module stubs — the real modules require the Next.js runtime
      'next/link': path.resolve(__dirname, './mocks/next-link.tsx'),
      'next/image': path.resolve(__dirname, './mocks/next-image.tsx'),
      'next/navigation': path.resolve(__dirname, './mocks/next-navigation.ts'),
    }
    return config
  },
}

export default config
