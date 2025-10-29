import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { VotesByCandidate } from "@/types/votaciones";

interface VotesByCandidateProps {
  data: VotesByCandidate[];
  isLoading?: boolean;
  currentHospital?: string; // Hospital filtrado actual para mostrar en tooltip
}

// Tooltip personalizado
const CustomTooltip = ({ active, payload, currentHospital }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm">{data.candidate_name}</p>
        <p className="text-sm text-muted-foreground">
          Votos: <span className="font-medium">{data.vote_count}</span>
        </p>
        {currentHospital && (
          <p className="text-xs text-muted-foreground mt-1">
            Hospital: {currentHospital}
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Colores corporativos de ProSalud
const COLORS = [
  '#00529B', // ProSalud Blue
  '#4CAF50', // ProSalud Green
  '#17a2b8', // ProSalud Teal
  '#003A70', // ProSalud Dark Blue
  '#388E3C', // ProSalud Dark Green
];

export function VotesByCandidateChart({ data, isLoading, currentHospital }: VotesByCandidateProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Votos por Candidato</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] animate-pulse">
          <div className="h-full bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Asegurar que siempre haya datos, incluso si es un array vacío
  const chartData = data && data.length > 0 ? data : [];

  // Si no hay datos, mostrar gráfica vacía con mensaje
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Votos por Candidato</CardTitle>
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
        <CardTitle>Votos por Candidato</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="candidate_name" 
              className="text-xs"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              domain={[0, 'auto']}
            />
            <Tooltip 
              content={<CustomTooltip currentHospital={currentHospital} />}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar dataKey="vote_count" name="Votos" radius={[8, 8, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
