import type { Meta, StoryObj } from "@storybook/react";
import { KanbanCardV2 } from "./KanbanCardV2";
import type { Tarefa } from "@/types/tarefas";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";

const BASE_TAREFA: Tarefa = {
	id: "tarefa-001",
	titulo: "Revisar protocolo de reabilitação do paciente Carlos",
	descricao:
		"Verificar progresso e ajustar exercícios conforme última avaliação.",
	status: "EM_ANDAMENTO",
	prioridade: "ALTA",
	tipo: "TAREFA",
	organization_id: "org-001",
	created_by: "user-001",
	responsavel_id: "user-001",
	order_index: 0,
	tags: ["reabilitação", "prioritário"],
	checklists: [
		{ id: "c1", title: "Revisar exercícios", completed: true },
		{ id: "c2", title: "Atualizar prontuário", completed: false },
	],
	attachments: [],
	dependencies: [],
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
} as unknown as Tarefa;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
	<DragDropContext onDragEnd={() => {}}>
		<Droppable droppableId="stories">
			{(provided) => (
				<div
					ref={provided.innerRef}
					{...provided.droppableProps}
					className="w-72"
				>
					{children}
					{provided.placeholder}
				</div>
			)}
		</Droppable>
	</DragDropContext>
);

const meta = {
	title: "Tarefas/KanbanCardV2",
	component: KanbanCardV2,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<Wrapper>
				<Story />
			</Wrapper>
		),
	],
} satisfies Meta<typeof KanbanCardV2>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AltaPrioridade: Story = {
	args: {
		tarefa: BASE_TAREFA,
		index: 0,
		onEdit: () => {},
		onDelete: () => {},
	},
};

export const BaixaPrioridade: Story = {
	args: {
		tarefa: {
			...BASE_TAREFA,
			prioridade: "BAIXA",
			status: "A_FAZER",
		} as unknown as Tarefa,
		index: 0,
		onEdit: () => {},
		onDelete: () => {},
	},
};

export const Concluida: Story = {
	args: {
		tarefa: { ...BASE_TAREFA, status: "CONCLUIDA" } as unknown as Tarefa,
		index: 0,
		onEdit: () => {},
		onDelete: () => {},
	},
};

export const Urgente: Story = {
	args: {
		tarefa: {
			...BASE_TAREFA,
			prioridade: "URGENTE",
			data_vencimento: new Date(Date.now() - 86400000).toISOString(), // yesterday
		} as unknown as Tarefa,
		index: 0,
		onEdit: () => {},
		onDelete: () => {},
	},
};
