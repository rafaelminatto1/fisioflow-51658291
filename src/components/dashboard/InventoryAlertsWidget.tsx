import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { Package, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  needs_replenishment: boolean;
}

export function InventoryAlertsWidget() {
  const { data: inventoryRes, isLoading } = useQuery({
    queryKey: ["inventory-status-dashboard"],
    queryFn: () => request<{ data: InventoryItem[] }>("/api/inventory/status"),
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Checando estoque...</div>;
  }

  const items = inventoryRes?.data || [];
  const lowStockItems = items.filter(i => i.needs_replenishment);

  if (lowStockItems.length === 0) return null;

  return (
    <Card className="border-none shadow-premium bg-amber-50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <CardTitle className="text-lg font-black tracking-tight">Alerta de Estoque</CardTitle>
        </div>
        <CardDescription className="text-amber-700/70">Itens abaixo do estoque mínimo de segurança</CardDescription>
      </CardHeader>
      <CardContent className="px-2">
        <div className="space-y-1">
           {lowStockItems.map((item) => (
             <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                      <Package className="h-4 w-4" />
                   </div>
                   <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-amber-700 font-medium uppercase tracking-tighter">Estoque Crítico: {item.current_stock} {item.unit}</p>
                   </div>
                </div>
                <button className="h-8 px-3 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-colors flex items-center gap-2">
                   <RefreshCw className="h-3 w-3" /> Repor
                </button>
             </div>
           ))}
        </div>
      </CardContent>
    </Card>
  );
}
