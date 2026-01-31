import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, collection, doc, getDocs, query, orderBy, updateDoc, writeBatch, QueryDocumentSnapshot } from '@/integrations/firebase/app';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type GamificationSettingValue = string | number | boolean;

type GamificationSetting = {
    key: string;
    value: GamificationSettingValue;
    description: string;
};

export default function GamificationSettings() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [changedSettings, setChangedSettings] = useState<Record<string, GamificationSettingValue>>({});

    const { data: settings, isLoading } = useQuery({
        queryKey: ['gamification-settings'],
        queryFn: async () => {
            const settingsRef = collection(db, 'gamification_settings');
            const q = query(settingsRef, orderBy('key'));
            const querySnapshot = await getDocs(q);

            const settings: GamificationSetting[] = [];
            querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
                settings.push({
                    key: doc.id,
                    ...doc.data()
                } as GamificationSetting);
            });

            return settings;
        }
    });

    const updateSettings = useMutation({
        mutationFn: async (updatedItems: Record<string, GamificationSettingValue>) => {
            const batch = writeBatch(db);

            Object.entries(updatedItems).forEach(([key, value]) => {
                const settingRef = doc(db, 'gamification_settings', key);
                batch.update(settingRef, {
                    value,
                    updated_at: new Date().toISOString()
                });
            });

            await batch.commit();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gamification-settings'] });
            setChangedSettings({});
            toast({
                title: "Sucesso",
                description: "Configurações atualizadas com sucesso!",
            });
        },
        onError: (error) => {
            toast({
                title: "Erro",
                description: "Falha ao atualizar configurações: " + error.message,
                variant: "destructive"
            });
        }
    });

    const handleInputChange = (key: string, value: string) => {
        setChangedSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = () => {
        if (Object.keys(changedSettings).length === 0) return;
        updateSettings.mutate(changedSettings);
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configurações Globais</CardTitle>
                <CardDescription>Ajuste os parâmetros do sistema de gamificação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    {settings?.map((setting) => (
                        <div key={setting.key} className="grid gap-2">
                            <Label htmlFor={setting.key} className="flex items-center justify-between">
                                <span>{setting.description}</span>
                                <span className="text-xs font-mono text-muted-foreground">{setting.key}</span>
                            </Label>
                            <Input
                                id={setting.key}
                                defaultValue={changedSettings[setting.key] ?? setting.value}
                                onChange={(e) => handleInputChange(setting.key, e.target.value)}
                                className="max-w-md"
                            />
                        </div>
                    ))}
                </div>

                <Separator />

                <div className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={Object.keys(changedSettings).length === 0 || updateSettings.isPending}
                    >
                        {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
