/**
 * Shim para globalthis - compatível com import default usado por @kitware/vtk.js
 * Resolve erro: "default" is not exported by "globalthis"
 */
const g =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
        ? self
        : (Function('return this') as () => typeof globalThis)();

export default function getGlobalThis(): typeof globalThis {
  return g;
}
