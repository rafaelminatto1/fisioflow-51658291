import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import ReactMarkdown from 'react-markdown';

interface Props {
  patientId: string;
  patientName: string;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

export function PatientAIChat({ patientId, patientName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const chatFunction = httpsCallable(functions, 'aiClinicalChat');
      const result = await chatFunction({ 
        patientId, 
        message: userMsg,
        history: messages // Enviar histórico para manter contexto
      });

      const aiResponse = (result.data as unknown).response;
      setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: '❌ Erro ao conectar com Gemini. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col shadow-lg border-t-4 border-t-purple-500">
      <CardHeader className="pb-3 border-b bg-purple-50/50">
        <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
          <Sparkles className="w-5 h-5" />
          Assistente Clínico Gemini
        </CardTitle>
        <p className="text-xs text-gray-500">
          Pergunte sobre o histórico de {patientName}. Ex: "Resuma a evolução da dor".
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20 space-y-2">
              <Bot className="w-12 h-12 mx-auto opacity-20" />
              <p>Olá! Sou a IA do FisioFlow.</p>
              <p className="text-sm">Analiso todo o prontuário deste paciente em segundos.</p>
            </div>
          )}
          
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-purple-600" />
                  </div>
                )}
                
                <div className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm ${
                  msg.role === 'user' 
                    ? 'bg-purple-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                </div>
                <div className="bg-gray-50 rounded-2xl px-4 py-2 text-xs text-gray-500 italic">
                  Analisando prontuário no Postgres...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-3 border-t">
        <form 
          className="flex w-full gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta clínica..."
            className="flex-1 focus-visible:ring-purple-500"
            disabled={loading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="bg-purple-600 hover:bg-purple-700"
            disabled={loading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
