import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PreCadastroStats } from "@/components/precadastro/PreCadastroStats";
import { PreCadastroList } from "@/components/precadastro/PreCadastroList";
import { LinkManagement } from "@/components/precadastro/LinkManagement";
import {
	useCreatePrecadastroToken,
	usePrecadastroTokens,
	usePrecadastros,
	useUpdatePrecadastro,
	useUpdatePrecadastroToken,
} from "@/hooks/usePrecadastros";

interface NewTokenData {
	nome?: string;
	descricao?: string;
	max_usos?: string | number;
	validade_dias: string | number;
	campos_obrigatorios: string[];
	campos_opcionais: string[];
}

const PreCadastroAdmin = () => {
	const { data: tokens = [], isLoading: tokensLoading } =
		usePrecadastroTokens();
	const { data: precadastros = [], isLoading: precadastrosLoading } =
		usePrecadastros();
	const createToken = useCreatePrecadastroToken();
	const toggleToken = useUpdatePrecadastroToken();
	const updatePrecadastro = useUpdatePrecadastro();

	const handleCreateLink = async (newToken: NewTokenData) => {
		const validadeDias = Number(newToken.validade_dias) || 30;
		await createToken.mutateAsync({
			nome: newToken.nome || "Link de Pré-cadastro",
			descricao: newToken.descricao ?? null,
			ativo: true,
			max_usos: newToken.max_usos ? Number(newToken.max_usos) : null,
			expires_at: new Date(
				Date.now() + validadeDias * 24 * 60 * 60 * 1000,
			).toISOString(),
			campos_obrigatorios: newToken.campos_obrigatorios,
			campos_opcionais: newToken.campos_opcionais,
		});
	};

	return (
		<MainLayout>
			<div className="space-y-6 p-4 md:p-6 bg-background/50 min-h-screen">
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-bold tracking-tight">
						Pré-cadastro de Pacientes
					</h1>
					<p className="text-muted-foreground">
						Gerencie links de captação e visualize os dados dos pacientes
						interessados.
					</p>
				</div>

				<PreCadastroStats tokens={tokens} precadastros={precadastros} />

				<Tabs defaultValue="precadastros" className="space-y-4">
					<TabsList className="bg-background border">
						<TabsTrigger value="precadastros">
							Pré-cadastros Recebidos
						</TabsTrigger>
						<TabsTrigger value="links">Gerenciar Links</TabsTrigger>
					</TabsList>

					<TabsContent value="precadastros" className="space-y-4">
						<PreCadastroList
							precadastros={precadastros}
							isLoading={precadastrosLoading}
							onUpdateStatus={(id, status) =>
								updatePrecadastro.mutate({ id, status })
							}
						/>
					</TabsContent>

					<TabsContent value="links" className="space-y-4">
						<LinkManagement
							tokens={tokens}
							isLoading={tokensLoading}
							onToggleStatus={(id, ativo) => toggleToken.mutate({ id, ativo })}
							onCreateLink={handleCreateLink}
							isCreating={createToken.isPending}
						/>
					</TabsContent>
				</Tabs>
			</div>
		</MainLayout>
	);
};

export default PreCadastroAdmin;
