import { useState } from 'react';
import {

  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy, Star, Flame, Target, Calendar, Plus, Minus,
  RefreshCw, History, Award, User
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { db, collection, doc, getDocs, query as firestoreQuery, where, orderBy, limit, getDoc } from '@/integrations/firebase/app';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GamificationProfile, XpTransaction, Achievement } from '@/types/gamification';
import { normalizeFirestoreData } from '@/utils/firestoreData';

/**
 * Achievement log entry with joined achievement details
 */
interface AchievementLogEntry {
  id: string;
  patient_id: string;
  achievement_id: string;
  unlocked_at: string;
  xp_reward: number;
  achievements?: Achievement;
}

interface PatientGamificationDetailsProps {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjustXp?: (params: { patientId: string; amount: number; reason: string }) => Promise<void>;
  onResetStreak?: (params: { patientId: string; patientName?: string }) => Promise<void>;
}

/**
 * PatientGamificationDetails Component
 * Slide-over panel showing detailed gamification info for a patient
 */
export const PatientGamificationDetails: React.FC<PatientGamificationDetailsProps> = ({
  patientId,
  open,
  onOpenChange,
  onAdjustXp,
  onResetStreak,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'achievements' | 'challenges'>('overview');
  const [xpAmount, setXpAmount] = useState(0);
  const [xpReason, setXpReason] = useState('');

  // Fetch patient profile
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['gamification-patient-detail', patientId],
    queryFn: async (): Promise<GamificationProfile | null> => {
      const profileRef = doc(db, 'patient_gamification', patientId);
      const docSnapshot = await getDoc(profileRef);

      if (docSnapshot.exists()) {
        return {
          id: docSnapshot.id,
          ...docSnapshot.data()
        } as GamificationProfile;
      }
      return null;
    },
    enabled: !!patientId && open,
  });

  // Fetch patient name
  const { data: patient } = useQuery({
    queryKey: ['patient-basic', patientId],
    queryFn: async () => {
      const patientRef = doc(db, 'patients', patientId);
      const docSnapshot = await getDoc(patientRef);

      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        return {
          full_name: data.full_name || '',
          email: data.email || ''
        };
      }
      return null;
    },
    enabled: !!patientId && open,
  });

  // Fetch transactions
  const { data: transactions } = useQuery<XpTransaction[]>({
    queryKey: ['gamification-transactions', patientId],
    queryFn: async () => {
      const transactionsRef = collection(db, 'xp_transactions');
      const q = firestoreQuery(
        transactionsRef,
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc'),
        limit(50)
      );
      const querySnapshot = await getDocs(q);

      const transactions: XpTransaction[] = [];
      querySnapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...normalizeFirestoreData(doc.data())
        } as XpTransaction);
      });

      return transactions;
    },
    enabled: !!patientId && open && activeTab === 'history',
  });

  // Fetch achievements
  const { data: achievements } = useQuery<AchievementLogEntry[]>({
    queryKey: ['gamification-achievements', patientId],
    queryFn: async () => {
      const achievementsLogRef = collection(db, 'achievements_log');
      const q = firestoreQuery(
        achievementsLogRef,
        where('patient_id', '==', patientId),
        orderBy('unlocked_at', 'desc'),
        limit(20)
      );
      const querySnapshot = await getDocs(q);

      const achievements: AchievementLogEntry[] = [];
      for (const docSnapshot of querySnapshot.docs) {
        const logData = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        } as AchievementLogEntry;

        // Fetch achievement details
        if (logData.achievement_id) {
          const achievementRef = doc(db, 'achievements', logData.achievement_id);
          const achievementSnap = await getDoc(achievementRef);
          if (achievementSnap.exists()) {
            logData.achievements = achievementSnap.data() as Achievement;
          }
        }

        achievements.push(logData);
      }

      return achievements;
    },
    enabled: !!patientId && open && activeTab === 'achievements',
  });

  // Calculate progress to next level
  const progressToNextLevel = profile ? (profile.current_xp / 1000) * 100 : 0;

  const handleAdjustXp = async () => {
    if (!onAdjustXp) return;
    if (xpAmount === 0) {
      toast({
        title: 'Valor inválido',
        description: 'Digite um valor diferente de zero',
        variant: 'destructive',
      });
      return;
    }
    if (!xpReason.trim()) {
      toast({
        title: 'Justificativa necessária',
        description: 'Informe o motivo do ajuste',
        variant: 'destructive',
      });
      return;
    }

    await onAdjustXp({
      patientId,
      amount: xpAmount,
      reason: xpReason,
    });

    setXpAmount(0);
    setXpReason('');
    refetchProfile();
  };

  const handleResetStreak = async () => {
    if (!onResetStreak) return;

    await onResetStreak({
      patientId,
      patientName: patient?.full_name,
    });

    refetchProfile();
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg sm:max-w-xl overflow-hidden">
        <SheetHeader className="px-6">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalhes de Gamificação
          </SheetTitle>
          <SheetDescription>
            {patient?.full_name || 'Carregando...'}
          </SheetDescription>
        </SheetHeader>

        {profileLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !profile ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Perfil não encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Este paciente ainda não possui um perfil de gamificação
            </p>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)} className="px-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
                <TabsTrigger value="achievements">Conquistas</TabsTrigger>
                <TabsTrigger value="challenges">Desafios</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                <ScrollArea className="px-1">
                  {/* Header Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Nível</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <div className="text-4xl font-black text-primary mb-1">{profile.level}</div>
                          <Progress value={progressToNextLevel} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-2">
                            {profile.current_xp} / 1000 XP
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Streak</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <div className="text-4xl font-black text-orange-500 mb-1 flex items-center justify-center gap-2">
                            <Flame className="h-6 w-6" />
                            {profile.current_streak}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Recorde: {profile.longest_streak} dias
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Total Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          XP Total
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-black">{profile.total_points?.toLocaleString() || 0}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          Última Atividade
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">
                          {profile.last_activity_date
                            ? differenceInDays(new Date(), new Date(profile.last_activity_date)) === 0
                              ? 'Hoje'
                              : `${differenceInDays(new Date(), new Date(profile.last_activity_date))} dias atrás`
                            : 'Nunca'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Manual XP Adjustment */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Ajuste Manual de XP</CardTitle>
                      <CardDescription>
                        Adicione ou remova XP manualmente (requer justificativa)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setXpAmount(Math.abs(xpAmount) * -1)}
                          className={xpAmount < 0 ? 'bg-destructive text-destructive-foreground hover:bg-destructive' : ''}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={Math.abs(xpAmount)}
                          onChange={(e) => setXpAmount(Number(e.target.value))}
                          className="flex-1 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setXpAmount(Math.abs(xpAmount))}
                          className={xpAmount > 0 ? 'bg-green-600 text-white hover:bg-green-700' : ''}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div>
                        <Label htmlFor="reason" className="sr-only">Motivo</Label>
                        <Input
                          id="reason"
                          placeholder="Motivo do ajuste (ex: Bônus por conquista)"
                          value={xpReason}
                          onChange={(e) => setXpReason(e.target.value)}
                        />
                      </div>

                      <Button
                        onClick={handleAdjustXp}
                        disabled={xpAmount === 0 || !xpReason.trim()}
                        className="w-full"
                        size="sm"
                      >
                        Aplicar Ajuste
                      </Button>
                    </CardContent>
                  </Card>
                </ScrollArea>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-6">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {!transactions || transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Sem histórico</h3>
                      <p className="text-sm text-muted-foreground">
                        Este paciente ainda não possui transações de XP
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {tx.reason === 'manual_adjustment' ? 'Ajuste Manual' :
                                  tx.reason === 'session_completed' ? 'Sessão' :
                                    tx.reason === 'daily_quest' ? 'Missão' :
                                      tx.reason === 'achievement_unlocked' ? 'Conquista' :
                                        tx.reason}
                              </Badge>
                            </TableCell>
                            <TableCell className={tx.amount > 0 ? 'text-green-600' : tx.amount < 0 ? 'text-red-600' : ''}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {tx.description || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Achievements Tab */}
              <TabsContent value="achievements" className="mt-6">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {!achievements || achievements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <Award className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Sem conquistas</h3>
                      <p className="text-sm text-muted-foreground">
                        Este paciente ainda não desbloqueou nenhuma conquista
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 p-1">
                      {achievements.map((entry) => (
                        <Card key={entry.id} className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-yellow-500/20">
                                <Award className="h-5 w-5 text-yellow-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-yellow-900">
                                  {(entry.achievements as { title?: string; description?: string })?.title || 'Conquista'}
                                </p>
                                <p className="text-xs text-yellow-700 mt-1 line-clamp-2">
                                  {(entry.achievements as { title?: string; description?: string })?.description || ''}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className="bg-yellow-500 text-white text-xs">
                                    +{entry.xp_reward} XP
                                  </Badge>
                                  <span className="text-xs text-yellow-600">
                                    {format(new Date(entry.unlocked_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Challenges Tab */}
              <TabsContent value="challenges" className="mt-6">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Em breve</h3>
                    <p className="text-sm text-muted-foreground">
                      O progresso em desafios será exibido aqui em breve
                    </p>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Footer with Actions */}
            <SheetFooter className="px-6 pb-6">
              <Button
                variant="destructive"
                onClick={handleResetStreak}
                className="gap-2"
                disabled={profile.current_streak === 0}
              >
                <RefreshCw className="h-4 w-4" />
                Resetar Streak
              </Button>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PatientGamificationDetails;