import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSOAPRecords } from '@/hooks/useSOAPRecords';
import { X, Save, FileSignature } from 'lucide-react';
import { toast } from 'sonner';

const soapRecordSchema = z.object({
  sessionNumber: z.number().min(1, 'Número da sessão é obrigatório'),
  subjective: z.string().optional(),
  objectiveFindings: z.string().optional(),
  bloodPressure: z.string().optional(),
  heartRate: z.string().optional(),
  temperature: z.string().optional(),
  assessment: z.string().optional(),
  treatmentPlan: z.string().optional(),
  goals: z.string().optional(),
  observations: z.string().optional(),
});

type SOAPRecordFormData = z.infer<typeof soapRecordSchema>;

interface SOAPRecordEditorProps {
  patientId: string;
  onClose: () => void;
  recordId?: string;
}

export function SOAPRecordEditor({ patientId, onClose, recordId }: SOAPRecordEditorProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('subjective');
  const { addRecord, updateRecord, signRecord } = useSOAPRecords();

  const form = useForm<SOAPRecordFormData>({
    resolver: zodResolver(soapRecordSchema),
    defaultValues: {
      sessionNumber: 1,
    },
  });

  const onSubmit = async (data: SOAPRecordFormData) => {
    try {
      setLoading(true);
      
      const recordData = {
        patientId,
        sessionNumber: data.sessionNumber,
        subjective: data.subjective,
         objective: {
           inspection: data.objectiveFindings,
           palpation: '',
           movement_tests: {},
           special_tests: {},
           posture_analysis: '',
         },
        assessment: data.assessment,
         plan: {
           short_term_goals: [data.goals],
           long_term_goals: [],
           interventions: [data.treatmentPlan],
           frequency: '',
           duration: '',
           home_exercises: [],
         },
        createdBy: 'current-user-id', // Implementar com auth real
      };

      if (recordId) {
        await updateRecord(recordId, recordData);
        toast.success('Prontuário atualizado com sucesso!');
      } else {
        await addRecord(recordData);
        toast.success('Prontuário criado com sucesso!');
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar prontuário:', error);
      toast.error('Erro ao salvar prontuário');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!recordId) {
      toast.error('Salve o prontuário antes de assinar');
      return;
    }

    try {
      await signRecord(recordId);
      toast.success('Prontuário assinado digitalmente!');
      onClose();
    } catch (error) {
      toast.error('Erro ao assinar prontuário');
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          {recordId ? 'Editar Prontuário SOAP' : 'Novo Prontuário SOAP'}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="sessionNumber"
              render={({ field }) => (
                <FormItem className="w-32">
                  <FormLabel>Sessão Nº</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="subjective">Subjetivo (S)</TabsTrigger>
                <TabsTrigger value="objective">Objetivo (O)</TabsTrigger>
                <TabsTrigger value="assessment">Avaliação (A)</TabsTrigger>
                <TabsTrigger value="plan">Plano (P)</TabsTrigger>
              </TabsList>

              <TabsContent value="subjective" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Subjetivo - Queixa do Paciente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="subjective"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relato do paciente sobre sintomas, dor, limitações</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Descreva os sintomas relatados pelo paciente, intensidade da dor, limitações funcionais, etc."
                              className="min-h-[120px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="objective" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Objetivo - Exame Físico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="objectiveFindings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Achados do Exame Físico</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Inspeção, palpação, testes especiais, amplitude de movimento, força muscular, etc."
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="bloodPressure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pressão Arterial</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="120/80 mmHg" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="heartRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequência Cardíaca</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="72 bpm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperatura</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="36.5°C" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assessment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Avaliação - Diagnóstico Fisioterapêutico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="assessment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diagnóstico e Interpretação dos Achados</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Diagnóstico fisioterapêutico, interpretação dos dados coletados, prognóstico, etc."
                              className="min-h-[120px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="plan" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Plano - Tratamento Proposto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="treatmentPlan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plano de Tratamento</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Técnicas, exercícios, modalidades terapêuticas a serem utilizadas"
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="goals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objetivos do Tratamento</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Objetivos a curto e longo prazo"
                              className="min-h-[80px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="observations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações Adicionais</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Orientações ao paciente, recomendações, etc."
                              className="min-h-[80px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                {recordId && (
                  <Button type="button" variant="outline" onClick={handleSign}>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Assinar
                  </Button>
                )}
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}