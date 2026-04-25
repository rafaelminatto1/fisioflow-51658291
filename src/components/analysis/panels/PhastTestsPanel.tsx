import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, ShieldAlert, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PHAST_TESTS = [
  { id: "hop_test", name: "Hop Test (Distância)", unit: "cm", desc: "Assimetria Aceitável: < 10%" },
  { id: "thomas_test", name: "Teste de Thomas", unit: "°", desc: "Assimetria Aceitável: < 15%" },
  { id: "navicular_drop", name: "Drop Navicular", unit: "mm", desc: "Assimetria Aceitável: < 15%" },
];

export const PhastTestsPanel: React.FC = () => {
  const [selectedTest, setSelectedTest] = useState(PHAST_TESTS[0].id);
  const [leftVal, setLeftVal] = useState<string>("");
  const [rightVal, setRightVal] = useState<string>("");

  const calcAsymmetry = () => {
    const l = parseFloat(leftVal);
    const r = parseFloat(rightVal);
    if (isNaN(l) || isNaN(r) || (l === 0 && r === 0)) return null;
    const max = Math.max(l, r);
    const diff = Math.abs(l - r);
    return ((diff / max) * 100).toFixed(1);
  };

  const asymmetry = calcAsymmetry();
  const currentTest = PHAST_TESTS.find((t) => t.id === selectedTest)!;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="border-none shadow-2xl bg-emerald-950/20 backdrop-blur-xl border border-emerald-500/10 mt-4 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 animate-pulse" /> Ecossistema Phast
            </h4>
            <Badge
              variant="outline"
              className="text-[8px] uppercase font-black text-emerald-400 border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0"
            >
              <Award className="h-2 w-2 mr-1" /> Premium
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {PHAST_TESTS.map((t) => (
              <Button
                key={t.id}
                variant={selectedTest === t.id ? "default" : "outline"}
                size="sm"
                className={`h-8 text-[9px] font-black uppercase tracking-tighter transition-all ${selectedTest === t.id ? "bg-emerald-600 hover:bg-emerald-700 border-none shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "border-white/5 hover:bg-white/5"}`}
                onClick={() => setSelectedTest(t.id)}
              >
                <span className="truncate">{t.name.split(" (")[0]}</span>
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest">
                {currentTest.desc}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                  Esquerda ({currentTest.unit})
                </label>
                <input
                  type="number"
                  className="flex h-10 w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs font-bold text-white transition-all focus:bg-white/10 focus:border-emerald-500/30 focus-visible:outline-none"
                  value={leftVal}
                  onChange={(e) => setLeftVal(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                  Direita ({currentTest.unit})
                </label>
                <input
                  type="number"
                  className="flex h-10 w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs font-bold text-white transition-all focus:bg-white/10 focus:border-emerald-500/30 focus-visible:outline-none"
                  value={rightVal}
                  onChange={(e) => setRightVal(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {asymmetry !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 rounded-2xl border text-center shadow-inner ${Number(asymmetry) > 15 ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"}`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  {Number(asymmetry) > 15 ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <p className="text-[12px] font-black uppercase tracking-widest">
                    Déficit: {asymmetry}%
                  </p>
                </div>
                <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Number(asymmetry) * 2)}%` }}
                    className={`h-full ${Number(asymmetry) > 15 ? "bg-red-500" : "bg-emerald-500"}`}
                  />
                </div>
                <p className="text-[9px] font-black uppercase tracking-tighter">
                  {Number(asymmetry) > 15
                    ? "ALERTA: CRÍTICO - INTERVIR IMEDIATAMENTE"
                    : "CONFORME: MARGEM DE SEGURANÇA OK"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
