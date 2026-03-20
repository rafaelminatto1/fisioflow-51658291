import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { gamificationApi, type ShopItemRow } from "@/lib/api/workers-client";

type Reward = ShopItemRow;
const CATEGORIES = [
	{ value: "consumable", label: "Consumível" },
	{ value: "cosmetic", label: "Cosmético" },
	{ value: "feature", label: "Funcionalidade" },
];
const ICONS = [
	"Gift",
	"Calendar",
	"Percent",
	"Coffee",
	"Flower",
	"Dumbbell",
	"Scan",
	"Star",
	"Trophy",
];

export default function RewardsManager() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingReward, setEditingReward] = useState<Reward | null>(null);

	const { data: rewards = [], isLoading } = useQuery({
		queryKey: ["admin-rewards"],
		queryFn: async () => (await gamificationApi.getAllShopItems()).data ?? [],
	});

	const upsertReward = useMutation({
		mutationFn: async (values: Partial<Reward>) => {
			const payload = {
				code:
					values.code ||
					values.name?.toLowerCase().replace(/\s+/g, "_") ||
					null,
				name: values.name,
				description: values.description,
				cost: values.cost,
				type: values.type || "consumable",
				icon: values.icon || "Gift",
				metadata: values.metadata || {},
				is_active: values.is_active ?? true,
			};
			if (editingReward?.id)
				return (
					await gamificationApi.shopAdmin.update(editingReward.id, payload)
				).data;
			return (await gamificationApi.shopAdmin.create(payload)).data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
			queryClient.invalidateQueries({ queryKey: ["shop-items"] });
			setIsDialogOpen(false);
			setEditingReward(null);
			toast({ title: "Sucesso", description: "Recompensa salva com sucesso!" });
		},
		onError: (error: Error) =>
			toast({
				title: "Erro",
				description: `Falha ao salvar recompensa: ${error.message}`,
				variant: "destructive",
			}),
	});

	const deleteReward = useMutation({
		mutationFn: async (id: string) => gamificationApi.shopAdmin.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
			queryClient.invalidateQueries({ queryKey: ["shop-items"] });
			toast({
				title: "Removido",
				description: "Recompensa removida com sucesso",
			});
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		upsertReward.mutate({
			name: formData.get("title") as string,
			description: formData.get("description") as string,
			cost: Number(formData.get("point_cost") as string),
			icon: formData.get("icon") as string,
			type: formData.get("category") as string,
			metadata: {
				image_url: formData.get("image_url") as string,
				stock: Number(formData.get("stock") as string) || null,
			},
			is_active: true,
		});
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle className="flex items-center gap-2">
						<Gift className="h-5 w-5 text-purple-500" />
						Loja de Recompensas
					</CardTitle>
					<CardDescription>
						Gerencie os itens resgatáveis pelos pacientes
					</CardDescription>
				</div>
				<Dialog
					open={isDialogOpen}
					onOpenChange={(open) => {
						setIsDialogOpen(open);
						if (!open) setEditingReward(null);
					}}
				>
					<DialogTrigger asChild>
						<Button className="gap-2">
							<Plus className="h-4 w-4" />
							Nova Recompensa
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-lg">
						<DialogHeader>
							<DialogTitle>
								{editingReward ? "Editar Recompensa" : "Nova Recompensa"}
							</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="title">Título</Label>
								<Input
									id="title"
									name="title"
									required
									defaultValue={editingReward?.name}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="description">Descrição</Label>
								<Textarea
									id="description"
									name="description"
									defaultValue={editingReward?.description || ""}
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="point_cost">Custo (Pontos)</Label>
									<Input
										id="point_cost"
										name="point_cost"
										type="number"
										required
										defaultValue={editingReward?.cost || 100}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="stock">Estoque</Label>
									<Input
										id="stock"
										name="stock"
										type="number"
										defaultValue={String(
											(
												editingReward?.metadata as
													| { stock?: number }
													| undefined
											)?.stock || "",
										)}
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Categoria</Label>
									<Select
										name="category"
										defaultValue={editingReward?.type || "consumable"}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{CATEGORIES.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Ícone</Label>
									<Select
										name="icon"
										defaultValue={editingReward?.icon || "Gift"}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{ICONS.map((item) => (
												<SelectItem key={item} value={item}>
													{item}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="image_url">URL da Imagem</Label>
								<Input
									id="image_url"
									name="image_url"
									defaultValue={String(
										(
											editingReward?.metadata as
												| { image_url?: string }
												| undefined
										)?.image_url || "",
									)}
								/>
							</div>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsDialogOpen(false)}
								>
									Cancelar
								</Button>
								<Button type="submit" disabled={upsertReward.isPending}>
									{upsertReward.isPending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Salvar
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="flex justify-center p-8">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{rewards.map((reward) => (
							<div
								key={reward.id}
								className={`relative p-4 border rounded-xl transition-all group ${reward.is_active ? "bg-card hover:shadow-md" : "bg-muted/50 opacity-60"}`}
							>
								<div className="flex items-start gap-3">
									<div
										className={`p-3 rounded-xl ${reward.is_active ? "bg-purple-100 text-purple-600" : "bg-muted text-muted-foreground"}`}
									>
										<Gift className="h-6 w-6" />
									</div>
									<div className="flex-1 min-w-0">
										<h4 className="font-semibold truncate">{reward.name}</h4>
										<p className="text-sm text-muted-foreground line-clamp-2">
											{reward.description}
										</p>
										<div className="flex items-center gap-2 mt-2">
											<Badge>{reward.cost} pts</Badge>
											<Badge variant="outline">{reward.type}</Badge>
											<Switch
												checked={reward.is_active}
												onCheckedChange={() =>
													upsertReward.mutate({
														...reward,
														is_active: !reward.is_active,
													})
												}
											/>
										</div>
									</div>
								</div>
								<div className="flex justify-end gap-2 mt-4">
									<Button
										size="icon"
										variant="ghost"
										onClick={() => {
											setEditingReward(reward);
											setIsDialogOpen(true);
										}}
									>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => deleteReward.mutate(reward.id)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
