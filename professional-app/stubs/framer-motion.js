// Stub vazio para framer-motion no mobile
// O packages/ui usa .native.tsx que não depende de framer-motion
// Este stub impede que a versão web seja incluída no bundle

const Motion = {
  // Componentes stub que funcionam como wrappers
  div: 'View',
  span: 'Text',
  p: 'Text',
  h1: 'Text',
  h2: 'Text',
  h3: 'Text',
  h4: 'Text',
  h5: 'Text',
  h6: 'Text',
  button: 'TouchableOpacity',
  a: 'TouchableOpacity',
  img: 'Image',
  section: 'View',
  article: 'View',
  aside: 'View',
  header: 'View',
  footer: 'View',
  nav: 'View',
  main: 'View',
};

const motion = Motion;

// Hooks stub
const useAnimation = () => ({});
const useMotionValue = (initial) => ({ get: () => initial, set: () => {} });
const useTransform = () => ({});
const useSpring = () => ({});
const useMotionTemplate = () => ({});

// Variants stub
const AnimatePresence = ({ children }) => children;
const motionValue = () => ({});
const transform = {};

// Utilitários stub
const useInView = () => false;

module.exports = {
  motion,
  Motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  useSpring,
  useMotionTemplate,
  motionValue,
  transform,
  useInView,
};
