import { useState } from 'react';

// Hook para controlar o estado do chatbot
export const useChatbotState = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const openChatbot = () => {
    setIsOpen(true);
    setHasUnreadMessages(false);
  };

  const closeChatbot = () => {
    setIsOpen(false);
  };

  const markAsUnread = () => {
    if (!isOpen) {
      setHasUnreadMessages(true);
    }
  };

  return {
    isOpen,
    hasUnreadMessages,
    openChatbot,
    closeChatbot,
    markAsUnread
  };
};
