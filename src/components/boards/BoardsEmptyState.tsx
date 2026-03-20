import { Layout, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BoardsEmptyStateProps {
	onCreate: () => void;
}

export function BoardsEmptyState({ onCreate }: BoardsEmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-24 text-center">
			<div className="rounded-full bg-muted p-6 mb-6">
				<Layout className="h-12 w-12 text-muted-foreground" />
			</div>
			<h3 className="text-xl font-semibold mb-2">Nenhum board criado</h3>
			<p className="text-muted-foreground max-w-sm mb-8">
				Organize o trabalho da sua equipe com boards Kanban personalizados. Crie
				colunas, adicione tarefas e acompanhe o progresso.
			</p>
			<Button onClick={onCreate} size="lg">
				<Plus className="h-5 w-5 mr-2" />
				Criar Primeiro Board
			</Button>
		</div>
	);
}
