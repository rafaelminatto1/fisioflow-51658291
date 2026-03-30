import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createId } from "@/components/wiki/wikiEditorUtils";

type DatabaseColumnType = "text" | "number" | "date";

interface WikiDatabaseColumnLike {
	id: string;
	name: string;
	type: DatabaseColumnType;
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

export function WikiDatabaseBlockEditor({
	database,
	onChange,
}: {
	database: WikiDatabaseConfigLike;
	onChange: (nextDatabase: WikiDatabaseConfigLike) => void;
}) {
	return (
		<div className="space-y-3">
			<Input
				value={database.title}
				onChange={(event) =>
					onChange({ ...database, title: event.target.value })
				}
				placeholder="Nome da tabela"
			/>

			<div className="rounded-lg border p-3">
				<div className="mb-2 flex items-center justify-between">
					<Label className="text-xs text-muted-foreground">Colunas</Label>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							const nextColumn: WikiDatabaseColumnLike = {
								id: createId(),
								name: `Coluna ${database.columns.length + 1}`,
								type: "text",
							};
							const nextRows = database.rows.map((row) => ({
								...row,
								values: {
									...row.values,
									[nextColumn.id]: "",
								},
							}));

							onChange({
								...database,
								columns: [...database.columns, nextColumn],
								rows: nextRows,
								sortColumnId: database.sortColumnId || nextColumn.id,
							});
						}}
					>
						<Plus className="mr-2 h-3.5 w-3.5" />
						Coluna
					</Button>
				</div>

				<div className="space-y-2">
					{database.columns.map((column) => (
						<div
							key={column.id}
							className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_130px_40px]"
						>
							<Input
								value={column.name}
								onChange={(event) => {
									const nextColumns = database.columns.map((currentColumn) =>
										currentColumn.id === column.id
											? { ...currentColumn, name: event.target.value }
											: currentColumn,
									);
									onChange({ ...database, columns: nextColumns });
								}}
								placeholder="Nome da coluna"
							/>
							<select
								className="h-10 rounded-md border bg-background px-2 text-sm"
								value={column.type}
								onChange={(event) => {
									const nextColumns = database.columns.map((currentColumn) =>
										currentColumn.id === column.id
											? {
													...currentColumn,
													type: event.target.value as DatabaseColumnType,
												}
											: currentColumn,
									);
									onChange({ ...database, columns: nextColumns });
								}}
							>
								<option value="text">Texto</option>
								<option value="number">Numero</option>
								<option value="date">Data</option>
							</select>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									const nextColumns = database.columns.filter(
										(currentColumn) => currentColumn.id !== column.id,
									);
									const nextRows = database.rows.map((row) => {
										const nextValues = { ...row.values };
										delete nextValues[column.id];
										return { ...row, values: nextValues };
									});

									onChange({
										...database,
										columns: nextColumns,
										rows: nextRows,
										sortColumnId:
											database.sortColumnId === column.id
												? nextColumns[0]?.id || ""
												: database.sortColumnId,
									});
								}}
								disabled={database.columns.length <= 1}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}
				</div>
			</div>

			<div className="rounded-lg border p-3">
				<div className="mb-2 flex items-center justify-between">
					<Label className="text-xs text-muted-foreground">Linhas</Label>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							const newRow: WikiDatabaseRowLike = {
								id: createId(),
								values: database.columns.reduce<Record<string, string>>(
									(acc, column) => {
										acc[column.id] = "";
										return acc;
									},
									{},
								),
							};
							onChange({
								...database,
								rows: [...database.rows, newRow],
							});
						}}
					>
						<Plus className="mr-2 h-3.5 w-3.5" />
						Linha
					</Button>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr>
								{database.columns.map((column) => (
									<th
										key={column.id}
										className="px-2 py-1 text-left text-xs font-medium text-muted-foreground"
									>
										{column.name}
									</th>
								))}
								<th className="px-2 py-1" />
							</tr>
						</thead>
						<tbody>
							{database.rows.map((row) => (
								<tr key={row.id} className="border-t">
									{database.columns.map((column) => (
										<td key={`${row.id}-${column.id}`} className="px-2 py-1">
											<Input
												value={row.values[column.id] || ""}
												onChange={(event) => {
													const nextRows = database.rows.map((currentRow) =>
														currentRow.id === row.id
															? {
																	...currentRow,
																	values: {
																		...currentRow.values,
																		[column.id]: event.target.value,
																	},
																}
															: currentRow,
													);
													onChange({ ...database, rows: nextRows });
												}}
												placeholder="Valor"
												className="h-8"
											/>
										</td>
									))}
									<td className="px-2 py-1 text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => {
												const nextRows = database.rows.filter(
													(currentRow) => currentRow.id !== row.id,
												);
												onChange({ ...database, rows: nextRows });
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-2 md:grid-cols-3">
				<div>
					<Label className="mb-1 block text-xs text-muted-foreground">
						Filtro inicial
					</Label>
					<Input
						value={database.filter}
						onChange={(event) =>
							onChange({ ...database, filter: event.target.value })
						}
						placeholder="Texto de busca"
					/>
				</div>
				<div>
					<Label className="mb-1 block text-xs text-muted-foreground">
						Ordenar por
					</Label>
					<select
						className="h-10 w-full rounded-md border bg-background px-2 text-sm"
						value={database.sortColumnId}
						onChange={(event) =>
							onChange({
								...database,
								sortColumnId: event.target.value,
							})
						}
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
						className="h-10 w-full rounded-md border bg-background px-2 text-sm"
						value={database.sortDirection}
						onChange={(event) =>
							onChange({
								...database,
								sortDirection: event.target.value as "asc" | "desc",
							})
						}
					>
						<option value="asc">Ascendente</option>
						<option value="desc">Descendente</option>
					</select>
				</div>
			</div>
		</div>
	);
}
