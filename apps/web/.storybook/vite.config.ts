import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [require('@storybook/react-vite/plugin').default()],
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: { useSWC: true },
    },
  },
})
