import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { VotesByHospital } from "@/types/votaciones";

interface VotesByHospitalProps {
  data: VotesByHospital[];
  isLoading?: boolean;
}

// Colores corporativos de ProSalud
const COLORS = [
  '#00529B', // ProSalud Blue
  '#4CAF50', // ProSalud Green
  '#17a2b8', // ProSalud Teal
  '#003A70', // ProSalud Dark Blue
  '#388E3C', // ProSalud Dark Green
];

export function VotesByHospitalChart({ data, isLoading }: VotesByHospitalProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Votos por Hospital</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] animate-pulse">
          <div className="h-full bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Asegurar que siempre haya datos, incluso si es un array vacío
  const chartData = data && data.length > 0 
    ? data.map(item => ({
        name: item.voter_hospital,
        value: item.vote_count
      }))
    : [];

  // Si no hay datos, mostrar gráfica vacía con mensaje
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Votos por Hospital</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No hay votos registrados para los filtros seleccionados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Votos por Hospital</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#00529B"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
