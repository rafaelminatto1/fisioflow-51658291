/**
 * Referral Program (MGM - Member Get Member) Page
 *
 * Manage patient referral codes and rewards
 */

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Gift,
  TrendingUp,
  Award,
  CheckCircle2,
  UserPlus,
  Percent,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createReferralCode,
  redeemReferralCode,
  generateReferralCode,
} from '@/services/marketing/marketingService';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalRedemptions: number;
  pendingRewards: number;
}

export default function ReferralPage() {
  const [searchCode, setSearchCode] = useState('');
  const [redemptionResult, setRedemptionResult] = useState<{
    success: boolean;
    reward?: string;
    error?: string;
  } | null>(null);
  const [newPatientId, setNewPatientId] = useState('');
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalRedemptions: 0,
    pendingRewards: 0,
  });
  const [createMode, setCreateMode] = useState(false);
  const [newCodeConfig, setNewCodeConfig] = useState({
    reward_type: 'discount' as 'discount' | 'session' | 'product',
    reward_value: 10,
    referrer_reward_type: 'discount' as 'discount' | 'session',
    referrer_reward_value: 5,
    max_uses: 50,
    expires_at: '',
  });

  // Load referral stats
  useEffect(() => {
    loadReferralStats();
  }, []);

  const loadReferralStats = async () => {
    try {
      const codesQuery = query(collection(db, 'referral_codes'));
      const snapshot = await getDocs(codesQuery);

      const redemptionsQuery = query(collection(db, 'referral_redemptions'));
      const redemptionsSnapshot = await getDocs(redemptionsQuery);

      setReferralStats({
        totalReferrals: snapshot.size,
        activeReferrals: snapshot.docs.filter(
          (d) => d.data().uses < (d.data().max_uses || Infinity)
        ).length,
        totalRedemptions: redemptionsSnapshot.size,
        pendingRewards: 0, // Calculate based on business logic
      });
    } catch (error) {
      console.error('Error loading referral stats:', error);
    }
  };

  const handleCreateCode = async (patientId: string) => {
    try {
      const _codeId = await createReferralCode(
        patientId,
        'default-org', // Replace with actual org ID
        newCodeConfig
      );
      toast.success('Código de indicação criado com sucesso');
      setCreateMode(false);
      loadReferralStats();
    } catch (_error) {
      toast.error('Erro ao criar código de indicação');
    }
  };

  const handleRedeemCode = async () => {
    if (!searchCode || !newPatientId) {
      toast.error('Preencha o código e o ID do paciente');
      return;
    }

    const result = await redeemReferralCode(searchCode, newPatientId);
    setRedemptionResult(result);

    if (result.success) {
      toast.success(`Código resgatado! ${result.reward}`);
      loadReferralStats();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const _shareCode = (code: string) => {
    const text = `Use meu código de indicação ${code} para ganhar desconto na FisioFlow!`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      copyToClipboard(text);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Programa de Indicação
          </h1>
          <p className="text-muted-foreground mt-1">
            Indique amigos e ganhe benefícios - MGM (Member Get Member)
          </p>
        </div>
        <Button onClick={() => setCreateMode(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
            Criar Novo Código
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Códigos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.totalReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Códigos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {referralStats.activeReferrals}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Resgates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.totalRedemptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralStats.totalReferrals > 0
                ? ((referralStats.totalRedemptions / referralStats.totalReferrals) * 100).toFixed(1)
                : '0'}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create/Manage Codes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {createMode ? 'Criar Novo Código' : 'Gerenciar Códigos'}
            </CardTitle>
            <CardDescription>
              {createMode
                ? 'Configure o código de indicação para um paciente'
                : 'Crie e gerencie códigos de indicação'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {createMode ? (
              <>
                <div className="space-y-2">
                  <Label>ID do Paciente</Label>
                  <Input
                    placeholder="ID do paciente que irá indicar"
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Recompensa</Label>
                    <Select
                      value={newCodeConfig.reward_type}
                      onValueChange={(value: unknown) =>
                        setNewCodeConfig({ ...newCodeConfig, reward_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount">Desconto (%)</SelectItem>
                        <SelectItem value="session">Sessões Grátis</SelectItem>
                        <SelectItem value="product">Produto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor da Recompensa</Label>
                    <Input
                      type="number"
                      value={newCodeConfig.reward_value}
                      onChange={(e) =>
                        setNewCodeConfig({
                          ...newCodeConfig,
                          reward_value: parseInt(e.target.value) || 0,
                        })
                      }
                      min={1}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-sm font-semibold mb-3 block">
                    Recompensa para Quem Indica
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={newCodeConfig.referrer_reward_type}
                        onValueChange={(value: unknown) =>
                          setNewCodeConfig({ ...newCodeConfig, referrer_reward_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discount">Desconto (%)</SelectItem>
                          <SelectItem value="session">Sessões Grátis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Valor</Label>
                      <Input
                        type="number"
                        value={newCodeConfig.referrer_reward_value}
                        onChange={(e) =>
                          setNewCodeConfig({
                            ...newCodeConfig,
                            referrer_reward_value: parseInt(e.target.value) || 0,
                          })
                        }
                        min={1}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Máximo de Usos</Label>
                    <Input
                      type="number"
                      value={newCodeConfig.max_uses}
                      onChange={(e) =>
                        setNewCodeConfig({
                          ...newCodeConfig,
                          max_uses: parseInt(e.target.value) || 50,
                        })
                      }
                      min={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expira em</Label>
                    <Input
                      type="date"
                      value={newCodeConfig.expires_at}
                      onChange={(e) =>
                        setNewCodeConfig({ ...newCodeConfig, expires_at: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCreateMode(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => newPatientId && handleCreateCode(newPatientId)}
                    disabled={!newPatientId}
                  >
                    Criar Código
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <p className="font-medium">Gerencie códigos por paciente</p>
                  <p className="text-sm text-muted-foreground">
                    Crie códigos personalizados para cada paciente
                  </p>
                </div>
                <Button onClick={() => setCreateMode(true)}>
                  Criar Novo Código
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Redeem Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Resgatar Código
            </CardTitle>
            <CardDescription>
              Resgate um código de indicação para um novo paciente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Código de Indicação</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: FISIOA123"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  className="uppercase font-mono"
                />
                <Button variant="outline" onClick={() => setSearchCode(generateReferralCode('temp'))}>
                  Gerar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ID do Novo Paciente</Label>
              <Input
                placeholder="ID do paciente que está sendo cadastrado"
                value={newPatientId}
                onChange={(e) => setNewPatientId(e.target.value)}
              />
            </div>

            <Button
              onClick={handleRedeemCode}
              disabled={!searchCode || !newPatientId}
              className="w-full"
            >
              Resgatar Código
            </Button>

            {redemptionResult && (
              <div
                className={cn(
                  'p-4 rounded-lg',
                  redemptionResult.success
                    ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
                    : 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800'
                )}
              >
                <div className="flex items-center gap-2">
                  {redemptionResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-red-600 flex items-center justify-center">
                      <span className="text-white text-xs">✕</span>
                    </div>
                  )}
                  <div>
                    <p
                      className={cn(
                        'font-medium',
                        redemptionResult.success
                          ? 'text-emerald-900 dark:text-emerald-100'
                          : 'text-red-900 dark:text-red-100'
                      )}
                    >
                      {redemptionResult.success
                        ? 'Código Resgatado!'
                        : 'Erro ao Resgatar'}
                    </p>
                    <p
                      className={cn(
                        'text-sm',
                        redemptionResult.success
                          ? 'text-emerald-800 dark:text-emerald-200'
                          : 'text-red-800 dark:text-red-200'
                      )}
                    >
                      {redemptionResult.reward || redemptionResult.error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rewards Information */}
      <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
            <Gift className="h-5 w-5" />
            Como Funciona o Programa de Indicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">
                  O paciente recebe um código único
                </p>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  Cada paciente tem um código personalizado para compartilhar
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">
                  Amigo usa o código no cadastro
                </p>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  O novo paciente insere o código para ganhar benefício
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">
                  Ambos ganham recompensas
                </p>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  Quem indicou e quem foi indicado recebem benefícios
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-purple-900 dark:text-purple-100">
                Desconto no tratamento
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-purple-900 dark:text-purple-100">
                Sessões bonificadas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-purple-900 dark:text-purple-100">
                Produtos exclusivos
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </MainLayout>
  );
}

import { cn } from '@/lib/utils';
