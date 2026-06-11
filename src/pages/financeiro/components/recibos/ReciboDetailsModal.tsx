import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import {
	ReciboPreview,
	ReciboPDF,
	type ReciboData,
} from "@/components/financial/ReciboPDF";

interface ReciboDetailsModalProps {
	previewRecibo: ReciboData | null;
	onClose: () => void;
	isMobile: boolean;
}

export function ReciboDetailsModal({
	previewRecibo,
	onClose,
	isMobile,
}: ReciboDetailsModalProps) {
	return (
		<CustomModal
			open={!!previewRecibo}
			onOpenChange={(open) => !open && onClose()}
			isMobile={isMobile}
			contentClassName="max-w-4xl h-[95vh]"
		>
			<CustomModalHeader onClose={onClose}>
				<div className="flex flex-col gap-1">
					<Badge className="w-fit rounded-lg bg-emerald-500/10 text-emerald-600 border-none uppercase text-[10px] font-black tracking-widest">
						Documento Digital
					</Badge>
					<CustomModalTitle className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
						Recibo #{previewRecibo?.numero.toString().padStart(6, "0")}
					</CustomModalTitle>
				</div>
			</CustomModalHeader>

			<CustomModalBody className="p-0 sm:p-0 bg-slate-50/50 dark:bg-slate-950/50">
				<ScrollArea className="h-full">
					<div className="p-6 md:p-10">
						{previewRecibo && <ReciboPreview data={previewRecibo} />}
					</div>
				</ScrollArea>
			</CustomModalBody>

			<CustomModalFooter
				isMobile={isMobile}
				className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"
			>
				<Button
					variant="ghost"
					onClick={onClose}
					className="rounded-xl h-11 px-6 font-bold text-slate-500 uppercase text-xs tracking-wider"
				>
					Fechar
				</Button>
				<div className="flex-1" />
				{previewRecibo && (
					<ReciboPDF
						data={previewRecibo}
						fileName={`recibo-${previewRecibo.numero}`}
					/>
				)}
			</CustomModalFooter>
		</CustomModal>
	);
}
