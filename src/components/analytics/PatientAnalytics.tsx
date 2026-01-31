import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { db, collection, getDocs, query, where, orderBy } from '@/integrations/firebase/app';
, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

interface PatientData {
  id: string;
  birth_date?: string;
}

export function PatientAnalytics() {
  const { data: genderData } = useQuery({
    queryKey: ["patient-status-analytics"],
    queryFn: async () => {

      // Usar status dos pacientes ao invés de gender
      const activeQuery = query(
        collection(db, "patients"),
        where("status", "==", "ativo")
      );
      const activeSnapshot = await getDocs(activeQuery);
      const activeCount = activeSnapshot.docs.length;

      const inactiveQuery = query(
        collection(db, "patients"),
        where("status", "==", "inativo")
      );
      const inactiveSnapshot = await getDocs(inactiveQuery);
      const inactiveCount = inactiveSnapshot.docs.length;

      return [
        { name: "Ativos", value: activeCount },
        { name: "Inativos", value: inactiveCount },
      ];
    },
  });

  const { data: ageData } = useQuery({
    queryKey: ["patient-age-analytics"],
    queryFn: async () => {
      const patientsQuery = query(
        collection(db, "patients"),
        orderBy("full_name")
      );
      const snapshot = await getDocs(patientsQuery);

      const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const ageRanges = {
        "0-17": 0,
        "18-30": 0,
        "31-50": 0,
        "51-70": 0,
        "70+": 0,
      };

      patients.forEach((p: PatientData) => {
        if (p.birth_date) {
          const age = new Date().getFullYear() - new Date(p.birth_date).getFullYear();
          if (age < 18) ageRanges["0-17"]++;
          else if (age <= 30) ageRanges["18-30"]++;
          else if (age <= 50) ageRanges["31-50"]++;
          else if (age <= 70) ageRanges["51-70"]++;
          else ageRanges["70+"]++;
        }
      });

      return Object.entries(ageRanges).map(([faixa, total]) => ({ faixa, total: total as number }));
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Status atual de todos os pacientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {genderData?.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {genderData?.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm font-medium text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <CardHeader>
            <CardTitle>Distribuição por Faixa Etária</CardTitle>
            <CardDescription>Perfil de idade dos seus pacientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="faixa"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(var(--primary-rgb), 0.05)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)' }}
                  />
                  <Bar
                    dataKey="total"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
