"use client"

import { useMemo } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
}

export function Sparkline({ 
  data, 
  width = 80, 
  height = 24, 
  color = "#10b981", 
  strokeWidth = 1.5 
}: SparklineProps) {
  const path = useMemo(() => {
    if (!data || data.length === 0) return ""
    
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1 // Evitar divisão por zero
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    
    return `M ${points.join(' L ')}`
  }, [data, width, height])

  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line 
          x1="0" 
          y1={height / 2} 
          x2={width} 
          y2={height / 2} 
          stroke={color} 
          strokeWidth={strokeWidth}
          strokeDasharray="2,2"
        />
      </svg>
    )
  }

  const trend = data[data.length - 1] > data[0]
  const trendColor = trend ? "#10b981" : "#ef4444"

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke={color || trendColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />
      {/* Pontos nas extremidades */}
      {data.length > 1 && (
        <>
          <circle
            cx="0"
            cy={height - ((data[0] - Math.min(...data)) / (Math.max(...data) - Math.min(...data) || 1)) * height}
            r="1.5"
            fill={color || trendColor}
            className="opacity-60"
          />
          <circle
            cx={width}
            cy={height - ((data[data.length - 1] - Math.min(...data)) / (Math.max(...data) - Math.min(...data) || 1)) * height}
            r="1.5"
            fill={color || trendColor}
          />
        </>
      )}
    </svg>
  )
}

// Componente para mostrar tendência
export function TrendIndicator({ 
  data, 
  showPercentage = true 
}: { 
  data: number[], 
  showPercentage?: boolean 
}) {
  if (!data || data.length < 2) return null
  
  const first = data[0] || 0
  const last = data[data.length - 1] || 0
  const change = first !== 0 ? ((last - first) / first) * 100 : 0
  const isPositive = change > 0
  const isNeutral = Math.abs(change) < 0.1
  
  if (isNeutral && showPercentage) {
    return <span className="text-xs text-[#a1a1aa]">estável</span>
  }
  
  return (
    <span className={`text-xs flex items-center gap-1 ${
      isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'
    }`}>
      <span>{isPositive ? '↗' : '↘'}</span>
      {showPercentage && <span>{Math.abs(change).toFixed(1)}%</span>}
    </span>
  )
}
