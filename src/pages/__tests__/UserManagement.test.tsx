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

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

vi.mock("@/components/admin/MembersManager", () => ({
  MembersManager: () => (
    <div>
      <div>rafael.minatto@yahoo.com.br</div>
      <div>Data inválida</div>
    </div>
  ),
}));

vi.mock("@/components/admin/InvitationsManager", () => ({
  InvitationsManager: () => <div>Convites Pendentes</div>,
}));

describe("UserManagement", () => {
  beforeEach(() => {
    mockUseUsers.mockReturnValue({
      users: [
        {
          id: "user-1",
          email: "rafael.minatto@yahoo.com.br",
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
    expect(screen.getByText("rafael.minatto@yahoo.com.br")).toBeInTheDocument();
    expect(screen.getByText("Data inválida")).toBeInTheDocument();
  });
});
