import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";

export function ProfileTab() {
	return (
		<Card className="bg-gradient-card border-border shadow-card">
			<CardHeader className="border-b border-border p-3 sm:p-4">
				<CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
					<User className="w-4 h-4 sm:w-5 sm:h-5" />
					Perfil
				</CardTitle>
			</CardHeader>
			<CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
				<div className="space-y-1.5 sm:space-y-2">
					<Label htmlFor="name" className="text-xs sm:text-sm">
						Nome completo
					</Label>
					<Input id="name" defaultValue="Dr. João Silva" className="text-sm" />
				</div>
				<div className="space-y-1.5 sm:space-y-2">
					<Label htmlFor="email" className="text-xs sm:text-sm">
						E-mail
					</Label>
					<Input
						id="email"
						type="email"
						defaultValue="joao@moocafisio.com.br"
						className="text-sm"
					/>
				</div>
				<div className="space-y-1.5 sm:space-y-2">
					<Label htmlFor="phone" className="text-xs sm:text-sm">
						Telefone
					</Label>
					<Input
						id="phone"
						defaultValue="(11) 99999-9999"
						className="text-sm"
					/>
				</div>
				<div className="space-y-1.5 sm:space-y-2">
					<Label htmlFor="crefito" className="text-xs sm:text-sm">
						CREFITO
					</Label>
					<Input id="crefito" defaultValue="12345/F" className="text-sm" />
				</div>
				<Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical text-sm touch-target">
					Salvar Alterações
				</Button>
			</CardContent>
		</Card>
	);
}
