
"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  value: {
    label: "Verbatims",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type VerbatimsByResponsibilityChartProps = {
  data: { name: string; value: number }[];
};

export function VerbatimsByResponsibilityChart({ data }: VerbatimsByResponsibilityChartProps) {
  if (!data || data.length === 0) {
    return (
       <Card>
        <CardHeader>
          <CardTitle>Verbatims par Responsabilité</CardTitle>
          <CardDescription>
            Nombre de verbatims détracteurs assignés à chaque responsable.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Aucune donnée de verbatim traité.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verbatims par Responsabilité</CardTitle>
        <CardDescription>
          Nombre de verbatims détracteurs assignés à chaque responsable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{ left: 10, right: 30 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 10)}
            />
            <XAxis type="number" dataKey="value" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="value" fill="var(--color-value)" radius={4}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartConfig.value.color} />
                ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
