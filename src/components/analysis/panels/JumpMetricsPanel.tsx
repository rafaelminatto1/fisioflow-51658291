import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp } from 'lucide-react';
import { JumpMetrics } from '@/types/biomechanics';
import { powerZone } from '@/utils/biomechanics-formulas';

interface JumpMetricsPanelProps {
	jumpEvents: { takeoff?: number; landing?: number };
	setJumpEvents: React.Dispatch<React.SetStateAction<{ takeoff?: number; landing?: number }>>;
	currentFrame: number;
	jumpMetrics: JumpMetrics | null;
	patientMass: number | null;
}

export const JumpMetricsPanel: React.FC<JumpMetricsPanelProps> = ({
	jumpEvents,
	setJumpEvents,
	currentFrame,
	jumpMetrics,
	patientMass
}) => {
	return (
		<Card className="border-none shadow-sm bg-blue-500/5">
			<CardContent className="p-4 space-y-3">
				<h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
					<ArrowUp className="h-3 w-3" /> Jump Lab · Bosco (1983)
				</h4>
				<div className="grid grid-cols-1 gap-1.5">
					<Button size="sm" variant="outline"
						className="justify-start gap-2 text-[10px] font-bold h-7"
						onClick={() => setJumpEvents(p => ({ ...p, takeoff: currentFrame }))}>
						{jumpEvents.takeoff != null ? `✅ DECOLAGEM · Frame ${jumpEvents.takeoff}` : "1. MARCAR DECOLAGEM"}
					</Button>
					<Button size="sm" variant="outline"
						className="justify-start gap-2 text-[10px] font-bold h-7"
						onClick={() => setJumpEvents(p => ({ ...p, landing: currentFrame }))}>
						{jumpEvents.landing != null ? `✅ ATERRISSAGEM · Frame ${jumpEvents.landing}` : "2. MARCAR ATERRISSAGEM"}
					</Button>
					<Button size="sm" variant="ghost"
						className="justify-start gap-2 text-[10px] font-bold h-6 text-muted-foreground"
						onClick={() => setJumpEvents({})}>
						Limpar
					</Button>
				</div>
				{jumpMetrics && (
					<div className="pt-2 border-t border-blue-500/10 space-y-2">
						<div>
							<p className="text-3xl font-black text-blue-600">
								{jumpMetrics.height}<span className="text-sm ml-1 font-bold">cm</span>
							</p>
							<p className="text-[9px] font-medium text-muted-foreground uppercase">
								Altura · tf = {jumpMetrics.flightTime}ms
							</p>
						</div>
						{jumpMetrics.peakPower != null && (() => {
							const pwr = parseFloat(jumpMetrics.peakPower!);
							const z = powerZone(pwr);
							return (
								<div className={`p-2 rounded-lg ${z.color === "text-green-500" ? "bg-green-500/10" : z.color === "text-blue-400" ? "bg-blue-400/10" : "bg-muted/10"}`}>
									<p className={`text-lg font-black ${z.color}`}>
										{pwr.toFixed(0)}<span className="text-[10px] ml-1 font-bold">W</span>
									</p>
									<p className="text-[9px] text-muted-foreground uppercase">
										Potência Pico · Sayers (1999) · {z.label}
									</p>
								</div>
							);
						})()}
						{!patientMass && (
							<p className="text-[9px] text-amber-500 font-medium">
								↑ Informe a massa para calcular potência
							</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
};
