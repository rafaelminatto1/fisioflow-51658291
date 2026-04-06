type JsPdfModule = typeof import("jspdf");
type AutoTableModule = typeof import("jspdf-autotable");

let runtimePromise: Promise<{
	jsPDF: JsPdfModule["jsPDF"];
	autoTable: AutoTableModule["default"];
}> | null = null;

export async function loadJsPdfRuntime() {
	if (!runtimePromise) {
		runtimePromise = Promise.all([
			import("jspdf"),
			import("jspdf-autotable"),
		]).then(([jspdfModule, autoTableModule]) => ({
			jsPDF: jspdfModule.jsPDF,
			autoTable: autoTableModule.default,
		}));
	}

	return runtimePromise;
}
