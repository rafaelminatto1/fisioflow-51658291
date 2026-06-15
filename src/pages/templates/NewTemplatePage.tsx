import React from "react";
import { useNavigate } from "react-router-dom";
import { FormBuilder } from "@/components/forms/builder/FormBuilder";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NewTemplatePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/templates")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Template de Avaliação</h1>
          <p className="text-muted-foreground">
            Crie uma nova ficha personalizada para seus atendimentos.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-6">
        <FormBuilder onSave={() => navigate("/templates")} onBack={() => navigate("/templates")} />
      </div>
    </div>
  );
};

export default NewTemplatePage;
