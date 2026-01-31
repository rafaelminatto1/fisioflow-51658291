import { MainLayout } from '@/components/layout/MainLayout';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, writeBatch } from '@/integrations/firebase/app';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/firebase/app';

import { useAuth } from '@/contexts/AuthContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { PreCadastroStats } from '@/components/precadastro/PreCadastroStats';
import { PreCadastroList } from '@/components/precadastro/PreCadastroList';
import { LinkManagement } from '@/components/precadastro/LinkManagement';

interface NewTokenData {
  nome?: string;
  descricao?: string;
  max_usos?: string | number;
  validade_dias: string | number;
  campos_obrigatorios: string[];
  campos_opcionais: string[];
}

const PreCadastroAdmin = () => {
  const { user } = useAuth();
  const { currentOrganization: orgData } = useOrganizations();
  const queryClient = useQueryClient();

  // Fetch tokens
  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ['precadastro-tokens'],
    queryFn: async () => {
      const q = query(collection(db, 'precadastro_tokens'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  // Fetch precadastros
  const { data: precadastros, isLoading: precadastrosLoading } = useQuery({
    queryKey: ['precadastros'],
    queryFn: async () => {
      const q = query(collection(db, 'precadastros'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  // Create token mutation
  const createToken = useMutation({
    mutationFn: async (newToken: NewTokenData) => {
      if (!user?.uid) throw new Error('Usuário não autenticado');

      const organizationId = orgData?.id;

      const tokenData = {
        organization_id: organizationId,
        nome: newToken.nome || 'Link de Pré-cadastro',
        descricao: newToken.descricao,
        max_usos: newToken.max_usos ? parseInt(newToken.max_usos) : null,
        expires_at: new Date(Date.now() + newToken.validade_dias * 24 * 60 * 60 * 1000).toISOString(),
        campos_obrigatorios: newToken.campos_obrigatorios,
        campos_opcionais: newToken.campos_opcionais,
        created_at: new Date().toISOString(),
        ativo: true,
        usage_count: 0
      };

      const docRef = await addDoc(collection(db, 'precadastro_tokens'), tokenData);
      return { id: docRef.id, ...tokenData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastro-tokens'] });
      toast.success('Link criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar link');
    }
  });

  // Toggle token status
  const toggleToken = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const tokenRef = doc(db, 'precadastro_tokens', id);
      await updateDoc(tokenRef, { ativo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastro-tokens'] });
      toast.success('Status atualizado');
    }
  });

  // Update precadastro status
  const updatePrecadastro = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const precadastroRef = doc(db, 'precadastros', id);
      await updateDoc(precadastroRef, {
        status,
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastros'] });
      toast.success('Status atualizado');
    }
  });

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6 bg-background/50 min-h-screen">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Pré-cadastro de Pacientes</h1>
          <p className="text-muted-foreground">
            Gerencie links de captação e visualize os dados dos pacientes interessados.
          </p>
        </div>

        <PreCadastroStats
          tokens={tokens || []}
          precadastros={precadastros || []}
        />

        <Tabs defaultValue="precadastros" className="space-y-4">
          <TabsList className="bg-background border">
            <TabsTrigger value="precadastros">Pré-cadastros Recebidos</TabsTrigger>
            <TabsTrigger value="links">Gerenciar Links</TabsTrigger>
          </TabsList>

          <TabsContent value="precadastros" className="space-y-4">
            <PreCadastroList
              precadastros={precadastros || []}
              isLoading={precadastrosLoading}
              onUpdateStatus={(id, status) => updatePrecadastro.mutate({ id, status })}
            />
          </TabsContent>

          <TabsContent value="links" className="space-y-4">
            <LinkManagement
              tokens={tokens || []}
              isLoading={tokensLoading}
              onToggleStatus={(id, ativo) => toggleToken.mutate({ id, ativo })}
              onCreateLink={async (data) => await createToken.mutateAsync(data)}
              isCreating={createToken.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default PreCadastroAdmin;
