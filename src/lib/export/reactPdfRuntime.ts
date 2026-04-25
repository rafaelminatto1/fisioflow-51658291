type ReactPdfRendererModule = typeof import("@react-pdf/renderer");

let reactPdfRuntimePromise: Promise<ReactPdfRendererModule> | null = null;

export async function loadReactPdfRuntime(): Promise<ReactPdfRendererModule> {
  if (!reactPdfRuntimePromise) {
    reactPdfRuntimePromise = import("@react-pdf/renderer").catch((error) => {
      reactPdfRuntimePromise = null;
      throw error;
    });
  }

  return reactPdfRuntimePromise;
}
