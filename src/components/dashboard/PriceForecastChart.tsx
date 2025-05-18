"use client"

import * as React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface PriceForecastChartProps {
  chartData: Array<{ time: string; price: number | null }>;
  currentPrice: number;
  targetPrice: number;
}

const chartConfig = {
  price: {
    label: "Price (USD)",
    color: "hsl(var(--chart-1))",
  },
  currentPrice: {
    label: "Current Price",
    color: "hsl(var(--chart-2))",
  },
  targetPrice: {
    label: "Target Price",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export function PriceForecastChart({ chartData, currentPrice, targetPrice }: PriceForecastChartProps) {
  if (!chartData || chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Not enough data to display chart.</p>;
  }

  const yDomain = [
    Math.min(...chartData.map(d => d.price ?? Infinity), targetPrice, currentPrice) * 0.95,
    Math.max(...chartData.map(d => d.price ?? -Infinity), targetPrice, currentPrice) * 1.05,
  ];

  return (
    <ChartContainer config={chartConfig} className={cn("min-h-[250px] w-full")}>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 20,
            left: -10, // Adjust left margin to show Y-axis labels better
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.slice(0, 3)} // Show abbreviated time label
            className="text-xs"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={yDomain}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            className="text-xs"
          />
          <Tooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                labelKey="price"
                nameKey="time"
                formatter={(value, name, props) => {
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground">
                        {props.payload.time}: ${Number(props.payload.price).toLocaleString()}
                      </span>
                    </div>
                  )
                }}

              />
            }
          />
          <Line
            dataKey="price"
            type="monotone"
            stroke="var(--color-price)"
            strokeWidth={2}
            dot={{
              fill: "var(--color-price)",
              r: 4,
            }}
            activeDot={{
              r: 6,
            }}
          />
          <ReferenceLine
            y={currentPrice}
            label={{ value: "Current", position: "insideRight", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            stroke="var(--color-currentPrice)"
            strokeDasharray="3 3"
            strokeWidth={1.5}
          />
          <ReferenceLine
            y={targetPrice}
            label={{ value: "Target", position: "insideRight", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            stroke="var(--color-targetPrice)"
            strokeDasharray="3 3"
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
