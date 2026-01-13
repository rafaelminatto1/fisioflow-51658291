import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Award, Settings } from 'lucide-react';
import QuestsManager from '@/components/admin/gamification/QuestsManager';
import AchievementsManager from '@/components/admin/gamification/AchievementsManager';

export default function AdminGamificationPage() {
    return (
        <MainLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-yellow-500" />
                        Gestão de Gamificação
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Configure missões, conquistas e recompensas para engajar seus pacientes.
                    </p>
                </div>

                <Tabs defaultValue="quests" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                        <TabsTrigger value="quests" className="gap-2">
                            <Target className="h-4 w-4" />
                            Missões
                        </TabsTrigger>
                        <TabsTrigger value="achievements" className="gap-2">
                            <Award className="h-4 w-4" />
                            Conquistas
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2" disabled>
                            <Settings className="h-4 w-4" />
                            Configurações
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="quests" className="mt-6">
                        <QuestsManager />
                    </TabsContent>

                    <TabsContent value="achievements" className="mt-6">
                        <AchievementsManager />
                    </TabsContent>

                    <TabsContent value="settings" className="mt-6">
                        <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                            Configurações globais de níveis e XP em breve.
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}
