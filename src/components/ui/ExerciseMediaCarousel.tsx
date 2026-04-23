"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Play, Maximize2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "./OptimizedImage";

interface MediaItem {
	id: string;
	url: string;
	type: "image" | "video" | "youtube";
	caption?: string | null;
}

interface ExerciseMediaCarouselProps {
	media: MediaItem[];
	className?: string;
}

export function ExerciseMediaCarousel({
	media,
	className,
}: ExerciseMediaCarouselProps) {
	const [currentIndex, setCurrentIndex] = useState(0);

	if (!media || media.length === 0) {
		return (
			<div
				className={cn(
					"flex aspect-video w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800",
					className,
				)}
			>
				<span className="text-sm text-slate-400">Sem mídia disponível</span>
			</div>
		);
	}

	const currentMedia = media[currentIndex];

	const next = () => setCurrentIndex((prev) => (prev + 1) % media.length);
	const prev = () =>
		setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);

	return (
		<div
			className={cn(
				"group relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900",
				className,
			)}
		>
			{/* Render Media */}
			<div className="flex h-full w-full items-center justify-center">
				{currentMedia.type === "image" ? (
					<OptimizedImage
						src={currentMedia.url}
						alt={currentMedia.caption || "Imagem do exercício"}
						className="h-full w-full object-contain"
					/>
				) : currentMedia.type === "youtube" ? (
					<iframe
						src={`https://www.youtube.com/embed/${getYouTubeId(currentMedia.url)}`}
						className="h-full w-full border-0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>
				) : (
					<video
						src={currentMedia.url}
						controls
						className="h-full w-full object-contain"
					/>
				)}
			</div>

			{/* Navigation Controls */}
			{media.length > 1 && (
				<>
					<div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 transition-opacity group-hover:opacity-100">
						<Button
							variant="glass"
							size="icon"
							onClick={(e) => {
								e.stopPropagation();
								prev();
							}}
							className="h-10 w-10 rounded-full border-white/20 bg-black/30 text-white backdrop-blur-md hover:bg-black/50"
						>
							<ChevronLeft className="h-6 w-6" />
						</Button>
						<Button
							variant="glass"
							size="icon"
							onClick={(e) => {
								e.stopPropagation();
								next();
							}}
							className="h-10 w-10 rounded-full border-white/20 bg-black/30 text-white backdrop-blur-md hover:bg-black/50"
						>
							<ChevronRight className="h-6 w-6" />
						</Button>
					</div>

					{/* Indicators */}
					<div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
						{media.map((_, idx) => (
							<button
								key={idx}
								onClick={() => setCurrentIndex(idx)}
								className={cn(
									"h-1.5 w-1.5 rounded-full transition-all",
									idx === currentIndex
										? "w-4 bg-white"
										: "bg-white/40 hover:bg-white/60",
								)}
							/>
						))}
					</div>
				</>
			)}

			{/* Caption Overlay */}
			{currentMedia.caption && (
				<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
					<p className="text-sm font-medium text-white line-clamp-2">
						{currentMedia.caption}
					</p>
				</div>
			)}
			
			{/* Media Type Badge */}
			<div className="absolute right-4 top-4 rounded-lg bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
				{currentMedia.type}
			</div>
		</div>
	);
}

function getYouTubeId(url: string) {
	const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
	const match = url.match(regExp);
	return match && match[2].length === 11 ? match[2] : null;
}
