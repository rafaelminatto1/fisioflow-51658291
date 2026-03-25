/**
 * Shim para globalthis - compatível com import default usado por @kitware/vtk.js
 * Resolve erro: "default" is not exported by "globalthis"
 * E também exporta as propriedades para outros consumidores como o Scheduler do React.
 */
const g =
	typeof globalThis !== "undefined"
		? globalThis
		: typeof window !== "undefined"
			? window
			: typeof self !== "undefined"
				? self
				: (Function("return this") as () => typeof globalThis)();

// Exporta as propriedades do global para o objeto do módulo (para CommonJS compatibility em ESM)
export const implementation = g;
export const getPolyfill = () => g;
export const shim = () => g;

// Exporta o próprio objeto para ser usado via import { globalThis }
export { g as globalThis };

// Export default para vtk.js
export default g;
