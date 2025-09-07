import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Dumbbell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/hooks/useData';

const exerciseSchema = z.object({
  name: z.string().min(2, 'Nome do exercício é obrigatório'),
  category: z.enum(['fortalecimento', 'alongamento', 'mobilidade', 'cardio', 'equilibrio', 'respiratorio'], {
    required_error: 'Categoria é obrigatória',
  }),
  difficulty: z.enum(['iniciante', 'intermediario', 'avancado'], {
    required_error: 'Dificuldade é obrigatória',
  }),
  duration: z.string().min(1, 'Duração é obrigatória'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  instructions: z.string().min(10, 'Instruções são obrigatórias'),
  targetMuscles: z.array(z.string()).min(1, 'Selecione pelo menos um músculo alvo'),
  equipment: z.array(z.string()).optional(),
  contraindications: z.string().optional(),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

interface NewExerciseModalProps {
  trigger?: React.ReactNode;
}

const muscleGroups = [
  'Quadríceps', 'Isquiotibiais', 'Glúteos', 'Panturrilha', 'Tibial',
  'Bíceps', 'Tríceps', 'Deltoides', 'Peitoral', 'Dorsais',
  'Trapézio', 'Romboides', 'Core', 'Lombar', 'Cervical'
];

const equipmentOptions = [
  'Sem equipamento', 'Halteres', 'Elásticos', 'Bola suíça', 'Colchonete',
  'Bastão', 'Theraband', 'Step', 'Cones', 'Aparelhos'
];

export function NewExerciseModal({ trigger }: NewExerciseModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [muscleInput, setMuscleInput] = useState('');
  const [equipmentInput, setEquipmentInput] = useState('');
  const { toast } = useToast();
  const { addExercise } = useData();

  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: '',
      duration: '',
      description: '',
      instructions: '',
      targetMuscles: [],
      equipment: [],
      contraindications: '',
    },
  });

  const addMuscle = (muscle: string) => {
    if (muscle && !selectedMuscles.includes(muscle)) {
      const newMuscles = [...selectedMuscles, muscle];
      setSelectedMuscles(newMuscles);
      form.setValue('targetMuscles', newMuscles);
      setMuscleInput('');
    }
  };

  const removeMuscle = (muscle: string) => {
    const newMuscles = selectedMuscles.filter(m => m !== muscle);
    setSelectedMuscles(newMuscles);
    form.setValue('targetMuscles', newMuscles);
  };

  const addEquipment = (equipment: string) => {
    if (equipment && !selectedEquipment.includes(equipment)) {
      const newEquipment = [...selectedEquipment, equipment];
      setSelectedEquipment(newEquipment);
      form.setValue('equipment', newEquipment);
      setEquipmentInput('');
    }
  };

  const removeEquipment = (equipment: string) => {
    const newEquipment = selectedEquipment.filter(e => e !== equipment);
    setSelectedEquipment(newEquipment);
    form.setValue('equipment', newEquipment);
  };

   const onSubmit = (data: ExerciseFormData) => {
     const exerciseData = {
       name: data.name!,
       description: data.description!,
       instructions: data.instructions!,
       category: data.category || 'fortalecimento',
       difficulty: data.difficulty || 'iniciante',
       duration: data.duration || '10',
       equipment: data.equipment || [],
       targetMuscles: data.targetMuscles || [],
       contraindications: data.contraindications,
     };
     addExercise(exerciseData);
    
    toast({
      title: 'Exercício criado!',
      description: `${data.name} foi adicionado à biblioteca de exercícios.`,
    });
    
    form.reset();
    setSelectedMuscles([]);
    setSelectedEquipment([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-primary hover:opacity-90">
            <Dumbbell className="w-4 h-4 mr-2" />
            Novo Exercício
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Criar Novo Exercício
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Exercício</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Agachamento livre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 3x15, 30 segundos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fortalecimento">Fortalecimento</SelectItem>
                        <SelectItem value="alongamento">Alongamento</SelectItem>
                        <SelectItem value="mobilidade">Mobilidade</SelectItem>
                        <SelectItem value="cardio">Cardiovascular</SelectItem>
                        <SelectItem value="equilibrio">Equilíbrio</SelectItem>
                        <SelectItem value="respiratorio">Respiratório</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dificuldade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a dificuldade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="iniciante">Iniciante</SelectItem>
                        <SelectItem value="intermediario">Intermediário</SelectItem>
                        <SelectItem value="avancado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o exercício de forma breve..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instruções Detalhadas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Passo a passo para execução do exercício..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Músculos Alvo */}
            <div className="space-y-3">
              <FormLabel>Músculos Alvo</FormLabel>
              <div className="flex gap-2">
                <Select value={muscleInput} onValueChange={setMuscleInput}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione músculos" />
                  </SelectTrigger>
                  <SelectContent>
                    {muscleGroups.map((muscle) => (
                      <SelectItem key={muscle} value={muscle}>
                        {muscle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => addMuscle(muscleInput)}
                  disabled={!muscleInput || selectedMuscles.includes(muscleInput)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {selectedMuscles.map((muscle) => (
                  <Badge
                    key={muscle}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {muscle}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeMuscle(muscle)}
                    />
                  </Badge>
                ))}
              </div>
              {form.formState.errors.targetMuscles && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.targetMuscles.message}
                </p>
              )}
            </div>

            {/* Equipamentos */}
            <div className="space-y-3">
              <FormLabel>Equipamentos (Opcional)</FormLabel>
              <div className="flex gap-2">
                <Select value={equipmentInput} onValueChange={setEquipmentInput}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione equipamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentOptions.map((equipment) => (
                      <SelectItem key={equipment} value={equipment}>
                        {equipment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => addEquipment(equipmentInput)}
                  disabled={!equipmentInput || selectedEquipment.includes(equipmentInput)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {selectedEquipment.map((equipment) => (
                  <Badge
                    key={equipment}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    {equipment}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeEquipment(equipment)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="contraindications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraindicações (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Situações onde o exercício não deve ser realizado..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-primary hover:opacity-90">
                Criar Exercício
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}