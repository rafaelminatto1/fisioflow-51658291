import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Users, Zap, CheckCircle2, ArrowRight, Activity, Calendar } from "lucide-react";
import { requestPublic } from "@/api/v2/base";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function ReferralLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [referral, setReferral] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const res = await requestPublic<{ data: any }>(`/api/marketing/referrals/code/${code}`);
        setReferral(res.data);
      } catch (err) {
        console.error("Failed to load referral code", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (code) fetchCode();
  }, [code]);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSkeleton type="card" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header Simples */}
      <header className="h-20 flex items-center justify-center border-b bg-card sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="text-xl font-black tracking-tighter text-slate-900">
            FISIO<span className="text-primary italic">FLOW</span>
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Badge className="mb-6 bg-purple-100 text-purple-700 hover:bg-purple-100 border-none px-4 py-1 rounded-full">
          🎁 Convite Especial Ativo
        </Badge>

        <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight">
          Você ganhou um presente de <span className="text-primary">fisioterapia!</span>
        </h1>

        <p className="text-lg text-slate-600 mb-12 max-w-xl mx-auto">
          Um amigo indicou você para a elite da reabilitação física. Use o código abaixo para
          garantir seu benefício na primeira avaliação.
        </p>

        {/* Card do Código */}
        <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] p-8 mb-12 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-500">
            <Gift size={120} className="text-primary" />
          </div>

          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">
              Seu Código de Boas-Vindas
            </CardTitle>
            <CardDescription>Válido para novos pacientes</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 mb-8">
              <span className="text-4xl md:text-5xl font-black tracking-[0.2em] text-primary font-mono uppercase">
                {code}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex items-center gap-2 text-slate-600 font-bold">
                <CheckCircle2 className="text-emerald-500" />
                <span>{referral?.reward_value}% de Desconto</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-slate-200" />
              <div className="flex items-center gap-2 text-slate-600 font-bold">
                <CheckCircle2 className="text-emerald-500" />
                <span>Avaliação Completa</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="space-y-6">
          <Button
            className="w-full max-w-md h-16 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-black shadow-xl shadow-primary/20 transition-all hover:scale-105"
            onClick={() => navigate(`/agendar/moocafisio?referral=${code}`)}
          >
            Agendar minha Avaliação Agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
            * Sujeito a disponibilidade de agenda na Mooca Fisio.
          </p>
        </div>

        {/* Como funciona */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <Zap className="text-amber-500 h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800">Agendamento Fácil</h4>
            <p className="text-xs text-slate-500">Escolha o melhor horário online em segundos.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <Users className="text-indigo-500 h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800">Equipe de Elite</h4>
            <p className="text-xs text-slate-500">
              Fisioterapeutas especializados e tecnologia de ponta.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <Calendar className="text-emerald-500 h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800">Foco em Resultados</h4>
            <p className="text-xs text-slate-500">Planos de tratamento personalizados com IA.</p>
          </div>
        </div>
      </main>

      <footer className="py-12 border-t text-center">
        <p className="text-sm text-slate-400">© 2026 FisioFlow Corporation • Mooca, São Paulo</p>
      </footer>
    </div>
  );
}
