import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "@/hooks/useFinancial";
import { TransactionModal } from "../TransactionModal";

vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

describe("TransactionModal", () => {
	const onOpenChange = vi.fn();
	const onSubmit = vi.fn();

	const transaction: Transaction = {
		id: "txn-1",
		tipo: "despesa",
		descricao: "Compra de materiais",
		valor: 150,
		status: "concluido",
		metadata: { supplier: "Loja A" },
		created_at: "2026-03-20T10:00:00.000Z",
		updated_at: "2026-03-20T10:30:00.000Z",
	};

	beforeEach(() => {
		onOpenChange.mockClear();
		onSubmit.mockClear();
	});

	it("renders existing transaction data and submits form", async () => {
		const user = userEvent.setup();

		render(
			<TransactionModal
				open
				onOpenChange={onOpenChange}
				onSubmit={onSubmit}
				transaction={transaction}
			/>,
		);

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Editar Transação")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Compra de materiais")).toBeInTheDocument();
		expect(screen.getByDisplayValue("150")).toBeInTheDocument();

		const saveButton = screen.getByRole("button", { name: /Atualizar/i });
		await user.click(saveButton);

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({
				tipo: "despesa",
				descricao: "Compra de materiais",
				valor: 150,
				status: "concluido",
				metadata: { supplier: "Loja A" },
			});
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("closes modal from cancel action", async () => {
		const user = userEvent.setup();

		render(
			<TransactionModal open onOpenChange={onOpenChange} onSubmit={onSubmit} />,
		);

		const cancelButton = screen.getByRole("button", { name: "Cancelar" });
		await user.click(cancelButton);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
