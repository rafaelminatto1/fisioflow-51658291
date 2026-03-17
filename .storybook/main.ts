import type { StorybookConfig } from '@storybook/react-vite';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-onboarding'),
  ],
  framework: getAbsolutePath('@storybook/react-vite'),
  viteFinal(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@': path.resolve(dirname(fileURLToPath(import.meta.url)), '../src'),
    };
    return config;
  },
};

export default config;
