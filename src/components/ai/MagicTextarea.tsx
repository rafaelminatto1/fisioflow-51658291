import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Mic, StopCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
} from "@/components/ui/tooltip";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { aiApi } from "@/api/v2";
import { BilingualSuggestionsModal } from "../evolution/suggestion/BilingualSuggestionsModal";

interface MagicTextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	value: string;
	onValueChange: (value: string) => void;
}

export function MagicTextarea({
	value,
	onValueChange,
	className,
	...props
}: MagicTextareaProps) {
	const [loading, setLoading] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const { isRecording, startRecording, stopRecording } = useAudioRecorder();

	const blobToBase64 = (blob: Blob): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const base64String = reader.result as string;
				// Remove data url prefix (e.g., "data:audio/webm;base64,")
				const base64 = base64String.split(",")[1];
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	};

	const handleMicClick = async () => {
		if (isRecording) {
			// Parar e Transcrever
			setLoading(true);
			try {
				const audioBlob = await stopRecording();
				const audioBase64 = await blobToBase64(audioBlob);

				const result = await aiApi.transcribeAudio({
					audio: audioBase64,
					mimeType: audioBlob.type || "audio/webm",
				});
				const transcription = result.data.transcription;
				if (transcription) {
					// Adiciona ao texto existente ou substitui
					const newValue = value ? `${value} ${transcription}` : transcription;
					onValueChange(newValue);
				}
			} catch (error) {
				console.error("Transcription Error:", error);
			} finally {
				setLoading(false);
			}
		} else {
			// Iniciar
			await startRecording();
		}
	};

	const handleMagicFix = async () => {
		if (!value || value.length < 5) return;

		setLoading(true);
		try {
			const result = await aiApi.fastProcessing({
				text: value,
				mode: "fix_grammar",
			});
			const correctedText = result.data.result;
			if (correctedText) {
				onValueChange(correctedText);
			}
		} catch (error) {
			console.error("Groq AI Error:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Detectar /sugestoes
		if (e.key === "Enter" || e.key === " ") {
			const lastWord = value.split(/[\s\n]+/).pop();
			if (lastWord === "/sugestoes") {
				e.preventDefault();
				// Remove o comando do texto
				const newValue = value.slice(0, -10).trim();
				onValueChange(newValue);
				setIsSearchOpen(true);
			}
		}
		// Também permite props.onKeyDown se existir
		props.onKeyDown?.(e);
	};

	const handleSearchSelect = (term: string) => {
		const newValue = value ? `${value}\n${term}` : term;
		onValueChange(newValue);
	};

	return (
		<div className="relative group">
			<Textarea
				value={value}
				onChange={(e) => onValueChange(e.target.value)}
				onKeyDown={handleKeyDown}
				className={cn(
					"pr-24 transition-all focus:ring-purple-500/20",
					className,
				)}
				{...props}
			/>

			<div className="absolute bottom-2 right-2 flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
				<TooltipProvider>
					{/* Botão de Microfone */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								className={cn(
									"h-8 w-8 rounded-full transition-colors",
									isRecording
										? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
										: "hover:bg-blue-100 text-blue-600",
								)}
								onClick={handleMicClick}
								disabled={loading && !isRecording}
							>
								{isRecording ? (
									<StopCircle className="h-4 w-4" />
								) : (
									<Mic className="h-4 w-4" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>
								{isRecording ? "Parar e Transcrever" : "Ditar (Google Speech)"}
							</p>
						</TooltipContent>
					</Tooltip>

					{/* Botão de Magia (Groq) */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								className="h-8 w-8 hover:bg-purple-100 text-purple-600 rounded-full"
								onClick={handleMagicFix}
								disabled={loading || !value || isRecording}
							>
								{loading && !isRecording ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Sparkles className="h-4 w-4" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Melhorar texto com IA (Groq)</p>
						</TooltipContent>
					</Tooltip>

					{/* Botão de Dicionário Clínico (Bilingue) */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								className="h-8 w-8 hover:bg-blue-100 text-blue-600 rounded-full"
								onClick={() => setIsSearchOpen(true)}
								disabled={isRecording}
							>
								<BookOpen className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Dicionário Clínico Bilingue (/sugestoes)</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<BilingualSuggestionsModal 
					open={isSearchOpen}
					onOpenChange={setIsSearchOpen}
					onSelect={handleSearchSelect}
				/>
			</div>
		</div>
	);
}
