import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Construction, ArrowLeft } from 'lucide-react';

const MedicalRecord = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] p-6 space-y-8 animate-fade-in relative overflow-hidden">

        {/* Decorative background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />

        {/* Icon Container with premium effect */}
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
          <div className="relative w-32 h-32 bg-card/50 backdrop-blur-xl border border-primary/10 rounded-3xl flex items-center justify-center shadow-2xl hover:scale-105 transition-transform duration-500">
            <Construction className="w-14 h-14 text-primary" />
          </div>
        </div>

        <div className="text-center space-y-4 max-w-lg mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-blue-600 bg-clip-text text-transparent">
              Em Desenvolvimento
            </span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Estamos preparando um Prontuário Eletrônico revolucionário para você.
            Todas as ferramentas clínicas que você precisa estarão disponíveis em breve.
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            size="lg"
            className="border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default MedicalRecord;