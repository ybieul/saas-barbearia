"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import React from "react"

export interface LogoProps {
  variant?: "full" | "symbol" // full = símbolo + nome, symbol = apenas ícone
  className?: string
  priority?: boolean
  alt?: string
  width?: number
  height?: number
}

// Componente central de logo para padronizar uso em todo o sistema
// Usa imagens em /public/img/ (logo-tymerbook.png e simbolo-tymerbook.png)
export function Logo({
  variant = "full",
  className,
  priority,
  alt = "TymerBook",
  width,
  height,
}: LogoProps) {
  const isSymbol = variant === "symbol"
  const src = isSymbol ? "/img/simbolo-tymerbook.png" : "/img/logo-tymerbook.png"
  // Dimensões padrão (podem ser sobrescritas)
  const defaultDims = isSymbol
    ? { width: 40, height: 40 }
    : { width: 180, height: 42 }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || defaultDims.width}
      height={height || defaultDims.height}
      priority={priority}
      className={cn(
        // Garante responsividade mantendo proporção; ajuste fino via className externa
        "h-auto w-auto select-none",
        className
      )}
    />
  )
}

export default Logo
