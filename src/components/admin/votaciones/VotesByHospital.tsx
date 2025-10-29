import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { VotesByHospital } from "@/types/votaciones";

interface VotesByHospitalProps {
  data: VotesByHospital[];
  isLoading?: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

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

  const chartData = data.map(item => ({
    name: item.voter_hospital,
    value: item.vote_count
  }));

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
              fill="#8884d8"
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
