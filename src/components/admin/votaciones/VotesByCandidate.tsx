import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { VotesByCandidate } from "@/types/votaciones";

interface VotesByCandidateProps {
  data: VotesByCandidate[];
  isLoading?: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function VotesByCandidateChart({ data, isLoading }: VotesByCandidateProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Votos por Candidato</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="candidate_name" 
              className="text-xs"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar dataKey="vote_count" name="Votos" radius={[8, 8, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
