import * as React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"

import { cn } from "@/lib/utils"

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: any[]
  type: "bar" | "line" | "pie"
  xKey?: string
  yKeys?: string[]
  colors?: string[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
}

const defaultColors = [
  "#0ea5e9", // sky-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
]

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(
  ({ 
    className, 
    data, 
    type, 
    xKey = "name", 
    yKeys = ["value"], 
    colors = defaultColors,
    height = 300,
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    ...props 
  }, ref) => {
    const renderChart = () => {
      switch (type) {
        case "bar":
          return (
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={data}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey={xKey} />
                <YAxis />
                {showTooltip && <Tooltip />}
                {showLegend && <Legend />}
                {yKeys.map((key, index) => (
                  <Bar 
                    key={key} 
                    dataKey={key} 
                    fill={colors[index % colors.length]} 
                    name={key}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )
        case "line":
          return (
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={data}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey={xKey} />
                <YAxis />
                {showTooltip && <Tooltip />}
                {showLegend && <Legend />}
                {yKeys.map((key, index) => (
                  <Line 
                    key={key} 
                    type="monotone" 
                    dataKey={key} 
                    stroke={colors[index % colors.length]} 
                    name={key}
                    activeDot={{ r: 8 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )
        case "pie":
          return (
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey={yKeys[0]}
                  nameKey={xKey}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                {showTooltip && <Tooltip />}
                {showLegend && <Legend />}
              </PieChart>
            </ResponsiveContainer>
          )
        default:
          return null
      }
    }

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {renderChart()}
      </div>
    )
  }
)
Chart.displayName = "Chart"

export { Chart }
