import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, User, FileText, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatients } from "@/hooks/patients/usePatients";
import type { Exercise } from "@/hooks/useExercises";
import { useToast } from "@/hooks/use-toast";
import { getBestImageUrl } from "@/lib/imageUtils";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { resolveContact, findOrCreateConversation, sendMessage } from "@/services/whatsapp-api";

interface ShareExerciseToWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
}

export function ShareExerciseToWhatsAppModal({
  open,
  onOpenChange,
  exercise,
}: ShareExerciseToWhatsAppModalProps) {
  const { data: patients = [], isLoading: isLoadingPatients } = usePatients();
  const { toast } = useToast();
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>("");
  const [customMessage, setCustomMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const selectedPatient = React.useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId],
  );

  const imageUrl = React.useMemo(() => (exercise ? getBestImageUrl(exercise) : null), [exercise]);

  const defaultMessage = React.useMemo(() => {
    if (!exercise) return "";

    const parts = [`🏋️‍♂️ *${exercise.name}*`, ""];

    if (exercise.category) {
      parts.push(`📁 *Categoria:* ${exercise.category}`);
    }

    if (exercise.difficulty) {
      parts.push(`📊 *Dificuldade:* ${exercise.difficulty}`);
    }

    if (exercise.sets || exercise.repetitions || exercise.duration) {
      parts.push("⚙️ *Parâmetros:*");
      if (exercise.sets) parts.push(`   • Séries: ${exercise.sets}`);
      if (exercise.repetitions) parts.push(`   • Repetições: ${exercise.repetitions}`);
      if (exercise.duration) parts.push(`   • Duração: ${exercise.duration}s`);
    }

    if (exercise.description) {
      parts.push("");
      parts.push("📝 *Descrição:*");
      parts.push(exercise.description);
    }

    if (exercise.instructions) {
      parts.push("");
      parts.push("🎯 *Instruções:*");
      parts.push(exercise.instructions);
    }

    return parts.join("\n");
  }, [exercise]);

  const finalMessage = React.useMemo(
    () => (customMessage.trim() ? `${customMessage.trim()}\n\n${defaultMessage}` : defaultMessage),
    [customMessage, defaultMessage],
  );

  const handleSend = async () => {
    if (!exercise || !selectedPatient) return;

    setIsSending(true);

    try {
      // 1. Resolve or create contact for the patient
      const contact = await resolveContact({
        patientId: selectedPatient.id,
        displayName: selectedPatient.name || selectedPatient.full_name,
        phone: selectedPatient.phone,
      });

      // 2. Find or create conversation
      const conversation = await findOrCreateConversation(contact.id);

      // 3. Send message with exercise image
      if (imageUrl) {
        await sendMessage(conversation.id, defaultMessage, {
          type: "image",
          attachmentUrl: imageUrl,
        });
      } else {
        await sendMessage(conversation.id, defaultMessage);
      }

      // 4. Send custom message if provided
      if (customMessage.trim()) {
        await sendMessage(conversation.id, customMessage.trim());
      }

      toast({
        title: "Exercício enviado com sucesso!",
        description: `O exercício "${exercise.name}" foi enviado para ${selectedPatient.name || selectedPatient.full_name}.`,
      });

      // Reset and close
      setSelectedPatientId("");
      setCustomMessage("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending exercise via WhatsApp:", error);
      toast({
        title: "Erro ao enviar exercício",
        description:
          "Não foi possível enviar o exercício via WhatsApp. Verifique se o paciente possui um número de telefone cadastrado.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setSelectedPatientId("");
      setCustomMessage("");
    }
    onOpenChange(newOpen);
  };

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Enviar Exercício via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Selecione um paciente para enviar o exercício "{exercise.name}" via WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Patient Selection */}
            <div className="space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Selecionar Paciente
              </div>
              <PatientCombobox
                patients={patients}
                value={selectedPatientId}
                onValueChange={setSelectedPatientId}
                className="w-full"
                placeholder="Buscar paciente..."
                disabled={isLoadingPatients || isSending}
              />
            </div>

            <Separator />

            {/* Exercise Preview */}
            {exercise && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <h3 className="text-sm font-medium">Exercício</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    {imageUrl && (
                      <div className="w-24 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                        <OptimizedImage
                          src={imageUrl}
                          alt={exercise.name}
                          className="w-full h-full object-cover"
                          sizes="96px"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold text-base">{exercise.name}</h4>
                      <div className="flex gap-2 flex-wrap">
                        {exercise.category && (
                          <Badge variant="secondary" className="text-xs">
                            {exercise.category}
                          </Badge>
                        )}
                        {exercise.difficulty && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.difficulty}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {exercise.description && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {exercise.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Custom Message */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <div className="text-sm font-medium">Mensagem Personalizada (opcional)</div>
              </div>
              <textarea
                id="custom-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Adicione uma mensagem personalizada para o paciente..."
                className="w-full min-h-[80px] p-3 border rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                disabled={isSending}
              />
            </div>

            {/* Message Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <div className="text-sm font-medium">Pré-visualização da Mensagem</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg border">
                <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">
                  {finalMessage}
                </pre>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedPatientId || isSending}
            className={cn(
              "gap-2",
              selectedPatientId && !isSending && "bg-green-600 hover:bg-green-700 text-white",
            )}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar via WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
