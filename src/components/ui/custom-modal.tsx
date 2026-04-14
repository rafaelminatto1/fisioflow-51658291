/**
 * CustomModal - A robust modal component that avoids React Error #185
 *
 * Key differences from Dialog/Sheet:
 * - Uses native DOM events instead of Radix UI state management
 * - No internal state that could cause render loops
 * - Proper event cleanup with refs
 * - Supports mobile (bottom sheet) and desktop (centered) layouts
 */

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap, useFocusRestoration } from "@/lib/a11y";

interface CustomModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
	className?: string;
	contentClassName?: string;
	isMobile?: boolean;
}

/**
 * Custom Modal Component
 *
 * Designed to avoid the React Error #185 by:
 * 1. Using refs for stable event handler references
 * 2. Properly cleaning up event listeners
 * 3. Not using complex state management like Radix UI
 */
export const CustomModal: React.FC<CustomModalProps> = ({
	open,
	onOpenChange,
	children,
	className,
	contentClassName,
	isMobile = false,
}) => {
	const overlayRef = useRef<HTMLDivElement>(null);
	const contentRef = useFocusTrap(open);
	useFocusRestoration(open);

	// Use refs to store the latest callback to avoid stale closures
	const onOpenChangeRef = useRef(onOpenChange);
	useEffect(() => {
		onOpenChangeRef.current = onOpenChange;
	}, [onOpenChange]);

	// Handle overlay click with ref
	const handleOverlayClick = useRef((e: React.MouseEvent) => {
		if (e.target === overlayRef.current) {
			onOpenChangeRef.current(false);
		}
	});

	// Handle escape key with proper cleanup
	useEffect(() => {
		if (!open) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onOpenChangeRef.current(false);
			}
		};

		document.addEventListener("keydown", handleEscape);
		// Prevent body scroll when modal is open
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "";
		};
	}, [open]);

	if (!open) return null;

	// Mobile: Bottom sheet com altura fixa para footer sempre visível
	// Usar 85dvh para garantir que o footer não seja cortado por safe areas do iOS
	const modalContainerClass = isMobile
		? "fixed inset-0 z-50 flex items-end pt-3"
		: "fixed inset-0 z-50 flex items-center justify-center p-4";

	const modalContentClass = isMobile
		? "bg-background w-full rounded-t-2xl shadow-2xl flex flex-col h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)] min-h-0 overflow-hidden overscroll-contain"
		: "bg-background rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden";

	const modal = (
		<div
			ref={overlayRef}
			className={cn(
				"fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
				"animate-in fade-in duration-200",
				className,
			)}
			onClick={handleOverlayClick.current}
		>
			<div className={modalContainerClass}>
				<div
					ref={contentRef}
					className={cn(modalContentClass, contentClassName, "relative")}
					onClick={(e) => e.stopPropagation()}
					role="dialog"
					aria-modal="true"
				>
					{/* Standardized Close Button - Top Right */}
					<button
						onClick={() => onOpenChangeRef.current(false)}
						className="absolute right-4 top-4 z-[60] text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors md:block hidden"
						type="button"
						aria-label="Fechar"
					>
						<X className="w-5 h-5" />
					</button>
					{children}
				</div>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modal;
	}

	return createPortal(modal, document.body);
};

/**
 * CustomModal Components
 */
export const CustomModalHeader: React.FC<{
	className?: string;
	children: React.ReactNode;
	onClose?: () => void;
}> = ({ className, children, onClose }) => {
	return (
		<div
			className={cn(
				"flex items-center justify-between px-6 py-4 border-b shrink-0",
				className,
			)}
		>
			{children}
			{onClose && (
				<button
					onClick={onClose}
					className="text-gray-400 hover:text-gray-600 p-2 -mr-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
					type="button"
					aria-label="Fechar"
				>
					<X className="w-5 h-5" />
				</button>
			)}
		</div>
	);
};

export const CustomModalTitle: React.FC<{
	className?: string;
	children: React.ReactNode;
}> = ({ className, children }) => {
	return (
		<h2 className={cn("text-xl font-semibold text-gray-900", className)}>
			{children}
		</h2>
	);
};

export const CustomModalBody: React.FC<{
	className?: string;
	children: React.ReactNode;
}> = ({ className, children }) => {
	return (
		<div className={cn("flex-1 overflow-y-auto px-4 sm:px-6 py-4", className)}>
			{children}
		</div>
	);
};

export const CustomModalFooter: React.FC<{
	className?: string;
	children: React.ReactNode;
	isMobile?: boolean;
}> = ({ className, children, isMobile = false }) => {
	return (
		<div
			className={cn(
				"flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t shrink-0",
				isMobile
					? "sticky bottom-0 z-10 border-border/80 bg-background/95 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.45)] backdrop-blur supports-[backdrop-filter]:bg-background/90"
					: "bg-gray-50",
				className,
			)}
		>
			{children}
		</div>
	);
};
