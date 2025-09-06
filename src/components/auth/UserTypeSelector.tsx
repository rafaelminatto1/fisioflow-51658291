import { UserRole } from '@/types/auth';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Stethoscope, GraduationCap, Building } from 'lucide-react';

interface UserTypeSelectorProps {
  selectedType?: UserRole;
  onSelect: (type: UserRole) => void;
}

const userTypes = [
  {
    value: 'paciente' as UserRole,
    title: 'Paciente',
    description: 'Sou paciente e quero acompanhar meu tratamento',
    icon: Users,
    primary: true
  },
  {
    value: 'fisioterapeuta' as UserRole,
    title: 'Fisioterapeuta',
    description: 'Sou fisioterapeuta e quero gerenciar meus pacientes',
    icon: Stethoscope,
    primary: true
  },
  {
    value: 'estagiario' as UserRole,
    title: 'Estagiário',
    description: 'Sou estudante de fisioterapia em estágio',
    icon: GraduationCap,
    primary: false
  },
  {
    value: 'parceiro' as UserRole,
    title: 'Parceiro',
    description: 'Represento uma clínica ou instituição',
    icon: Building,
    primary: false
  }
];

export function UserTypeSelector({ selectedType, onSelect }: UserTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Que tipo de conta você quer criar?</h2>
        <p className="text-muted-foreground mt-2">
          Selecione a opção que melhor descreve você
        </p>
      </div>

      <div className="grid gap-4">
        {userTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.value;
          
          return (
            <Card
              key={type.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => onSelect(type.value)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    type.primary 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{type.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {type.description}
                    </CardDescription>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    isSelected 
                      ? 'bg-primary border-primary' 
                      : 'border-muted-foreground'
                  }`}>
                    {isSelected && (
                      <div className="w-full h-full rounded-full bg-primary-foreground scale-50" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={() => selectedType && onSelect(selectedType)}
          disabled={!selectedType}
          size="lg"
          className="w-full max-w-xs"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}