    addMinutes,
    format,
    getDay,
    isWithinInterval,
    parse,
    startOfDay,
    endOfDay,
    parseISO
} from 'date-fns';
import type { BusinessHour, BlockedTime } from '../hooks/useScheduleSettings';

export interface TimeSlotInfo {
    time: string;
    isAvailable: boolean;
    isBlocked: boolean;
    blockReason?: string;
    isOutsideBusinessHours: boolean;
}

export function generateTimeSlots(
    date: Date,
    businessHours: BusinessHour[] | undefined,
    blockedTimes: BlockedTime[] | undefined,
    slotDuration = 30
): TimeSlotInfo[] {
    if (!date) return [];

    const dayOfWeek = getDay(date);
    const dayConfig = businessHours?.find(h => h.day_of_week === dayOfWeek);

    // If no config or closed, return empty
    if (dayConfig && !dayConfig.is_open) {
        return [];
    }

    // Default hours if not configured
    let startTime = '07:00';
    let endTime = dayOfWeek === 6 ? '13:00' : '21:00';
    let breakStart: string | null = null;
    let breakEnd: string | null = null;

    if (dayConfig) {
        startTime = dayConfig.open_time;
        endTime = dayConfig.close_time;
        breakStart = dayConfig.break_start || null;
        breakEnd = dayConfig.break_end || null;
    }

    const slots: TimeSlotInfo[] = [];

    // Parse start and end times relative to the given date
    const startDateTime = parseTime(date, startTime);
    const endDateTime = parseTime(date, endTime);

    if (!startDateTime || !endDateTime) return [];

    // Iterate by slot duration
    let currentSlot = startDateTime;

    // Ensure we stop BEFORE the end time (e.g. if close is 21:00, last slot starts at 20:30)
    while (isBeforeOrEqual(addMinutes(currentSlot, slotDuration), endDateTime) || (isBeforeOrEqual(currentSlot, endDateTime) && isEqual(currentSlot, endDateTime) === false && isStoreOpenForSlot(currentSlot, slotDuration, endDateTime))) {
        // Actually the loop generic logic:
        // If store closes at 21:00, existing logic was < endMinutes.
        // 20:30 + 30 = 21:00. So 20:30 IS the last slot.
        // 21:00 is NOT a slot. 
        // So loop while currentSlot < endDateTime.
        if (currentSlot >= endDateTime) break;

        const timeStr = format(currentSlot, 'HH:mm');

        // Check Break
        let isInBreak = false;
        if (breakStart && breakEnd) {
            const breakStartTime = parseTime(date, breakStart);
            const breakEndTime = parseTime(date, breakEnd);

            if (breakStartTime && breakEndTime) {
                // If slot start is inside break OR slot overlaps break
                // Simple check: if slot start >= break start AND slot start < break end
                if (currentSlot >= breakStartTime && currentSlot < breakEndTime) {
                    isInBreak = true;
                }
            }
        }

        // Check Blocked
        let isBlocked = false;
        let blockReason = '';

        if (blockedTimes) {
            for (const block of blockedTimes) {
                const blockStart = parseISO(block.start_date); // Assumes YYYY-MM-DD
                const blockEnd = parseISO(block.end_date);

                // Fix block dates to start/end of day if they are just dates
                // Note: blockedTimes usually come as date strings.
                // We need to be careful with timezone here. 
                // For 'All Day' blocks, we check if the requested 'date' matches the block day.

                // Check if 'date' is within block date range (inclusive)
                const checkDate = startOfDay(date);

                // Adjust block start/end to local day boundaries for comparison
                // Since we don't know the timezone of the input string exactly, 
                // we should rely on string comparison for dates if possible, or robust day comparison.

                // Alternative: check text based YYYY-MM-DD
                // But let's stick to date-fns helpers

                // If it's a multi-day block or single day block
                // We need to align everything to the same reference.
                // Let's assume input 'date' is correctly set to local midnight or we ignore time.

                // Check if the current day is blocked
                const isDateBlocked = isWithinInterval(checkDate, {
                    start: startOfDay(blockStart),
                    end: endOfDay(blockEnd)
                });

                if (isDateBlocked) {
                    if (block.is_all_day) {
                        isBlocked = true;
                        blockReason = block.title;
                        break;
                    }

                    // Check recurring
                    // Logic in original file: if (block.is_recurring && block.recurring_days?.includes(dayOfWeek))
                    // This seems independent of date range in the original code? 
                    // checks: date range AND (recurring if applicable OR specific date?)

                    // Original: Checks date range FIRST. Then checks recurring INSIDE.
                    // Only if date is within range, it checks recurring.

                    if (block.is_recurring && block.recurring_days?.includes(dayOfWeek)) {
                        if (block.is_all_day) {
                            isBlocked = true;
                            blockReason = block.title;
                            break;
                        }
                        // Time range check for recurring
                        if (checkTimeBlocked(currentSlot, block.start_time, block.end_time, date)) {
                            isBlocked = true;
                            blockReason = block.title;
                            break;
                        }
                    } else if (!block.is_recurring) {
                        // specific date time block
                        if (checkTimeBlocked(currentSlot, block.start_time, block.end_time, date)) {
                            isBlocked = true;
                            blockReason = block.title;
                            break;
                        }
                    }
                }
            }
        }

        slots.push({
            time: timeStr,
            isAvailable: !isInBreak && !isBlocked,
            isBlocked,
            blockReason: blockReason || undefined,
            isOutsideBusinessHours: false,
        });

        currentSlot = addMinutes(currentSlot, slotDuration);
    }

    return slots;
}

// Helper to parse "HH:mm" into a Date object on the reference date
function parseTime(date: Date, timeStr: string): Date | null {
    try {
        return parse(timeStr, 'HH:mm', date);
    } catch {
        return null;
    }
}

function checkTimeBlocked(slotTime: Date, startTimeStr: string | undefined, endTimeStr: string | undefined, refDate: Date): boolean {
    if (!startTimeStr || !endTimeStr) return false;
    const blockStart = parseTime(refDate, startTimeStr);
    const blockEnd = parseTime(refDate, endTimeStr);

    if (!blockStart || !blockEnd) return false;

    // Block if slotTime >= blockStart AND slotTime < blockEnd
    return slotTime >= blockStart && slotTime < blockEnd;
}

// Helper needed because isBefore matches exact strictness
function isBeforeOrEqual(d1: Date, d2: Date) {
    return d1 <= d2;
}

function isEqual(d1: Date, d2: Date) {
    return d1.getTime() === d2.getTime();
}

function isStoreOpenForSlot(current: Date, duration: number, close: Date) {
    return addMinutes(current, duration) <= close;
}
