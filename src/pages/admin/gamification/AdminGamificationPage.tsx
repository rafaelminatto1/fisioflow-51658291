import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { Trophy, Target, Award, Gift, Zap, BarChart3, TrendingUp, Settings, RotateCcw } from 'lucide-react';
import QuestsManager from '@/components/admin/gamification/QuestsManager';
import AchievementsManager from '@/components/admin/gamification/AchievementsManager';
import RewardsManager from '@/components/admin/gamification/RewardsManager';
import ChallengesManager from '@/components/admin/gamification/ChallengesManager';
import GamificationDashboard from '@/components/admin/gamification/GamificationDashboard';
import LeaderboardTable from '@/components/admin/gamification/LeaderboardTable';
import LevelSystemConfig from '@/components/admin/gamification/LevelSystemConfig';
import EngagementReports from '@/components/admin/gamification/EngagementReports';
import GamificationSettings from '@/components/admin/gamification/GamificationSettings';

export default function AdminGamificationPage() {
    return (
        <MainLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Header com título e descrição */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Trophy className="h-8 w-8 text-yellow-500" />
                            Gestão de Gamificação
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Configure missões, conquistas, recompensas e desafios para engajar seus pacientes.
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="dashboard" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 h-auto gap-1">
                        <TabsTrigger value="dashboard" className="gap-2 flex-col h-auto py-3 data-[state=active]:bg-primary/10">
                            <BarChart3 className="h-4 w-4" />
                            <span className="text-xs">Dashboard</span>
                        </TabsTrigger>
                        <TabsTrigger value="ranking" className="gap-2 flex-col h-auto py-3 data-[state=active]:bg-primary/10">
                            <Trophy className="h-4 w-4" />
                            <span className="text-xs">Ranking</span>
                        </TabsTrigger>
                        <TabsTrigger value="quests" className="gap-2 flex-col h-auto py-3 data-[state=active]:bg-primary/10">
                            <Target className="h-4 w-4" />
                            <span className="text-xs">Missões</span>
                        </TabsTrigger>
                        <TabsTrigger value="achievements" className="gap-2 flex-col h-auto py-3 data-[state=active]:bg-primary/10">
                            <Award className="h-4 w-4" />
                            <span className="text-xs">Conquistas</span>
                        </TabsTrigger>
                        <TabsTrigger value="rewards" className="gap-2 flex-col h-auto py-3 data-[state=active]:bg-primary/10">
                            <Gift className="h-4 w-4" />
                            <span className="text-xs">Recompensas</span>
                        </TabsTrigger>
                        <TabsTrigger value="challenges" className="gap-2 flex-col h-auto py-3 data-[state=active]:bg-primary/10">
                            <Zap className="h-4 w-4" />
                            <span className="text-xs">Desafios</span>
                        </TabsTrigger>
                        <TabsTrigger value="levels" className="gap-2 flex-col h-auto py-3 data-[state=active]:bg-primary/10">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs">Níveis</span>
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="gap-2 flex-col h-auto py-3 data-[state=active]:bg-primary/10">
                            <BarChart3 className="h-4 w-4" />
                            <span className="text-xs">Relatórios</span>
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2 flex-col h-auto py-3 data-[state=active]:bg-primary/10">
                            <Settings className="h-4 w-4" />
                            <span className="text-xs">Config</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="mt-6">
                        <GamificationDashboard />
                    </TabsContent>

                    <TabsContent value="ranking" className="mt-6">
                        <LeaderboardTable />
                    </TabsContent>

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

                    <TabsContent value="levels" className="mt-6">
                        <LevelSystemConfig />
                    </TabsContent>

                    <TabsContent value="reports" className="mt-6">
                        <EngagementReports />
                    </TabsContent>

                    <TabsContent value="settings" className="mt-6">
                        <GamificationSettings />
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}
