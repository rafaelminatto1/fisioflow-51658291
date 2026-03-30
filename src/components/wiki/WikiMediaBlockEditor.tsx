import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WikiMediaBlockLike {
	id: string;
	type: "image" | "video" | "youtube" | "embed";
	url?: string;
}

const PLACEHOLDER_MAP = {
	image: "https://.../imagem.jpg",
	video: "https://.../video.mp4",
	youtube: "https://youtube.com/watch?v=...",
	embed: "https://site.com/embed/...",
} as const;

export function WikiMediaBlockEditor({
	block,
	isUploading,
	onUpdate,
	onRequestUpload,
}: {
	block: WikiMediaBlockLike;
	isUploading: boolean;
	onUpdate: (blockId: string, updates: Partial<WikiMediaBlockLike>) => void;
	onRequestUpload: (blockId: string, mediaType: "image" | "video") => void;
}) {
	return (
		<div className="space-y-2">
			<Input
				value={block.url || ""}
				onChange={(event) =>
					onUpdate(block.id, { url: event.target.value })
				}
				placeholder={PLACEHOLDER_MAP[block.type]}
			/>
			{(block.type === "image" || block.type === "video") && (
				<Button
					variant="outline"
					size="sm"
					onClick={() => onRequestUpload(block.id, block.type)}
					disabled={isUploading}
				>
					<UploadCloud className="mr-2 h-4 w-4" />
					{isUploading
						? "Enviando..."
						: `Upload ${block.type === "image" ? "imagem" : "video"}`}
				</Button>
			)}
			<p className="text-xs text-muted-foreground">
				{block.type === "youtube"
					? "Cole link do YouTube (watch, shorts ou youtu.be)."
					: block.type === "embed"
						? "Cole URL compatível com iframe."
						: "Cole URL da midia."}
			</p>
		</div>
	);
}
