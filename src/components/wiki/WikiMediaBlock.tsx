import { ExternalLink } from "lucide-react";
import {
	getVimeoEmbedUrl,
	getYouTubeEmbedUrl,
	isImageUrl,
	isVideoUrl,
	normalizeUrl,
} from "@/components/wiki/wikiEditorUtils";

interface WikiMediaBlockLike {
	type: "image" | "video" | "youtube" | "embed";
	url?: string;
}

export function WikiMediaBlock({
	block,
}: {
	block: WikiMediaBlockLike;
}) {
	const url = block.url || "";
	const safeUrl = normalizeUrl(url);

	if (!safeUrl) {
		return (
			<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				URL invalida ou nao informada.
			</div>
		);
	}

	if (
		block.type === "image" ||
		(block.type === "embed" && isImageUrl(safeUrl))
	) {
		return (
			<figure className="overflow-hidden rounded-xl border bg-muted/20">
				<img
					src={safeUrl}
					alt="Imagem incorporada"
					className="max-h-[520px] w-full object-contain bg-background"
					loading="lazy"
				/>
				<figcaption className="flex items-center justify-between gap-2 border-t bg-background/80 px-3 py-2 text-xs text-muted-foreground">
					<span>Imagem incorporada</span>
					<a
						href={safeUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 text-primary hover:underline"
					>
						Abrir fonte <ExternalLink className="h-3 w-3" />
					</a>
				</figcaption>
			</figure>
		);
	}

	const youtubeEmbedUrl = getYouTubeEmbedUrl(safeUrl);
	const vimeoEmbedUrl = getVimeoEmbedUrl(safeUrl);

	if (block.type === "youtube" || youtubeEmbedUrl || vimeoEmbedUrl) {
		const iframeSource = youtubeEmbedUrl || vimeoEmbedUrl || safeUrl;
		return (
			<div className="overflow-hidden rounded-xl border bg-muted/20">
				<div className="aspect-video w-full">
					<iframe
						src={iframeSource}
						title="Video incorporado"
						className="h-full w-full"
						loading="lazy"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen
						referrerPolicy="strict-origin-when-cross-origin"
					/>
				</div>
			</div>
		);
	}

	if (
		block.type === "video" ||
		(block.type === "embed" && isVideoUrl(safeUrl))
	) {
		return (
			<div className="overflow-hidden rounded-xl border bg-muted/20">
				<video
					controls
					className="max-h-[520px] w-full bg-black"
					src={safeUrl}
					preload="metadata"
				>
					Seu navegador nao suporta videos incorporados.
				</video>
			</div>
		);
	}

	if (block.type === "embed") {
		return (
			<div className="overflow-hidden rounded-xl border bg-muted/20">
				<div className="aspect-video w-full">
					<iframe
						src={safeUrl}
						title="Embed externo"
						className="h-full w-full bg-background"
						loading="lazy"
						allowFullScreen
						referrerPolicy="strict-origin-when-cross-origin"
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
			<a
				href={safeUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="text-primary underline"
			>
				Abrir midia externa
			</a>
		</div>
	);
}
