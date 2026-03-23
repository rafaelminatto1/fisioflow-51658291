import { lazy, Suspense, useMemo } from "react";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PDFDownloadLink = lazy(() =>
	import("@react-pdf/renderer").then((module) => ({
		default: module.PDFDownloadLink,
	})),
);

interface LazyPdfDownloadButtonProps<TDocumentProps> {
	loadDocument: () => Promise<{ default: ComponentType<TDocumentProps> }>;
	documentProps: TDocumentProps;
	fileName: string;
	label: string;
	loadingLabel?: string;
	icon?: ReactNode;
	buttonProps?: Omit<ComponentProps<typeof Button>, "children" | "disabled">;
}

export function LazyPdfDownloadButton<TDocumentProps>({
	loadDocument,
	documentProps,
	fileName,
	label,
	loadingLabel = "Gerando...",
	icon,
	buttonProps,
}: LazyPdfDownloadButtonProps<TDocumentProps>) {
	const PdfDocument = useMemo(() => lazy(loadDocument), [loadDocument]);

	return (
		<Suspense
			fallback={
				<Button disabled {...buttonProps}>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Preparando PDF
				</Button>
			}
		>
			<PDFDownloadLink
				document={<PdfDocument {...documentProps} />}
				fileName={fileName}
			>
				{({ loading }) => (
					<Button disabled={loading} {...buttonProps}>
						{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
						{loading ? loadingLabel : label}
					</Button>
				)}
			</PDFDownloadLink>
		</Suspense>
	);
}
