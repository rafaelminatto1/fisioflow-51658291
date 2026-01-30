import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGamification } from '@/hooks/useGamification';
import { useAuth } from '@/contexts/AuthContext';
import { Target, CheckCircle2, Circle, Flame, Star, Calendar, Trophy, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import GamificationHeader from '@/components/gamification/GamificationHeader';
import WeeklyChallenges from '@/components/gamification/WeeklyChallenges';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function GamificationQuestsPage() {
  const { user } = useAuth();
  const {
    profile,
    dailyQuests,
    completeQuest,
    xpPerLevel
  } = useGamification(user?.id || '');

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  const completedQuests = dailyQuests?.filter(q => q.completed).length || 0;
  const totalQuests = dailyQuests?.length || 0;
  const allCompleted = completedQuests === totalQuests && totalQuests > 0;
  const totalXp = dailyQuests?.reduce((sum, q) => sum + (q.completed ? q.xp : 0), 0) || 0;

  const ICON_MAP: Record<string, React.ElementType> = {
    Star,
    Target,
    Flame,
    Circle,
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/50 pb-20">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Target className="w-8 h-8 text-primary" />
                Missões
              </h1>
              <p className="text-muted-foreground mt-1">
                Complete missões para ganhar XP e subir de nível
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                +{totalXp} XP hoje
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <GamificationHeader
            level={profile?.level || 1}
            currentXp={profile?.current_xp || 0}
            xpPerLevel={xpPerLevel}
            streak={profile?.current_streak || 0}
          />

          {/* Daily Progress Summary */}
          <Card className={allCompleted ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" : ""}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-primary" />
                  <div>
                    <h2 className="font-bold text-lg">Missões Diárias</h2>
                    <p className="text-sm text-muted-foreground">
                      {completedQuests} de {totalQuests} completas
                    </p>
                  </div>
                </div>
                <Badge variant={allCompleted ? "default" : "secondary"} className="gap-1">
                  {allCompleted && <Flame className="w-3 h-3" />}
                  {Math.round((completedQuests / totalQuests) * 100)}%
                </Badge>
              </div>
              <Progress value={(completedQuests / totalQuests) * 100} className="h-3" />

              {allCompleted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white text-center"
                >
                  <p className="font-semibold">🎉 Parabéns! Todas as missões diárias concluídas!</p>
                </motion.div>
              )}
            </div>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'daily' | 'weekly')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="daily" className="gap-2">
                <Calendar className="w-4 h-4" />
                Missões Diárias
              </TabsTrigger>
              <TabsTrigger value="weekly" className="gap-2">
                <Trophy className="w-4 h-4" />
                Desafios Semanais
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-6">
              {/* Daily Quests */}
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {dailyQuests?.map((quest) => {
                  const Icon = ICON_MAP[quest.icon || 'Star'] || Star;
                  return (
                    <motion.div
                      key={quest.id}
                      variants={item}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(var(--primary), 0.02)' }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        relative overflow-hidden p-4 rounded-xl border transition-all cursor-pointer
                        ${quest.completed
                          ? 'bg-green-50/50 border-green-200'
                          : 'bg-white hover:border-primary/50 shadow-sm hover:shadow-md'
                        }
                      `}
                      onClick={() => !quest.completed && completeQuest.mutate({ questId: quest.id })}
                    >
                      {/* Quest Completion Animation BG */}
                      {quest.completed && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          className="absolute inset-0 bg-green-500/5 origin-left"
                        />
                      )}

                      <div className="relative flex items-center gap-4">
                        <div className={`
                          h-14 w-14 rounded-full flex items-center justify-center text-xl shrink-0 transition-colors
                          ${quest.completed ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-500'}
                        `}>
                          {quest.completed ? (
                            <CheckCircle2 className="w-7 h-7" />
                          ) : (
                            <Icon className="w-6 h-6 fill-current" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-semibold truncate ${quest.completed && 'text-muted-foreground line-through'}`}>
                              {quest.title}
                            </h4>
                            {quest.difficulty && (
                              <Badge variant="outline" className="text-xs">
                                {quest.difficulty}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{quest.description}</p>
                          {quest.expires_at && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              Expira às {new Date(quest.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-2">
                          <Badge variant="outline" className={`
                            ${quest.completed ? 'border-green-200 text-green-700 bg-green-50' : 'border-yellow-200 text-yellow-700 bg-yellow-50'}
                          `}>
                            +{quest.xp} XP
                          </Badge>
                          {!quest.completed && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={completeQuest.isPending}
                            >
                              {completeQuest.isPending ? '...' : 'Completar'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {(!dailyQuests || dailyQuests.length === 0) && (
                  <Card className="p-8">
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Target className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium">Nenhuma missão disponível</p>
                      <p className="text-sm mt-1">Volte mais tarde para novas missões diárias</p>
                    </div>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="weekly" className="mt-6">
              {/* Weekly Challenges */}
              <WeeklyChallenges patientId={user?.id || ''} />
            </TabsContent>
          </Tabs>

          {/* Tips Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Dica
              </h3>
              <p className="text-sm text-muted-foreground">
                Complete as missões diárias todos os dias para manter sua sequência ativa e ganhar bônus de XP a cada 3, 7 e 30 dias consecutivos!
              </p>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
