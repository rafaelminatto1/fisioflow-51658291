import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';

export default function PendingApproval() {
    const { user, signOut } = useAuth();

    return (
        <MainLayout>
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full shadow-lg">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-amber-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                            <Clock className="w-8 h-8 text-amber-600" />
                        </div>
                        <CardTitle className="text-xl text-amber-700">Aprovação Pendente</CardTitle>
                        <CardDescription>
                            Olá, <span className="font-medium text-gray-900">{user?.displayName || user?.email}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-gray-600">
                            Seu cadastro foi realizado com sucesso e está aguardando aprovação da nossa equipe administrativa.
                        </p>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm text-left">
                            <p className="font-semibold text-amber-800 mb-1">Próximos passos:</p>
                            <ul className="list-disc list-inside text-amber-700 space-y-1">
                                <li>Nossa equipe revisará seus dados</li>
                                <li>Você receberá um email assim que aprovado</li>
                                <li>O acesso será liberado conforme seu perfil</li>
                            </ul>
                        </div>
                        <p className="text-sm text-gray-500">
                            Se você acredita que isso é um erro ou precisa de acesso urgente, entre em contato com o administrador.
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button variant="outline" onClick={signOut} className="w-full">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair da conta
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </MainLayout>
    );
}
