import React from "react";

function downloadBlob(blob: Blob, fileName: string) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

export async function downloadReactPdfDocument<Props>({
	fileName,
	loadDocument,
	props,
}: {
	fileName: string;
	loadDocument: () => Promise<React.ComponentType<Props>>;
	props: Props;
}) {
	const [{ pdf }, DocumentComponent] = await Promise.all([
		import("@react-pdf/renderer"),
		loadDocument(),
	]);

	const blob = await pdf(
		React.createElement(DocumentComponent, props),
	).toBlob();

	downloadBlob(blob, fileName);
}
