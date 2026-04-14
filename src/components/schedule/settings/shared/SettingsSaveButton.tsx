import { Button } from "@/components/ui/button";
import { Save, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSaveButtonProps {
	onSave: () => void;
	isSaving: boolean;
	isSaved: boolean;
	disabled?: boolean;
	label?: string;
	className?: string;
}

export function SettingsSaveButton({
	onSave,
	isSaving,
	isSaved,
	disabled = false,
	label = "Salvar",
	className,
}: SettingsSaveButtonProps) {
	return (
		<div className="flex justify-end pt-2 border-t">
			<Button
				size="sm"
				onClick={onSave}
				disabled={isSaving || isSaved || disabled}
				className={cn(isSaved && "bg-green-600 hover:bg-green-700", className)}
			>
				{isSaved ? (
					<>
						<CheckCircle2 className="h-4 w-4 mr-1.5" />
						Salvo
					</>
				) : isSaving ? (
					<>
						<Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
						Salvando...
					</>
				) : (
					<>
						<Save className="h-4 w-4 mr-1.5" />
						{label}
					</>
				)}
			</Button>
		</div>
	);
}
