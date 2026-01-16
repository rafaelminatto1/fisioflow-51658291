import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Award, Settings, Gift, Zap } from 'lucide-react';
import QuestsManager from '@/components/admin/gamification/QuestsManager';
import AchievementsManager from '@/components/admin/gamification/AchievementsManager';
import GamificationSettings from '@/components/admin/gamification/GamificationSettings';
import RewardsManager from '@/components/admin/gamification/RewardsManager';
import ChallengesManager from '@/components/admin/gamification/ChallengesManager';

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
                        Configure missões, conquistas, recompensas e desafios para engajar seus pacientes.
                    </p>
                </div>

                <Tabs defaultValue="quests" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 max-w-[800px]">
                        <TabsTrigger value="quests" className="gap-2">
                            <Target className="h-4 w-4" />
                            Missões
                        </TabsTrigger>
                        <TabsTrigger value="achievements" className="gap-2">
                            <Award className="h-4 w-4" />
                            Conquistas
                        </TabsTrigger>
                        <TabsTrigger value="rewards" className="gap-2">
                            <Gift className="h-4 w-4" />
                            Recompensas
                        </TabsTrigger>
                        <TabsTrigger value="challenges" className="gap-2">
                            <Zap className="h-4 w-4" />
                            Desafios
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2">
                            <Settings className="h-4 w-4" />
                            Config
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="quests" className="mt-6">
                        <QuestsManager />
                    </TabsContent>

                    <TabsContent value="achievements" className="mt-6">
                        <AchievementsManager />
                    </TabsContent>

                    <TabsContent value="rewards" className="mt-6">
                        <RewardsManager />
                    </TabsContent>

                    <TabsContent value="challenges" className="mt-6">
                        <ChallengesManager />
                    </TabsContent>

                    <TabsContent value="settings" className="mt-6">
                        <GamificationSettings />
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}

