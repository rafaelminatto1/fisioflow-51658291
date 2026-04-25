import React, { useState, useRef, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { useColors } from "@/hooks/useColorScheme";
import { AppointmentBase } from "@/types";
import { router } from "expo-router";
import { format, startOfWeek, addDays, isSameDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DraggableAptCard } from "./DraggableAptCard";
import { getTimeParts } from "./utils";
import { BidirectionalScroll } from "./BidirectionalScroll";

interface WeekViewProps {
  date: Date;
  appointments: AppointmentBase[];
  startHour?: number;
  endHour?: number;
  onReschedule?: (id: string, newDate: Date, time: string) => void;
  onRescheduleRequest?: (
    id: string,
    newDate: Date,
    time: string,
    confirm: (confirm: boolean) => void,
  ) => void;
}

const HOUR_HEIGHT = 60;
const DAYS_VISIBLE = 3;
const TIME_LABEL_WIDTH_LOCAL = 35;
const HEADER_HEIGHT = 50;

export const WeekView = ({
  date,
  appointments,
  startHour = 7,
  endHour = 22,
  onReschedule,
  onRescheduleRequest,
}: WeekViewProps) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const colors = useColors();

  const dayWidth = (screenWidth - TIME_LABEL_WIDTH_LOCAL) / DAYS_VISIBLE;
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx));
  }, [weekStart]);

  const handleGridPress = (day: Date, hour: number) => {
    const dateStr = format(day, "dd/MM/yyyy");
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    router.push(`/appointment-form?date=${dateStr}&time=${timeStr}` as any);
  };

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      return isSameDay(aptDate, day);
    });
  };

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const contentHeight = hours.length * HOUR_HEIGHT + HEADER_HEIGHT;
  const contentWidth = dayWidth * 7 + TIME_LABEL_WIDTH_LOCAL;

  const renderFixedHeader = () => (
    <View
      style={{
        flexDirection: "row",
        height: HEADER_HEIGHT,
        backgroundColor: colors.background,
        paddingLeft: TIME_LABEL_WIDTH_LOCAL,
      }}
    >
      {days.map((day) => (
        <View
          key={`header-${day.toISOString()}`}
          style={[
            styles.dayHeader,
            { width: dayWidth, borderBottomWidth: 1, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.dayName, { color: colors.textSecondary }]}>
            {format(day, "EEE", { locale: ptBR }).toUpperCase()}
          </Text>
          <Text
            style={[
              styles.dayNumber,
              {
                color: isSameDay(day, new Date()) ? colors.primary : colors.text,
              },
            ]}
          >
            {format(day, "d")}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderFixedColumn = () => (
    <View
      style={{
        width: TIME_LABEL_WIDTH_LOCAL,
        backgroundColor: colors.background,
        paddingTop: HEADER_HEIGHT,
      }}
    >
      {hours.map((hour) => (
        <View
          key={hour}
          style={[
            styles.timeSlot,
            { height: HOUR_HEIGHT, borderRightWidth: 1, borderRightColor: colors.border },
          ]}
        >
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {hour.toString().padStart(2, "0")}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderCorner = () => (
    <View
      style={{
        width: TIME_LABEL_WIDTH_LOCAL,
        height: HEADER_HEIGHT,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderRightWidth: 1,
        borderColor: colors.border,
      }}
    />
  );

  return (
    <View style={styles.container}>
      <BidirectionalScroll
        width={screenWidth}
        height={screenHeight - 180} // Approx height adjustment for header/tabs
        contentWidth={contentWidth}
        contentHeight={contentHeight}
        renderFixedHeader={renderFixedHeader}
        renderFixedColumn={renderFixedColumn}
        renderCorner={renderCorner}
      >
        <View style={{ paddingTop: HEADER_HEIGHT, paddingLeft: TIME_LABEL_WIDTH_LOCAL }}>
          <View style={[styles.gridRow, { width: dayWidth * 7 }]}>
            {/* Horizontal Grid Lines */}
            <View style={styles.absoluteLines}>
              {hours.map((hour) => (
                <View
                  key={`line-${hour}`}
                  style={[
                    styles.horizontalLine,
                    { height: HOUR_HEIGHT, borderBottomColor: colors.border },
                  ]}
                />
              ))}
            </View>

            {/* Columns */}
            <View style={styles.columnsContainer}>
              {days.map((day) => (
                <View
                  key={`col-${day.toISOString()}`}
                  style={[
                    styles.dayColumn,
                    {
                      width: dayWidth,
                      borderRightWidth: 1,
                      borderRightColor: colors.border,
                    },
                  ]}
                >
                  {/* Touchable slots */}
                  {hours.map((hour) => (
                    <TouchableOpacity
                      key={`slot-${day.toISOString()}-${hour}`}
                      style={{ height: HOUR_HEIGHT, width: "100%" }}
                      onPress={() => handleGridPress(day, hour)}
                    />
                  ))}

                  {/* Appointments */}
                  {getAppointmentsForDay(day).map((apt) => {
                    const { hour, minutes } = getTimeParts(apt.time, apt.date);
                    if (hour < startHour || hour > endHour) return null;

                    const top = (hour - startHour) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
                    const height = (apt.duration / 60) * HOUR_HEIGHT;
                    const aptWithPos = { ...apt, top, height };

                    return (
                      <DraggableAptCard
                        key={apt.id}
                        apt={aptWithPos}
                        pos={{ left: 2, width: dayWidth - 4 }}
                        startHour={startHour}
                        endHour={endHour}
                        hourHeight={HOUR_HEIGHT}
                        targetDay={day}
                        allDays={days}
                        columnWidth={dayWidth}
                        onReschedule={onReschedule}
                        onRescheduleRequest={onRescheduleRequest}
                        onScrollEnable={setScrollEnabled}
                        colors={{
                          primary: colors.primary,
                          textSecondary: colors.textSecondary,
                        }}
                        onPress={() => router.push(`/appointment-form?id=${apt.id}` as any)}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </BidirectionalScroll>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  timeSlot: {
    justifyContent: "center",
    alignItems: "center",
  },
  timeText: {
    fontSize: 9,
    fontWeight: "600",
  },
  dayHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  dayName: {
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 1,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  gridRow: {
    position: "relative",
  },
  absoluteLines: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  horizontalLine: {
    width: "100%",
    borderBottomWidth: 1,
  },
  columnsContainer: {
    flexDirection: "row",
  },
  dayColumn: {
    position: "relative",
  },
});
