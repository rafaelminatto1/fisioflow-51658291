import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RequiredTest {
    id: string;
    name: string;
    critical: boolean;
    completed: boolean;
}

interface MandatoryTestAlertProps {
    tests: RequiredTest[];
    onResolve: (testId: string) => void;
}

export const MandatoryTestAlert = ({ tests, onResolve }: MandatoryTestAlertProps) => {
    const pendingTests = tests.filter(t => !t.completed);
    const criticalTests = pendingTests.filter(t => t.critical);

    if (pendingTests.length === 0) return null;

    const isCritical = criticalTests.length > 0;

    return (
        <Alert variant={isCritical ? "destructive" : "default"} className={`mb-6 ${isCritical ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-amber-500 bg-amber-50 dark:bg-amber-900/10'}`}>
            <div className="flex items-start gap-4">
                {isCritical ? <AlertCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
                <div className="flex-1">
                    <AlertTitle className={`text-base font-semibold ${isCritical ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {isCritical ? 'Testes Obrigatórios Pendentes (Bloqueia Salvamento)' : 'Testes Recomendados Pendentes'}
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-sm text-foreground/80">
                        <ul className="list-disc pl-5 space-y-1">
                            {pendingTests.map(test => (
                                <li key={test.id} className="flex items-center justify-between gap-2">
                                    <span>
                                        <span className="font-medium">{test.name}</span>
                                        {test.critical && <span className="ml-2 text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded border border-red-200">OBRIGATÓRIO</span>}
                                    </span>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 text-sky-600 hover:no-underline"
                                        onClick={() => onResolve(test.id)}
                                    >
                                        Registrar Agora
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </AlertDescription>
                </div>
            </div>
        </Alert>
    );
};
