import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Contrast, ZapOff, Type, Info } from 'lucide-react';

export function AccessibilityTab({ settings, setSettings }: any) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Contrast className="h-5 w-5" /> Acessibilidade Visual</CardTitle>
          <CardDescription>Personalize a aparência do sistema para suas necessidades</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Modo Alto Contraste</Label>
              <p className="text-sm text-muted-foreground">Melhora a legibilidade das cores</p>
            </div>
            <Switch checked={settings.highContrast} onCheckedChange={(v) => setSettings({ ...settings, highContrast: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><ZapOff className="h-4 w-4" /> Movimento Reduzido</Label>
              <p className="text-sm text-muted-foreground">Desabilita animações e transições</p>
            </div>
            <Switch checked={settings.reducedMotion} onCheckedChange={(v) => setSettings({ ...settings, reducedMotion: v })} />
          </div>
          <Separator />
          <div className="space-y-3">
            <Label className="flex items-center gap-2"><Type className="h-4 w-4" /> Tamanho da Fonte</Label>
            <div className="grid grid-cols-3 gap-2">
              {['small', 'medium', 'large'].map((size) => (
                <Button key={size} variant={settings.fontSize === size ? 'default' : 'outline'} size="sm" onClick={() => setSettings({ ...settings, fontSize: size })}>
                  {size === 'small' ? 'Pequeno' : size === 'medium' ? 'Médio' : 'Grande'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Informações</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Navegação por Teclado</p>
              <p className="text-muted-foreground">Use Tab para navegar, Shift+Tab para voltar e Enter para selecionar.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
