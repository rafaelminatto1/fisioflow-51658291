import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FormBuilder } from "@/components/forms/builder/FormBuilder";
import { useEvaluationFormWithFields } from "@/hooks/useEvaluationForms";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

const EditTemplatePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: form, isLoading, error } = useEvaluationFormWithFields(id);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !form) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <h2 className="text-xl font-semibold text-destructive">Template não encontrado</h2>
                <p className="text-muted-foreground">O modelo que você está tentando editar não existe ou foi removido.</p>
                <Button onClick={() => navigate("/templates")}>Voltar para Templates</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/templates")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Editar Template</h1>
                    <p className="text-muted-foreground">Ajuste os campos do seu modelo de avaliação.</p>
                </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-6">
                <FormBuilder 
                    formId={id}
                    initialData={form}
                    onSave={() => navigate("/templates")}
                    onBack={() => navigate("/templates")}
                />
            </div>
        </div>
    );
};

export default EditTemplatePage;
