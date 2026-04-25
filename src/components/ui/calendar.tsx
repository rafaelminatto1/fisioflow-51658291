import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import { DayPicker, UI } from "react-day-picker";
import { buttonVariants } from "@/lib/ui-variants";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = ptBR,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      locale={locale}
      classNames={{
        [UI.Months]: "relative flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        [UI.Month]: "space-y-4",
        [UI.MonthCaption]: "flex justify-center pt-1 relative items-center h-9",
        [UI.CaptionLabel]: "text-sm font-medium",
        [UI.Nav]: "space-x-1 flex items-center",
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 z-10",
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 z-10",
        ),
        [UI.MonthGrid]: "w-full border-collapse space-y-1",
        [UI.Weekdays]: "flex w-full justify-between mb-2",
        [UI.Weekday]: "text-muted-foreground w-9 font-normal text-[0.8rem] flex-1 text-center",
        [UI.Week]: "flex w-full mt-2 justify-between",
        [UI.Day]:
          "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 flex-1 flex items-center justify-center",
        [UI.DayButton]: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 flex items-center justify-center rounded-md transition-all",
        ),
        [UI.Selected]:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md shadow-sm",
        [UI.Today]: "bg-accent text-accent-foreground rounded-md font-bold",
        [UI.Outside]:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        [UI.Disabled]: "text-muted-foreground opacity-50",
        [UI.RangeMiddle]: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        [UI.Hidden]: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) =>
          props.orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
