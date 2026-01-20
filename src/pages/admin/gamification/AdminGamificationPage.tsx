import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Award, Gift, Zap, BarChart3, TrendingUp, Settings } from 'lucide-react';
import QuestsManager from '@/components/admin/gamification/QuestsManager';
import AchievementsManager from '@/components/admin/gamification/AchievementsManager';
import RewardsManager from '@/components/admin/gamification/RewardsManager';
import ChallengesManager from '@/components/admin/gamification/ChallengesManager';
import GamificationDashboard from '@/components/admin/gamification/GamificationDashboard';
import LeaderboardTable from '@/components/admin/gamification/LeaderboardTable';
import LevelSystemConfig from '@/components/admin/gamification/LevelSystemConfig';
import EngagementReports from '@/components/admin/gamification/EngagementReports';

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

                <Tabs defaultValue="dashboard" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                        <TabsTrigger value="dashboard" className="gap-2">
                            <BarChart3 className="h-4 w-4" />
                            <span className="hidden sm:inline">Dashboard</span>
                            <span className="sm:hidden">Dash</span>
                        </TabsTrigger>
                        <TabsTrigger value="ranking" className="gap-2">
                            <Trophy className="h-4 w-4" />
                            Ranking
                        </TabsTrigger>
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
                        <TabsTrigger value="levels" className="gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Níveis
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Relatórios
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
                </Tabs>
            </div>
        </MainLayout>
    );
}

