import type { Preview } from '@storybook/react'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'jellybox-dark',
      values: [
        { name: 'jellybox-dark', value: '#101010' },
        { name: 'surface', value: '#1c1c1c' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
