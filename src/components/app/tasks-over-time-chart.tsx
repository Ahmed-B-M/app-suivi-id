"use client";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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
  count: {
    label: "Tâches",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type ChartData = {
    date: string;
    count: number;
}

export function TasksOverTimeChart({data}: {data: ChartData[]}) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité des Tâches</CardTitle>
        <CardDescription>
          Nombre de tâches par jour sur la période sélectionnée
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => {
                 if (value === 'Unplanned') return value;
                 const date = new Date(value);
                 return date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
