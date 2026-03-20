import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserManagement from "@/pages/UserManagement";

const mockUseUsers = vi.fn();

vi.mock("@/hooks/useUsers", () => ({
	useUsers: () => mockUseUsers(),
}));

vi.mock("@/components/layout", () => ({
	MainLayout: ({ children }: { children: ReactNode }) => (
		<div data-testid="main-layout">{children}</div>
	),
}));

describe("UserManagement", () => {
	beforeEach(() => {
		mockUseUsers.mockReturnValue({
			users: [
				{
					id: "user-1",
					email: "REDACTED_EMAIL",
					full_name: "Rafael Minatto",
					roles: ["admin"],
					role: "admin",
					created_at: "not-a-date",
					disabled: false,
					membership_id: "member-1",
				},
			],
			isLoading: false,
			updateRole: vi.fn(),
		});
	});

	it("renders invalid membership dates without crashing", () => {
		render(<UserManagement />);

		expect(screen.getByText("Gerenciamento de Usuários")).toBeInTheDocument();
		expect(screen.getByText("REDACTED_EMAIL")).toBeInTheDocument();
		expect(screen.getByText("Data inválida")).toBeInTheDocument();
	});
});
