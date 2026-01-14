import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Paperclip,
  X,
  Minimize2,
  Maximize2,
  Phone,
  Star,
  Download,
  RefreshCw,
  AlertTriangle,
  User,
  Bot,
  Activity,
  FileText,
  HelpCircle
} from 'lucide-react';
import { useMedicalChatbot, formatChatTime, getSatisfactionEmoji, getMessageTypeIcon } from '../../hooks/useMedicalChatbot';

interface MedicalChatbotProps {
  userId: string;
  patientId?: string;
  initialContext?: Record<string, unknown>;
  onClose?: () => void;
  embedded?: boolean;
  theme?: 'light' | 'dark';
}

interface ChatBubbleProps {
  message: { id?: string; content: string; type?: string; timestamp?: string };
  isUser: boolean;
  showTime?: boolean;
}

interface QuickReplyButtonProps {
  reply: { payload: string; text: string; icon?: string };
  onClick: (payload: string, text: string) => void;
}

interface TypingIndicatorProps {
  show: boolean;
}

interface SatisfactionRatingProps {
  onRate: (rating: number) => void;
  currentRating?: number;
}

interface ChatHeaderProps {
  isMinimized: boolean;
  onMinimize: () => void;
  onClose?: () => void;
  onRequestHuman: () => void;
  isConnected: boolean;
  humanHandoffRequested: boolean;
}

interface VoiceRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onVoiceMessage: (transcript: string) => void;
}

// Componente de bolha de chat
const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser, showTime = true }) => {
  const bubbleClass = isUser 
    ? 'bg-blue-500 text-white ml-auto' 
    : 'bg-gray-100 text-gray-800 mr-auto';
  
  const alignClass = isUser ? 'justify-end' : 'justify-start';
  
  return (
    <div className={`flex ${alignClass} mb-4 group`}>
      <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md`}>
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}
        
        <div className={`px-4 py-2 rounded-lg ${bubbleClass} shadow-sm`}>
          <div className="flex items-center space-x-1 mb-1">
            <span className="text-xs opacity-75">
              {getMessageTypeIcon(message.type)}
            </span>
            {message.metadata?.confidence && (
              <span className="text-xs opacity-60">
                {Math.round(message.metadata.confidence * 100)}%
              </span>
            )}
          </div>
          
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          
          {showTime && (
            <div className="text-xs opacity-60 mt-1">
              {formatChatTime(message.timestamp)}
            </div>
          )}
          
          {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs opacity-75">Sugestões:</p>
              {message.metadata.suggestions.map((suggestion: string, index: number) => (
                <div key={index} className="text-xs bg-white bg-opacity-20 rounded px-2 py-1">
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de resposta rápida
const QuickReplyButton: React.FC<QuickReplyButtonProps> = ({ reply, onClick }) => {
  return (
    <button
      onClick={() => onClick(reply.payload, reply.text)}
      className="inline-flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-colors duration-200 shadow-sm"
    >
      {reply.icon && <span>{reply.icon}</span>}
      <span>{reply.text}</span>
    </button>
  );
};

// Indicador de digitação
const TypingIndicator: React.FC<TypingIndicatorProps> = ({ show }) => {
  if (!show) return null;
  
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="bg-gray-100 rounded-lg px-4 py-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Avaliação de satisfação
const SatisfactionRating: React.FC<SatisfactionRatingProps> = ({ onRate, currentRating }) => {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h4 className="text-sm font-medium text-gray-800 mb-2">Como foi nosso atendimento?</h4>
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => onRate(rating)}
            onMouseEnter={() => setHoveredRating(rating)}
            onMouseLeave={() => setHoveredRating(null)}
            className={`text-2xl transition-transform duration-200 hover:scale-110 ${
              (hoveredRating && rating <= hoveredRating) || (currentRating && rating <= currentRating)
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}
          >
            <Star className="w-6 h-6 fill-current" />
          </button>
        ))}
      </div>
      {currentRating && (
        <p className="text-xs text-gray-600 mt-2">
          Obrigado pela avaliação! {getSatisfactionEmoji(currentRating)}
        </p>
      )}
    </div>
  );
};

// Cabeçalho do chat
const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  isMinimized, 
  onMinimize, 
  onClose, 
  onRequestHuman, 
  isConnected,
  humanHandoffRequested 
}) => {
  return (
    <div className="bg-blue-500 text-white p-4 rounded-t-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">Assistente FisioFlow</h3>
          <div className="flex items-center space-x-2 text-sm opacity-90">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span>
              {humanHandoffRequested 
                ? 'Conectando com especialista...' 
                : isConnected 
                  ? 'Online' 
                  : 'Offline'
              }
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {!humanHandoffRequested && (
          <button
            onClick={onRequestHuman}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            title="Falar com especialista"
          >
            <Phone className="w-4 h-4" />
          </button>
        )}
        
        <button
          onClick={onMinimize}
          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          title={isMinimized ? 'Maximizar' : 'Minimizar'}
        >
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Gravador de voz
const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  isRecording, 
  onStartRecording, 
  onStopRecording, 
  onVoiceMessage 
}) => {
  // const [transcript, setTranscript] = useState('');
  
  // Simular reconhecimento de voz (em produção, usar Web Speech API)
  useEffect(() => {
    if (isRecording) {
      const timer = setTimeout(() => {
        const mockTranscript = 'Mensagem de voz simulada';
        // setTranscript(mockTranscript);
        onVoiceMessage(mockTranscript);
        onStopRecording();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isRecording, onVoiceMessage, onStopRecording]);
  
  return (
    <button
      onClick={isRecording ? onStopRecording : onStartRecording}
      className={`p-2 rounded-full transition-colors ${
        isRecording 
          ? 'bg-red-500 text-white animate-pulse' 
          : 'text-gray-400 hover:text-gray-600'
      }`}
      title={isRecording ? 'Parar gravação' : 'Gravar mensagem de voz'}
    >
      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
};

// Componente principal do chatbot
const MedicalChatbot: React.FC<MedicalChatbotProps> = ({ 
  userId, 
  patientId, 
  initialContext, 
  onClose, 
  embedded = false,
  theme = 'light'
}) => {
  const {
    currentSession,
    messages,
    isTyping,
    quickReplies,
    // context,
    isConnected,
    humanHandoffRequested,
    startChatSession,
    processUserMessage,
    requestHumanHandoff,
    // endChatSession,
    // clearChat,
    rateSatisfaction,
    exportChat,
    getFrequentQuestions
  } = useMedicalChatbot();
  
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSatisfactionRating, setShowSatisfactionRating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  // const [showFrequentQuestions, setShowFrequentQuestions] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Inicializar sessão ao montar o componente
  useEffect(() => {
    if (!currentSession) {
      startChatSession(userId, { patientId, ...initialContext });
    }
  }, [userId, patientId, initialContext, currentSession, startChatSession]);
  
  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);
  
  // Focar no input quando não minimizado
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMinimized]);
  
  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!inputMessage.trim() && attachments.length === 0) return;
    
    let messageContent = inputMessage.trim();
    
    // Adicionar informações sobre anexos
    if (attachments.length > 0) {
      const attachmentInfo = attachments.map(file => `[Anexo: ${file.name}]`).join(' ');
      messageContent = `${messageContent} ${attachmentInfo}`.trim();
    }
    
    await processUserMessage(messageContent);
    setInputMessage('');
    setAttachments([]);
  };
  
  // Enviar resposta rápida
  const handleQuickReply = async (payload: string, text: string) => {
    await processUserMessage(text, 'quick_reply');
  };
  
  // Manipular tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Manipular anexos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };
  
  // Remover anexo
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // Exportar conversa
  const handleExportChat = () => {
    const chatData = exportChat();
    if (chatData) {
      const blob = new Blob([chatData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${currentSession?.id || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  // Perguntas frequentes
  const frequentQuestions = getFrequentQuestions();
  
  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Iniciando conversa...</p>
        </div>
      </div>
    );
  }
  
  const containerClass = embedded 
    ? 'w-full h-full' 
    : 'fixed bottom-4 right-4 w-96 h-[600px] z-50';
  
  const chatClass = `bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col ${
    isMinimized ? 'h-16' : 'h-full'
  } ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`;
  
  return (
    <div className={containerClass}>
      <div className={chatClass}>
        {/* Cabeçalho */}
        <ChatHeader
          isMinimized={isMinimized}
          onMinimize={() => setIsMinimized(!isMinimized)}
          onClose={onClose}
          onRequestHuman={requestHumanHandoff}
          isConnected={isConnected}
          humanHandoffRequested={humanHandoffRequested}
        />
        
        {!isMinimized && (
          <>
            {/* Área de mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Alerta de transferência para humano */}
              {humanHandoffRequested && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <p className="text-sm text-orange-800">
                      Solicitação de atendimento humano enviada. Um especialista entrará em contato em breve.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Perguntas frequentes */}
              {messages.length === 1 && showFrequentQuestions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                    <HelpCircle className="w-4 h-4 mr-1" />
                    Perguntas Frequentes
                  </h4>
                  <div className="space-y-2">
                    {frequentQuestions.slice(0, 3).map((question, index) => (
                      <button
                        key={index}
                        onClick={() => processUserMessage(question)}
                        className="block w-full text-left text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded px-2 py-1 transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Mensagens */}
              {messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  isUser={message.sender === 'user'}
                />
              ))}
              
              {/* Indicador de digitação */}
              <TypingIndicator show={isTyping} />
              
              {/* Avaliação de satisfação */}
              {showSatisfactionRating && (
                <SatisfactionRating
                  onRate={(rating) => {
                    rateSatisfaction(rating);
                    setShowSatisfactionRating(false);
                  }}
                />
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Respostas rápidas */}
            {quickReplies.length > 0 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <QuickReplyButton
                      key={reply.id}
                      reply={reply}
                      onClick={handleQuickReply}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Anexos */}
            {attachments.length > 0 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="truncate max-w-32">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Área de input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                      title="Anexar arquivo"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    
                    <VoiceRecorder
                      isRecording={isRecording}
                      onStartRecording={() => setIsRecording(true)}
                      onStopRecording={() => setIsRecording(false)}
                      onVoiceMessage={(transcript) => {
                        setInputMessage(transcript);
                        setIsRecording(false);
                      }}
                    />
                    
                    <button
                      onClick={handleExportChat}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                      title="Exportar conversa"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => setShowSatisfactionRating(true)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                      title="Avaliar atendimento"
                    >
                      <Star className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-end space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={isTyping || humanHandoffRequested}
                    />
                    
                    <button
                      onClick={handleSendMessage}
                      disabled={(!inputMessage.trim() && attachments.length === 0) || isTyping}
                      className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Input de arquivo oculto */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MedicalChatbot;

// Componente de botão flutuante para abrir o chatbot
 
export const ChatbotFloatingButton: React.FC<{
  onClick: () => void;
  hasUnreadMessages?: boolean;
}> = ({ onClick, hasUnreadMessages = false }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 group"
    >
      <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
      {hasUnreadMessages && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        </div>
      )}
    </button>
  );
};

// Hook para controlar o estado do chatbot
/* eslint-disable-next-line react-refresh/only-export-components */
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