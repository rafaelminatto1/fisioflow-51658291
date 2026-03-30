import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

export function WikiInlineMarkdown({ text }: { text: string }) {
	return (
		<div className="prose prose-sm max-w-none prose-headings:scroll-mt-24 prose-a:text-primary prose-a:break-all prose-img:rounded-xl prose-img:border prose-pre:overflow-auto prose-pre:rounded-xl prose-pre:border prose-pre:bg-muted/40 prose-blockquote:border-l-primary/40 prose-table:w-full prose-th:bg-muted/40 dark:prose-invert">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeHighlight]}
				components={{
					a: ({ _node, ...props }) => (
						<a
							{...props}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 underline underline-offset-2"
						/>
					),
					img: ({ _node, src, alt, ...props }) => (
						<img
							{...props}
							src={src}
							alt={alt ?? "Imagem da wiki"}
							loading="lazy"
							className="w-full max-h-[520px] object-contain"
						/>
					),
					table: ({ _node, ...props }) => (
						<div className="overflow-x-auto rounded-xl border">
							<table {...props} />
						</div>
					),
					code: ({
						_node,
						inline,
						className: codeClassName,
						children,
						...props
					}) => {
						if (inline) {
							return (
								<code
									{...props}
									className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
								>
									{children}
								</code>
							);
						}

						return (
							<code {...props} className={codeClassName}>
								{children}
							</code>
						);
					},
				}}
			>
				{text}
			</ReactMarkdown>
		</div>
	);
}
