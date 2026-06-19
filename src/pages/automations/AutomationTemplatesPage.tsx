import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Zap, Clock, DollarSign, Calendar, TrendingUp } from "lucide-react";

export function AutomationTemplatesPage() {
  const navigate = useNavigate();

  const categories = [
    {
      id: "retention",
      title: "Retenção e Relacionamento",
      templates: [
        {
          id: "onboarding",
          title: "Boas-vindas (Onboarding)",
          description: "Envie um vídeo do Google Maps de como chegar, onde estacionar e link de FAQ para novos pacientes.",
          trigger: "Paciente Cadastrado",
          icon: <MessageSquare className="w-5 h-5 text-emerald-500" />,
          color: "bg-emerald-50 border-emerald-200"
        },
        {
          id: "nps",
          title: "Pesquisa NPS (Pós-Sessão)",
          description: "Peça uma nota de 1 a 10 após a 1ª ou a 10ª sessão do pacote e monitore a satisfação.",
          trigger: "Evolução Finalizada",
          icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
          color: "bg-blue-50 border-blue-200"
        },
        {
          id: "recuperacao",
          title: "Recuperação de Inativos",
          description: "Lembre a secretária de ligar ou envie um WhatsApp amigável se o paciente sumir por 30 dias.",
          trigger: "30 dias sem agendamento",
          icon: <Clock className="w-5 h-5 text-orange-500" />,
          color: "bg-orange-50 border-orange-200"
        }
      ]
    },
    {
      id: "operational",
      title: "Operacional e Agenda",
      templates: [
        {
          id: "confirmacao-agenda",
          title: "Confirmação Inteligente de Agenda",
          description: "WhatsApp 24h antes com botões interativos para confirmar ou remarcar, atualizando o sistema.",
          trigger: "24h antes da sessão",
          icon: <Calendar className="w-5 h-5 text-indigo-500" />,
          color: "bg-indigo-50 border-indigo-200"
        },
        {
          id: "fim-pacote",
          title: "Aviso de Fim de Pacote",
          description: "Alerta interno para o Fisioterapeuta e Secretária na 8ª sessão para já oferecer a renovação.",
          trigger: "Evolução Finalizada (Sessão 8/10)",
          icon: <Zap className="w-5 h-5 text-amber-500" />,
          color: "bg-amber-50 border-amber-200"
        }
      ]
    },
    {
      id: "financial",
      title: "Financeiro",
      templates: [
        {
          id: "lembrete-vencimento",
          title: "Lembrete de Pagamento Vencendo",
          description: "Envio de PIX ou código de barras no WhatsApp 1 dia antes do vencimento da cobrança.",
          trigger: "1 dia antes do vencimento",
          icon: <DollarSign className="w-5 h-5 text-green-500" />,
          color: "bg-green-50 border-green-200"
        }
      ]
    }
  ];

  return (
    <PageLayout 
      title="Escolha um Modelo de Automação" 
      subtitle="Comece com um modelo pronto ou crie o seu do zero."
    >
      <div className="flex flex-col space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/automacoes")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Automações
          </Button>

          <Button onClick={() => navigate("/automacoes/builder/new")}>
            <Zap className="w-4 h-4 mr-2" />
            Começar do Zero
          </Button>
        </div>

        {categories.map((category) => (
          <div key={category.id} className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">{category.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.templates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`flex flex-col cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 border-2 border-transparent hover:${template.color.split(" ")[1]}`}
                  onClick={() => navigate(`/automacoes/builder/new?template=${template.id}`)}
                >
                  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                    <div className={`p-2 rounded-lg ${template.color}`}>
                      {template.icon}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <CardTitle className="text-base mb-2">{template.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Badge variant="secondary" className="font-normal text-xs bg-slate-100">
                      Gatilho: {template.trigger}
                    </Badge>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}

export default AutomationTemplatesPage;