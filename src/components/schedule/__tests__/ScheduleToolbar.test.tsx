import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleToolbar } from "../ScheduleToolbar";

const mockUseIsMobile = vi.fn();

vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: () => mockUseIsMobile(),
}));

vi.mock("@/components/ui/smart-date-picker", () => ({
	SmartDatePicker: ({ placeholder }: { placeholder?: string }) => (
		<div data-testid="smart-date-picker">{placeholder}</div>
	),
}));

vi.mock("../AdvancedFilters", () => ({
	AdvancedFilters: () => <div data-testid="advanced-filters" />,
}));

vi.mock("../ScheduleConfigButton", () => ({
	ScheduleConfigIconButton: () => <button type="button">Config</button>,
}));

describe("ScheduleToolbar", () => {
	beforeEach(() => {
		mockUseIsMobile.mockReturnValue(false);
	});

	it("renders day, week, and month buttons on desktop and dispatches changes", () => {
		const onViewChange = vi.fn();

		render(
			<MemoryRouter>
				<ScheduleToolbar
					currentDate={new Date("2026-04-22T10:00:00")}
					viewType="week"
					onViewChange={onViewChange}
					onDateChange={vi.fn()}
					isSelectionMode={false}
					onToggleSelection={vi.fn()}
					onCreateAppointment={vi.fn()}
					filters={{ status: [], types: [], therapists: [] }}
					onFiltersChange={vi.fn()}
					onClearFilters={vi.fn()}
				/>
			</MemoryRouter>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Dia" }));
		fireEvent.click(screen.getByRole("button", { name: "Mês" }));

		expect(screen.getByRole("button", { name: "Semana" })).toBeInTheDocument();
		expect(onViewChange).toHaveBeenNthCalledWith(1, "day");
		expect(onViewChange).toHaveBeenNthCalledWith(2, "month");
	});

	it("renders day, week, and month buttons on mobile", () => {
		mockUseIsMobile.mockReturnValue(true);

		render(
			<MemoryRouter>
				<ScheduleToolbar
					currentDate={new Date("2026-04-22T10:00:00")}
					viewType="week"
					onViewChange={vi.fn()}
					onDateChange={vi.fn()}
					isSelectionMode={false}
					onToggleSelection={vi.fn()}
					onCreateAppointment={vi.fn()}
					filters={{ status: [], types: [], therapists: [] }}
					onFiltersChange={vi.fn()}
					onClearFilters={vi.fn()}
				/>
			</MemoryRouter>,
		);

		expect(screen.getByRole("button", { name: "Dia" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Semana" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Mês" })).toBeInTheDocument();
	});
});
