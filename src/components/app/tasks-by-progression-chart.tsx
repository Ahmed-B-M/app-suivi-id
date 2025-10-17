
"use client";

import { TrendingUp } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { useCallback } from "react";

const COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-1))",
];

type TasksByProgressionChartProps = {
  data: { name: string; value: number }[];
  onProgressionClick: (status: string) => void;
};

export function TasksByProgressionChart({ data, onProgressionClick }: TasksByProgressionChartProps) {
    
  const chartConfig = data.reduce((acc, item, index) => {
    acc[item.name] = {
      label: item.name,
      color: COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  const totalTasks = data.reduce((acc, curr) => acc + curr.value, 0);

  const handlePieClick = useCallback((pieData: any) => {
    if (pieData && pieData.name) {
      onProgressionClick(pieData.name);
    }
  }, [onProgressionClick]);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Tâches par Progression</CardTitle>
        <CardDescription>
          Répartition des tâches par leur état de progression (API)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="50%"
              strokeWidth={5}
              onClick={handlePieClick}
              className="cursor-pointer"
            >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
             <ChartLegend
                content={<ChartLegendContent nameKey="name" />}
                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Total de {totalTasks} tâches affichées
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Cliquez sur une progression pour voir les détails
        </div>
      </CardFooter>
    </Card>
  );
}

    