import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

export function PatientAnalytics() {
  const { data: genderData } = useQuery({
    queryKey: ["patient-status-analytics"],
    queryFn: async () => {
      // Usar status dos pacientes ao invés de gender
      const { count: activeCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");

      const { count: inactiveCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("status", "inativo");

      return [
        { name: "Ativos", value: activeCount || 0 },
        { name: "Inativos", value: inactiveCount || 0 },
      ];
    },
  });

  const { data: ageData } = useQuery({
    queryKey: ["patient-age-analytics"],
    queryFn: async () => {
      const { data: patients } = await supabase
        .from("patients")
        .select("birth_date");

      const ageRanges = {
        "0-17": 0,
        "18-30": 0,
        "31-50": 0,
        "51-70": 0,
        "70+": 0,
      };

      patients?.forEach((p) => {
        if (p.birth_date) {
          const age = new Date().getFullYear() - new Date(p.birth_date).getFullYear();
          if (age < 18) ageRanges["0-17"]++;
          else if (age <= 30) ageRanges["18-30"]++;
          else if (age <= 50) ageRanges["31-50"]++;
          else if (age <= 70) ageRanges["51-70"]++;
          else ageRanges["70+"]++;
        }
      });

      return Object.entries(ageRanges).map(([faixa, total]) => ({ faixa, total }));
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Status dos pacientes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {genderData?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Faixa Etária</CardTitle>
            <CardDescription>Idade dos pacientes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="faixa" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
