import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { organizationMembersApi } from "@/api/v2/communications";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TeamSelectorProps {
	onSelect: (userId: string, name: string) => void;
	excludeIds?: string[];
}

export function TeamSelector({ onSelect, excludeIds = [] }: TeamSelectorProps) {
	const [search, setSearch] = useState("");
	const { data: members = [] } = useQuery({
		queryKey: ["organization-members"],
		queryFn: async () => {
			const res = await organizationMembersApi.list();
			return res.data || [];
		},
	});

	const filteredMembers = members.filter((m: any) => {
		const name = m.profiles?.full_name || "";
		return (
			!excludeIds.includes(m.user_id) &&
			name.toLowerCase().includes(search.toLowerCase())
		);
	});

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
					<Input
						placeholder="Buscar membro da equipe..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9 h-9 text-xs"
					/>
				</div>
			</div>
			<ScrollArea className="flex-1">
				{filteredMembers.length === 0 ? (
					<div className="p-8 text-center text-muted-foreground text-sm">
						Nenhum membro encontrado.
					</div>
				) : (
					<div className="p-2 space-y-1">
						{filteredMembers.map((member: any) => (
							<button
								key={member.user_id}
								onClick={() =>
									onSelect(
										member.user_id,
										member.profiles?.full_name || "Usuário",
									)
								}
								className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
							>
								<Avatar className="h-8 w-8">
									<AvatarFallback className="text-[10px]">
										{(member.profiles?.full_name || "U")
											.charAt(0)
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0">
									<p className="text-sm font-medium truncate">
										{member.profiles?.full_name || "Usuário"}
									</p>
									<p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
										{member.role || "Membro"}
									</p>
								</div>
							</button>
						))}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
