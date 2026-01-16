import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type GamificationSetting = {
    key: string;
    value: any;
    description: string;
};

export default function GamificationSettings() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [changedSettings, setChangedSettings] = useState<Record<string, any>>({});

    const { data: settings, isLoading } = useQuery({
        queryKey: ['gamification-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gamification_settings')
                .select('*')
                .order('key');

            if (error) throw error;
            return data as GamificationSetting[];
        }
    });

    const updateSettings = useMutation({
        mutationFn: async (updatedItems: Record<string, any>) => {
            const promises = Object.entries(updatedItems).map(([key, value]) =>
                supabase
                    .from('gamification_settings')
                    .update({ value, updated_at: new Date().toISOString() })
                    .eq('key', key)
            );

            await Promise.all(promises);
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
