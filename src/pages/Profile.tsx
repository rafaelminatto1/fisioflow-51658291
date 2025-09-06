import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, User, Bell, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProfileUpdateFormData, profileUpdateSchema, newPasswordSchema, NewPasswordFormData } from '@/lib/validations/auth';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export function Profile() {
  const { user, profile, updateProfile, updatePassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const profileForm = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      bio: profile?.bio || '',
      birth_date: profile?.birth_date || '',
      address: profile?.address || '',
      crefito: profile?.crefito || '',
      specialties: profile?.specialties || [],
      experience_years: profile?.experience_years || 0,
      consultation_fee: profile?.consultation_fee || 0,
      notification_preferences: profile?.notification_preferences || {
        email: true,
        sms: false,
        push: true
      }
    }
  });

  const passwordForm = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema)
  });

  const onProfileSubmit = async (data: ProfileUpdateFormData) => {
    setIsSaving(true);
    await updateProfile(data);
    setIsSaving(false);
  };

  const onPasswordSubmit = async (data: NewPasswordFormData) => {
    setIsSaving(true);
    const { error } = await updatePassword(data.password);
    
    if (!error) {
      passwordForm.reset();
    }
    
    setIsSaving(false);
  };

  if (!profile) {
    return <div>Carregando...</div>;
  }

  const isProfessional = ['fisioterapeuta', 'estagiario'].includes(profile.role);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e configurações
          </p>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">
              <User className="w-4 h-4 mr-2" />
              Pessoais
            </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="professional" disabled={!isProfessional}>
            Profissional
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
              <CardDescription>
                Sua foto será exibida para outros usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvatarUpload 
                currentAvatar={profile.avatar_url || ''}
                onAvatarUpdate={(url) => {
                  console.log('Avatar updated:', url);
                  // Atualização já é feita internamente no componente
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome completo</Label>
                    <Input
                      id="full_name"
                      {...profileForm.register('full_name')}
                      className={profileForm.formState.errors.full_name ? 'border-destructive' : ''}
                    />
                    {profileForm.formState.errors.full_name && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.full_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="(11) 99999-9999"
                      {...profileForm.register('phone')}
                      className={profileForm.formState.errors.phone ? 'border-destructive' : ''}
                    />
                    {profileForm.formState.errors.phone && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de nascimento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      {...profileForm.register('birth_date')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Para alterar o email, entre em contato conosco
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    {...profileForm.register('address')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Sobre você</Label>
                  <Textarea
                    id="bio"
                    placeholder="Conte um pouco sobre você..."
                    rows={3}
                    {...profileForm.register('bio')}
                    className={profileForm.formState.errors.bio ? 'border-destructive' : ''}
                  />
                  {profileForm.formState.errors.bio && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.bio.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full md:w-auto"
                >
                  {isSaving ? 'Salvando...' : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar alterações
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como você quer receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações importantes por email
                  </p>
                </div>
                <Switch
                  checked={profileForm.watch('notification_preferences.email')}
                  onCheckedChange={(checked) =>
                    profileForm.setValue('notification_preferences.email', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber lembretes por SMS
                  </p>
                </div>
                <Switch
                  checked={profileForm.watch('notification_preferences.sms')}
                  onCheckedChange={(checked) =>
                    profileForm.setValue('notification_preferences.sms', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações push</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações no navegador
                  </p>
                </div>
                <Switch
                  checked={profileForm.watch('notification_preferences.push')}
                  onCheckedChange={(checked) =>
                    profileForm.setValue('notification_preferences.push', checked)
                  }
                />
              </div>

              <Button
                onClick={profileForm.handleSubmit(onProfileSubmit)}
                disabled={isSaving}
                className="w-full md:w-auto"
              >
                {isSaving ? 'Salvando...' : 'Salvar preferências'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...passwordForm.register('password')}
                      className={passwordForm.formState.errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...passwordForm.register('confirmPassword')}
                      className={passwordForm.formState.errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full md:w-auto"
                >
                  {isSaving ? 'Atualizando...' : 'Atualizar senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {isProfessional && (
          <TabsContent value="professional" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Profissionais</CardTitle>
                <CardDescription>
                  Dados específicos da sua atuação profissional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="crefito">CREFITO</Label>
                      <Input
                        id="crefito"
                        placeholder="CREFITO1-123456-F"
                        {...profileForm.register('crefito')}
                        className={profileForm.formState.errors.crefito ? 'border-destructive' : ''}
                      />
                      {profileForm.formState.errors.crefito && (
                        <p className="text-sm text-destructive">
                          {profileForm.formState.errors.crefito.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience_years">Anos de experiência</Label>
                      <Input
                        id="experience_years"
                        type="number"
                        min="0"
                        max="50"
                        {...profileForm.register('experience_years', { valueAsNumber: true })}
                        className={profileForm.formState.errors.experience_years ? 'border-destructive' : ''}
                      />
                      {profileForm.formState.errors.experience_years && (
                        <p className="text-sm text-destructive">
                          {profileForm.formState.errors.experience_years.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consultation_fee">Valor da consulta (R$)</Label>
                    <Input
                      id="consultation_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="150.00"
                      {...profileForm.register('consultation_fee', { valueAsNumber: true })}
                      className={profileForm.formState.errors.consultation_fee ? 'border-destructive' : ''}
                    />
                    {profileForm.formState.errors.consultation_fee && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.consultation_fee.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full md:w-auto"
                  >
                    {isSaving ? 'Salvando...' : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar informações profissionais
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      </div>
    </MainLayout>
  );
}