import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFilteredAndSortedRows } from "@/components/wiki/wikiEditorUtils";

interface WikiDatabaseColumnLike {
	id: string;
	name: string;
}

interface WikiDatabaseRowLike {
	id: string;
	values: Record<string, string>;
}

interface WikiDatabaseConfigLike {
	title: string;
	columns: WikiDatabaseColumnLike[];
	rows: WikiDatabaseRowLike[];
	filter: string;
	sortColumnId: string;
	sortDirection: "asc" | "desc";
}

export function WikiDatabaseViewer({
	database,
}: {
	database: WikiDatabaseConfigLike;
}) {
	const [search, setSearch] = useState(database.filter || "");
	const [sortColumnId, setSortColumnId] = useState(
		database.sortColumnId || database.columns[0]?.id || "",
	);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
		database.sortDirection || "asc",
	);

	useEffect(() => {
		setSearch(database.filter || "");
		setSortColumnId(database.sortColumnId || database.columns[0]?.id || "");
		setSortDirection(database.sortDirection || "asc");
	}, [database]);

	const visibleRows = useMemo(
		() =>
			getFilteredAndSortedRows(database, search, sortColumnId, sortDirection),
		[database, search, sortColumnId, sortDirection],
	);

	if (database.columns.length === 0) {
		return (
			<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				Tabela sem colunas.
			</div>
		);
	}

	return (
		<div className="space-y-3 rounded-xl border bg-muted/10 p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h4 className="text-sm font-semibold">
					{database.title || "Banco de dados"}
				</h4>
				<Badge variant="secondary">{visibleRows.length} registros</Badge>
			</div>

			<div className="flex flex-wrap items-end gap-2">
				<div className="w-full sm:w-56">
					<Label className="mb-1 block text-xs text-muted-foreground">
						Filtro
					</Label>
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Buscar na tabela..."
						className="h-8"
					/>
				</div>

				<div>
					<Label className="mb-1 block text-xs text-muted-foreground">
						Ordenar por
					</Label>
					<select
						className="h-8 rounded-md border bg-background px-2 text-sm"
						value={sortColumnId}
						onChange={(event) => setSortColumnId(event.target.value)}
					>
						{database.columns.map((column) => (
							<option key={column.id} value={column.id}>
								{column.name}
							</option>
						))}
					</select>
				</div>

				<div>
					<Label className="mb-1 block text-xs text-muted-foreground">
						Direcao
					</Label>
					<select
						className="h-8 rounded-md border bg-background px-2 text-sm"
						value={sortDirection}
						onChange={(event) =>
							setSortDirection(event.target.value as "asc" | "desc")
						}
					>
						<option value="asc">Ascendente</option>
						<option value="desc">Descendente</option>
					</select>
				</div>
			</div>

			<div className="overflow-x-auto rounded-lg border bg-background">
				<table className="min-w-full text-sm">
					<thead className="bg-muted/50">
						<tr>
							{database.columns.map((column) => (
								<th key={column.id} className="px-3 py-2 text-left font-medium">
									{column.name}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{visibleRows.length > 0 ? (
							visibleRows.map((row) => (
								<tr key={row.id} className="border-t">
									{database.columns.map((column) => (
										<td
											key={`${row.id}-${column.id}`}
											className="px-3 py-2 align-top"
										>
											{row.values[column.id] || "-"}
										</td>
									))}
								</tr>
							))
						) : (
							<tr>
								<td
									className="px-3 py-3 text-center text-muted-foreground"
									colSpan={database.columns.length}
								>
									Nenhum registro encontrado.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
