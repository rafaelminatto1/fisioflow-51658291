module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["@ohah/react-native-mcp-server/babel"],
  };
};
