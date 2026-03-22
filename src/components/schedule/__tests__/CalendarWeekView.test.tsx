import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarWeekViewHeader } from "../CalendarWeekViewHeader";

describe("CalendarWeekViewHeader", () => {
	it("renders the current month and dispatches header actions", () => {
		const onViewChange = vi.fn();
		const onNavigatePrevious = vi.fn();
		const onNavigateNext = vi.fn();
		const onNavigateToday = vi.fn();
		const onOpenSettings = vi.fn();

		render(
			<CalendarWeekViewHeader
				currentDate={new Date("2026-03-21T10:00:00")}
				viewType="week"
				onViewChange={onViewChange}
				onNavigatePrevious={onNavigatePrevious}
				onNavigateNext={onNavigateNext}
				onNavigateToday={onNavigateToday}
				onOpenSettings={onOpenSettings}
			/>,
		);

		expect(screen.getByRole("heading", { name: /março 2026/i })).toBeInTheDocument();
		expect(screen.getByText(/sábado, 21 março 2026/i)).toBeInTheDocument();

		const buttons = screen.getAllByRole("button");
		fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
		fireEvent.click(buttons[1]);
		fireEvent.click(buttons[2]);
		fireEvent.click(screen.getByRole("button", { name: "Mês" }));
		fireEvent.click(screen.getByRole("button", { name: /configurações/i }));

		expect(onNavigateToday).toHaveBeenCalledTimes(1);
		expect(onNavigatePrevious).toHaveBeenCalledTimes(1);
		expect(onNavigateNext).toHaveBeenCalledTimes(1);
		expect(onViewChange).toHaveBeenCalledWith("month");
		expect(onOpenSettings).toHaveBeenCalledTimes(1);
	});

	it("does not render the settings action when no handler is provided", () => {
		render(
			<CalendarWeekViewHeader
				currentDate={new Date("2026-03-21T10:00:00")}
				viewType="day"
				onViewChange={vi.fn()}
				onNavigatePrevious={vi.fn()}
				onNavigateNext={vi.fn()}
				onNavigateToday={vi.fn()}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: /configurações/i }),
		).not.toBeInTheDocument();
	});
});
