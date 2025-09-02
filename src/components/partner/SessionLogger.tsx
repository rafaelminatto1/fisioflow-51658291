import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface SessionLoggerProps {
  patientId?: string;
  onSessionLogged?: () => void;
}

export function SessionLogger({ patientId, onSessionLogged }: SessionLoggerProps) {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    session_date: new Date().toISOString().slice(0, 16),
    session_type: '',
    duration_minutes: 60,
    notes: '',
    shared_with_physio: true
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.user_id) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('partner_sessions')
        .insert({
          ...formData,
          partner_id: profile.user_id,
          session_date: new Date(formData.session_date).toISOString()
        });

      if (error) throw error;

      // Use session from voucher if applicable
      if (patientId) {
        const { data: purchase } = await supabase
          .from('voucher_purchases')
          .select('id, sessions_remaining')
          .eq('patient_id', patientId)
          .eq('status', 'active')
          .single();

        if (purchase && purchase.sessions_remaining && purchase.sessions_remaining > 0) {
          await supabase
            .from('voucher_purchases')
            .update({ 
              sessions_remaining: purchase.sessions_remaining - 1,
              status: purchase.sessions_remaining === 1 ? 'expired' : 'active'
            })
            .eq('id', purchase.id);
        }
      }

      toast({
        title: "Sessão registrada!",
        description: "A sessão foi registrada com sucesso.",
      });

      // Reset form
      setFormData({
        patient_id: patientId || '',
        session_date: new Date().toISOString().slice(0, 16),
        session_type: '',
        duration_minutes: 60,
        notes: '',
        shared_with_physio: true
      });

      onSessionLogged?.();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível registrar a sessão.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `session-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      toast({
        title: "Foto enviada!",
        description: "A foto foi anexada à sessão.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível enviar a foto.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Registrar Sessão de Treino
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!patientId && (
            <div className="space-y-2">
              <Label htmlFor="patient">Paciente</Label>
              <Select 
                value={formData.patient_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, patient_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar paciente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient1">João Silva</SelectItem>
                  <SelectItem value="patient2">Maria Santos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session_date">Data e Horário</Label>
              <Input
                id="session_date"
                type="datetime-local"
                value={formData.session_date}
                onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="180"
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session_type">Tipo de Treino</Label>
            <Select 
              value={formData.session_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, session_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar tipo de treino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fortalecimento">Fortalecimento</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="funcional">Funcional</SelectItem>
                <SelectItem value="mobilidade">Mobilidade</SelectItem>
                <SelectItem value="reabilitacao">Reabilitação</SelectItem>
                <SelectItem value="pilates">Pilates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações da Sessão</Label>
            <Textarea
              id="notes"
              placeholder="Descreva os exercícios realizados, dificuldades encontradas, progressos observados..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Fotos da Sessão</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                asChild
              >
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Adicionar Foto'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="share_with_physio"
                checked={formData.shared_with_physio}
                onChange={(e) => setFormData(prev => ({ ...prev, shared_with_physio: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="share_with_physio" className="text-sm">
                Compartilhar com fisioterapeuta
              </Label>
            </div>
            <Button type="submit" disabled={submitting || !formData.session_type}>
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Salvando...' : 'Registrar Sessão'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}