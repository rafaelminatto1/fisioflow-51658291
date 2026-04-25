import type { StorybookConfig } from "@storybook/react-vite";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const repoRoot = path.resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const config: StorybookConfig = {
  stories: [`${repoRoot}/src/**/*.stories.@(js|jsx|mjs|ts|tsx)`, `${repoRoot}/src/**/*.mdx`],
  addons: [
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-onboarding"),
  ],
  framework: getAbsolutePath("@storybook/react-vite"),
  viteFinal(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(repoRoot, "src"),
    };
    return config;
  },
};

export default config;
