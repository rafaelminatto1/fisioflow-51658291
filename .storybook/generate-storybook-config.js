const fs = require('fs')
const path = require('path')

const mainTemplate = `import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        useSWC: true,
      },
    },
  },
  docs: {
    theme: 'light',
  },
}

export default config
`

const previewTemplate = `import type { Preview } from '@storybook/react'
import { withThemeByDataAttribute } from '@storybook/addon-themes'
import '../src/index.css'
import '../src/styles/premium-design-system.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [withThemeByDataAttribute],
}

export default preview
`

// Create .storybook directory
fs.mkdirSync(path.join(__dirname, '.storybook'), { recursive: true })

// Write main.tsx
fs.writeFileSync(
  path.join(__dirname, '.storybook', 'main.tsx'),
  mainTemplate
)

// Write preview.tsx
fs.writeFileSync(
  path.join(__dirname, '.storybook', 'preview.tsx'),
  previewTemplate
)

console.log('✅ Storybook configuration generated successfully!')
console.log('📁 Files created: .storybook/main.tsx, .storybook/preview.tsx')
