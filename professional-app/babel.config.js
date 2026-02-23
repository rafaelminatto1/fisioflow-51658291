const path = require('path');

module.exports = function (api) {
  api.cache(true);

  const projectRoot = __dirname;
  const monorepoRoot = path.resolve(projectRoot, '..');
  const packagesUiRoot = path.resolve(monorepoRoot, 'packages/ui');

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ],
    // Garantir que o packages/ui seja transpilado
    // Isso é crítico para builds do EAS, pois o Metro
    // não transpila código fora de node_modules por padrão
    overrides: [
      {
        test: /\.tsx?$/,
        include: [
          packagesUiRoot,
        ],
        presets: ['babel-preset-expo'],
        plugins: [
          'react-native-reanimated/plugin',
        ],
      },
    ],
  };
};
