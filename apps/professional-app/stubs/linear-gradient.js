// Stub para expo-linear-gradient / react-native-linear-gradient
// Usado por react-native-gifted-charts como peer dep opcional.
// Renderiza um View simples com a primeira cor como background.

const React = require("react");
const { View } = require("react-native");

const LinearGradient = ({ colors, style, children, ...props }) => {
  const backgroundColor = colors && colors.length > 0 ? colors[0] : "transparent";
  return React.createElement(View, { style: [{ backgroundColor }, style], ...props }, children);
};

module.exports = {
  LinearGradient,
  default: LinearGradient,
};
