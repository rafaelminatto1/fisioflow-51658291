import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Target, 
  Flame, 
  Star, 
  Gift, 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award,
  Zap,
  Crown,
  Medal,
  Sparkles,
  Play,
  CheckCircle,
  Lock,
  Timer,
  BarChart3
} from 'lucide-react';
import { useGamification, Achievement, Challenge, Reward, LeaderboardEntry } from '@/hooks/useGamification';

interface PatientPWAProps {
  patientId?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  onUnlock?: (id: string) => void;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ achievement, onUnlock }) => {
  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRarityIcon = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return <Star className="h-4 w-4" />;
      case 'rare': return <Sparkles className="h-4 w-4" />;
      case 'epic': return <Crown className="h-4 w-4" />;
      case 'legendary': return <Trophy className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
      achievement.unlocked ? 'border-green-200 bg-green-50' : 'border-gray-200 opacity-75'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              achievement.unlocked ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <span className="text-2xl">{achievement.icon}</span>
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {achievement.title}
                {achievement.unlocked ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-400" />
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {achievement.description}
              </CardDescription>
            </div>
          </div>
          <Badge className={`${getRarityColor(achievement.rarity)} flex items-center gap-1`}>
            {getRarityIcon(achievement.rarity)}
            {achievement.rarity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="font-semibold text-yellow-600">{achievement.points} pontos</span>
          </div>
          {achievement.unlocked && achievement.unlockedAt && (
            <span className="text-xs text-gray-500">
              Desbloqueado em {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin?: (id: string) => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onJoin }) => {
  const getTypeColor = (type: Challenge['type']) => {
    switch (type) {
      case 'daily': return 'bg-blue-100 text-blue-800';
      case 'weekly': return 'bg-green-100 text-green-800';
      case 'monthly': return 'bg-purple-100 text-purple-800';
      case 'special': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const progressPercentage = (challenge.progress / challenge.target.value) * 100;
  const timeLeft = new Date(challenge.endDate).getTime() - new Date().getTime();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{challenge.title}</CardTitle>
              <CardDescription>{challenge.description}</CardDescription>
            </div>
          </div>
          <Badge className={getTypeColor(challenge.type)}>
            {challenge.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{challenge.progress}/{challenge.target.value}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-xs text-gray-500">
            {progressPercentage.toFixed(1)}% concluído
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Timer className="h-4 w-4 text-gray-500" />
              <span>{daysLeft > 0 ? `${daysLeft} dias restantes` : 'Expirado'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-gray-500" />
              <span>{challenge.participants} participantes</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gift className="h-4 w-4 text-yellow-500" />
            <span className="font-semibold text-yellow-600">{challenge.reward.points} pontos</span>
            {challenge.reward.badge && (
              <Badge variant="outline" className="text-xs">
                +Badge
              </Badge>
            )}
          </div>
          {challenge.status === 'active' && onJoin && (
            <Button size="sm" onClick={() => onJoin(challenge.id)}>
              Participar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  onClaim?: (id: string) => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, userPoints, onClaim }) => {
  const canClaim = userPoints >= reward.cost && reward.available && !reward.claimed;
  
  const getTypeIcon = (type: Reward['type']) => {
    switch (type) {
      case 'discount': return <TrendingUp className="h-5 w-5" />;
      case 'free_session': return <Calendar className="h-5 w-5" />;
      case 'merchandise': return <Gift className="h-5 w-5" />;
      case 'feature_unlock': return <Sparkles className="h-5 w-5" />;
      default: return <Gift className="h-5 w-5" />;
    }
  };

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg ${
      reward.claimed ? 'opacity-50 border-gray-200' : canClaim ? 'border-green-200' : 'border-gray-200'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${
            reward.claimed ? 'bg-gray-100' : canClaim ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {getTypeIcon(reward.type)}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {reward.title}
              {reward.claimed && <CheckCircle className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>{reward.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="font-semibold text-yellow-600">{reward.cost} pontos</span>
          </div>
          {!reward.claimed && onClaim && (
            <Button 
              size="sm" 
              disabled={!canClaim}
              onClick={() => onClaim(reward.id)}
              className={canClaim ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {canClaim ? 'Resgatar' : 'Pontos insuficientes'}
            </Button>
          )}
          {reward.claimed && (
            <Badge variant="outline" className="text-green-600">
              Resgatado
            </Badge>
          )}
        </div>
        {reward.expiresAt && (
          <div className="mt-2 text-xs text-gray-500">
            Expira em {new Date(reward.expiresAt).toLocaleDateString('pt-BR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ entry, isCurrentUser }) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-orange-500" />;
      default: return <span className="font-bold text-gray-600">#{rank}</span>;
    }
  };

  return (
    <Card className={`transition-all duration-300 hover:shadow-md ${
      isCurrentUser ? 'border-blue-200 bg-blue-50' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-10 h-10">
            {getRankIcon(entry.rank)}
          </div>
          
          <Avatar className="h-10 w-10">
            <AvatarImage src={entry.avatar} />
            <AvatarFallback>{entry.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold">{entry.userName}</h4>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">
                  Você
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Nível {entry.level}</span>
              <div className="flex items-center space-x-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>{entry.streak} dias</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-bold text-yellow-600">{entry.points.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PatientPWA: React.FC<PatientPWAProps> = ({ patientId }) => {
  const {
    achievements,
    challenges,
    userProgress,
    rewards,
    leaderboard,
    loading,
    error,
    unlockAchievement,
    joinChallenge,
    claimReward,
    addExerciseActivity,
    getUnlockedAchievements,
    getActiveChallenges,
    getAvailableRewards,
    getUserRank,
    getStats
  } = useGamification();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // PWA Installation
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = () => {
    // Lógica para instalar PWA
    setShowInstallPrompt(false);
  };

  const handleStartExercise = () => {
    // Simular início de exercício
    addExerciseActivity(15, 'Fortalecimento');
  };

  const stats = getStats();
  const unlockedAchievements = getUnlockedAchievements();
  const activeChallenges = getActiveChallenges();
  const availableRewards = getAvailableRewards();
  const userRank = getUserRank();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Carregando seu progresso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">FisioFlow PWA</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {showInstallPrompt && (
                <Button size="sm" onClick={handleInstallPWA}>
                  Instalar App
                </Button>
              )}
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">Usuário</p>
                  <p className="text-xs text-gray-500">Nível {userProgress.level}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
            <TabsTrigger value="challenges">Desafios</TabsTrigger>
            <TabsTrigger value="rewards">Recompensas</TabsTrigger>
            <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Nível Atual</p>
                      <p className="text-3xl font-bold">{userProgress.level}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-blue-200" />
                  </div>
                  <div className="mt-4">
                    <Progress 
                      value={(userProgress.currentXP / userProgress.xpToNextLevel) * 100} 
                      className="bg-blue-400" 
                    />
                    <p className="text-xs text-blue-100 mt-1">
                      {userProgress.currentXP}/{userProgress.xpToNextLevel} XP
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Sequência</p>
                      <p className="text-3xl font-bold">{userProgress.streak.current}</p>
                    </div>
                    <Flame className="h-8 w-8 text-green-200" />
                  </div>
                  <p className="text-xs text-green-100 mt-4">
                    Recorde: {userProgress.streak.longest} dias
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100">Pontos Totais</p>
                      <p className="text-3xl font-bold">{userProgress.totalPoints.toLocaleString()}</p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-200" />
                  </div>
                  <p className="text-xs text-yellow-100 mt-4">
                    Ranking: #{userRank}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Exercícios</p>
                      <p className="text-3xl font-bold">{userProgress.stats.totalExercises}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-200" />
                  </div>
                  <p className="text-xs text-purple-100 mt-4">
                    {userProgress.stats.totalMinutes} minutos totais
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={handleStartExercise}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Exercício
                  </Button>
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Ver Agenda
                  </Button>
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Meu Progresso
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Conquistas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unlockedAchievements.slice(-4).map((achievement) => (
                    <AchievementCard key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Todas as Conquistas
                </CardTitle>
                <CardDescription>
                  {unlockedAchievements.length} de {achievements.length} conquistas desbloqueadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <AchievementCard 
                      key={achievement.id} 
                      achievement={achievement}
                      onUnlock={unlockAchievement}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Desafios Ativos
                </CardTitle>
                <CardDescription>
                  Participe dos desafios e ganhe recompensas exclusivas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeChallenges.map((challenge) => (
                    <ChallengeCard 
                      key={challenge.id} 
                      challenge={challenge}
                      onJoin={joinChallenge}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Loja de Recompensas
                </CardTitle>
                <CardDescription>
                  Troque seus pontos por recompensas incríveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">Seus Pontos:</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">
                      {userProgress.totalPoints.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.map((reward) => (
                    <RewardCard 
                      key={reward.id} 
                      reward={reward}
                      userPoints={userProgress.totalPoints}
                      onClaim={claimReward}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Ranking Global
                </CardTitle>
                <CardDescription>
                  Veja como você se compara com outros pacientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {leaderboard.map((entry) => (
                      <LeaderboardCard 
                        key={entry.userId} 
                        entry={entry}
                        isCurrentUser={entry.userId === '3'}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};