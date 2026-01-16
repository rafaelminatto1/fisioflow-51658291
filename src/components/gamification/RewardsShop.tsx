import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Gift, Loader2, ShoppingBag, Check, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Reward {
    id: string;
    title: string;
    description: string | null;
    point_cost: number;
    icon: string | null;
    category: string | null;
    stock: number | null;
    image_url: string | null;
}

interface RewardsShopProps {
    patientId: string;
    currentPoints: number;
    onPointsUpdate?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    physical: 'bg-blue-100 text-blue-700',
    digital: 'bg-purple-100 text-purple-700',
    discount: 'bg-green-100 text-green-700',
    experience: 'bg-orange-100 text-orange-700',
    general: 'bg-gray-100 text-gray-700',
};

const CATEGORY_LABELS: Record<string, string> = {
    physical: 'Físico',
    digital: 'Digital',
    discount: 'Desconto',
    experience: 'Experiência',
    general: 'Geral',
};

export default function RewardsShop({ patientId, currentPoints, onPointsUpdate }: RewardsShopProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const { data: rewards = [], isLoading } = useQuery({
        queryKey: ['patient-rewards'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('rewards')
                .select('*')
                .eq('is_active', true)
                .order('point_cost', { ascending: true });

            if (error) throw error;
            return data as Reward[];
        }
    });

    const { data: redemptions = [] } = useQuery({
        queryKey: ['patient-redemptions', patientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reward_redemptions')
                .select('reward_id, claimed_at')
                .eq('patient_id', patientId)
                .order('claimed_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!patientId
    });

    const redeemReward = useMutation({
        mutationFn: async (reward: Reward) => {
            // 1. Insert redemption record
            const { error: redeemError } = await supabase
                .from('reward_redemptions')
                .insert({
                    patient_id: patientId,
                    reward_id: reward.id,
                    points_spent: reward.point_cost,
                    status: 'claimed'
                });

            if (redeemError) throw redeemError;

            // 2. Deduct points from patient_gamification
            const { error: updateError } = await supabase
                .from('patient_gamification')
                .update({
                    total_points: currentPoints - reward.point_cost,
                    updated_at: new Date().toISOString()
                })
                .eq('patient_id', patientId);

            if (updateError) throw updateError;

            // 3. Decrease stock if applicable
            if (reward.stock !== null) {
                await supabase
                    .from('rewards')
                    .update({ stock: reward.stock - 1 })
                    .eq('id', reward.id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patient-rewards'] });
            queryClient.invalidateQueries({ queryKey: ['patient-redemptions', patientId] });
            queryClient.invalidateQueries({ queryKey: ['gamification-profile', patientId] });
            onPointsUpdate?.();
            setIsConfirmOpen(false);
            setSelectedReward(null);
            toast({
                title: "🎁 Recompensa Resgatada!",
                description: "Parabéns! Você resgatou sua recompensa com sucesso.",
                className: "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none"
            });
        },
        onError: (error) => {
            toast({
                title: "Erro",
                description: "Não foi possível resgatar: " + error.message,
                variant: "destructive"
            });
        }
    });

    const handleRedeemClick = (reward: Reward) => {
        setSelectedReward(reward);
        setIsConfirmOpen(true);
    };

    const confirmRedeem = () => {
        if (selectedReward) {
            redeemReward.mutate(selectedReward);
        }
    };

    const canAfford = (cost: number) => currentPoints >= cost;
    const isOutOfStock = (stock: number | null) => stock !== null && stock <= 0;

    return (
        <>
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50">
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-purple-500" />
                            Loja de Recompensas
                        </span>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            {currentPoints} pontos
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        </div>
                    ) : rewards.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            Nenhuma recompensa disponível no momento.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <AnimatePresence>
                                {rewards.map((reward, index) => {
                                    const affordable = canAfford(reward.point_cost);
                                    const outOfStock = isOutOfStock(reward.stock);
                                    const wasRedeemed = redemptions.some(r => r.reward_id === reward.id);

                                    return (
                                        <motion.div
                                            key={reward.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`
                                                relative p-4 rounded-xl border transition-all
                                                ${affordable && !outOfStock ? 'bg-white hover:shadow-md hover:border-purple-200 cursor-pointer' : 'bg-muted/30 opacity-60'}
                                            `}
                                            onClick={() => affordable && !outOfStock && handleRedeemClick(reward)}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`
                                                    h-12 w-12 rounded-xl flex items-center justify-center shrink-0
                                                    ${affordable ? 'bg-purple-100 text-purple-600' : 'bg-muted text-muted-foreground'}
                                                `}>
                                                    <Gift className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="font-semibold text-sm truncate">{reward.title}</h4>
                                                        {wasRedeemed && (
                                                            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200 shrink-0">
                                                                <Check className="h-3 w-3 mr-1" />
                                                                Resgatado
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{reward.description}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Badge className={CATEGORY_COLORS[reward.category || 'general'] + ' text-[10px]'}>
                                                            {CATEGORY_LABELS[reward.category || 'general']}
                                                        </Badge>
                                                        <span className={`text-xs font-bold ${affordable ? 'text-purple-600' : 'text-muted-foreground'}`}>
                                                            {reward.point_cost} pts
                                                        </span>
                                                        {reward.stock !== null && (
                                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                <Package className="h-3 w-3" />
                                                                {reward.stock} restantes
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {outOfStock && (
                                                <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
                                                    <Badge variant="destructive">Esgotado</Badge>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-purple-500" />
                            Confirmar Resgate
                        </DialogTitle>
                        <DialogDescription>
                            Você está prestes a resgatar <strong>{selectedReward?.title}</strong> por <strong>{selectedReward?.point_cost} pontos</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm">Seus pontos atuais:</span>
                            <span className="font-bold">{currentPoints}</span>
                        </div>
                        <div className="flex justify-between items-center p-3">
                            <span className="text-sm">Custo da recompensa:</span>
                            <span className="font-bold text-destructive">-{selectedReward?.point_cost}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <span className="text-sm font-medium">Saldo após resgate:</span>
                            <span className="font-bold text-purple-600">{currentPoints - (selectedReward?.point_cost || 0)}</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={confirmRedeem}
                            disabled={redeemReward.isPending}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                            {redeemReward.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Resgate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
