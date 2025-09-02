import { useState, useRef } from 'react';
import { Upload, User, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarUpdate?: (avatarUrl: string) => void;
}

export function AvatarUpload({ currentAvatar, onAvatarUpdate }: AvatarUploadProps) {
  const { user, updateProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Validar tipo e tamanho do arquivo
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB
        throw new Error('Arquivo muito grande. Máximo 5MB.');
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Remover arquivo anterior se existir
      if (currentAvatar) {
        const oldPath = currentAvatar.split('/').pop();
        if (oldPath && oldPath !== fileName) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload do novo arquivo
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Atualizar perfil com nova URL
      await updateProfile({
        avatar_url: publicUrl
      });

      setPreviewUrl(publicUrl);
      onAvatarUpdate?.(publicUrl);

      toast({
        title: "Avatar atualizado!",
        description: "Sua foto de perfil foi alterada com sucesso."
      });

    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Mostrar preview local
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Upload do arquivo
      uploadAvatar(file);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploading(true);

      if (!user || !currentAvatar) return;

      // Remover arquivo do storage
      const fileName = currentAvatar.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${fileName}`]);
      }

      // Atualizar perfil
      await updateProfile({
        avatar_url: null
      });

      setPreviewUrl(null);
      onAvatarUpdate?.('');

      toast({
        title: "Avatar removido",
        description: "Sua foto de perfil foi removida."
      });

    } catch (error: any) {
      console.error('Erro ao remover avatar:', error);
      toast({
        title: "Erro ao remover avatar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="w-24 h-24">
          <AvatarImage src={previewUrl || ''} alt="Avatar" />
          <AvatarFallback className="text-lg">
            <User className="w-8 h-8" />
          </AvatarFallback>
        </Avatar>

        {previewUrl && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
            onClick={removeAvatar}
            disabled={uploading}
          >
            <X className="w-3 h-3" />
          </Button>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center space-y-2">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {previewUrl ? 'Alterar foto' : 'Adicionar foto'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          JPEG, PNG ou WebP. Máximo 5MB.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}