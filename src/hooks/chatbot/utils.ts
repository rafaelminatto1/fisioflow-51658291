import { ChatMessage } from "./types";

export const formatChatTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getChatDuration = (startTime: Date, endTime?: Date): string => {
  const end = endTime || new Date();
  const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000 / 60);

  if (duration < 1) return "menos de 1 minuto";
  if (duration === 1) return "1 minuto";
  if (duration < 60) return `${duration} minutos`;

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (hours === 1 && minutes === 0) return "1 hora";
  if (hours === 1) return `1 hora e ${minutes} minutos`;
  if (minutes === 0) return `${hours} horas`;

  return `${hours} horas e ${minutes} minutos`;
};

export const getMessageTypeIcon = (type: ChatMessage["type"]): string => {
  switch (type) {
    case "appointment":
      return "📅";
    case "exercise":
      return "🏃‍♂️";
    case "medication":
      return "💊";
    case "emergency":
      return "🚨";
    case "quick_reply":
      return "⚡";
    default:
      return "💬";
  }
};

export const getSatisfactionEmoji = (rating: number): string => {
  if (rating <= 1) return "😞";
  if (rating <= 2) return "😐";
  if (rating <= 3) return "😊";
  if (rating <= 4) return "😃";
  return "🤩";
};
