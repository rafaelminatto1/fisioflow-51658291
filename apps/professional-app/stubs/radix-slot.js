// Stub para @radix-ui/react-slot no React Native
// O expo-router usa este pacote web-only para o componente Slot
// Esta implementação minimalista funciona para React Native

const React = require('react');
const { View } = require('react-native');

// Slot component that merges props and passes them to children
// This is a simplified version for React Native
const Slot = React.forwardRef((props, ref) => {
  const { children, ...restProps } = props;
  
  // If children is a function, call it with the merged props
  if (typeof children === 'function') {
    return children({ ...restProps, ref });
  }
  
  // If children is a valid element, clone it with merged props
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...restProps,
      ...children.props,
      ref,
    });
  }
  
  // Fallback to View if no children
  return React.createElement(View, { ...restProps, ref }, children);
});

// Slottable component - just renders children
const Slottable = ({ children }) => children;

module.exports = {
  Slot,
  Slottable,
};