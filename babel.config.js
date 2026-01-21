/**
 * FisioFlow - Babel Configuration
 * Configuração do Babel para Expo com suporte a NativeWind v4
 */

module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      'react-native-reanimated/plugin',
      // Styled components plugin for NativeWind
      'babel-plugin-styled-components',
    ],
  };
};
