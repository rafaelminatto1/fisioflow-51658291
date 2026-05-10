import { MainLayout } from "@/components/layout/MainLayout";
import { DemonstrativoMensalContent } from "./components/DemonstrativoMensalContent";

export default function DemonstrativoMensalPage() {
  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tighter">Raio-X Financeiro</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px] mt-1">
            Inteligência e Performance Mensal
          </p>
        </div>
        <DemonstrativoMensalContent />
      </div>
    </MainLayout>
  );
}
