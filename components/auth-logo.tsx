"use client"

import React from "react"
import Logo from "./logo"

interface AuthLogoProps {
  className?: string
  variant?: "full" | "symbol"
  // Permitir ajustar rapidamente o conjunto de larguras sem editar todas as páginas
  sizePreset?: "default" | "lg" | "xl"
  priority?: boolean
}

// Wrapper para padronizar a logo nas páginas de autenticação usando controle por largura
// Usa classes Tailwind w-* para controlar dimensão visual sem distorcer
export function AuthLogo({
  className = "",
  variant = "full",
  sizePreset = "default",
  priority = true,
}: AuthLogoProps) {
  const presetMap: Record<string, string> = {
    default: "w-56 sm:w-64 md:w-72 lg:w-80 xl:w-88 2xl:w-96",
    lg: "w-64 sm:w-72 md:w-80 lg:w-88 xl:w-96 2xl:w-104",
    xl: "w-72 sm:w-80 md:w-88 lg:w-96 xl:w-104 2xl:w-112",
  }

  return (
    <div className={`mx-auto ${presetMap[sizePreset]} ${className}`.trim()}>
      <Logo
        variant={variant}
        priority={priority}
        // width/height altos para garantir qualidade; o container controla tamanho final
        width={500}
        height={125}
        className="w-full h-auto"
      />
    </div>
  )
}

export default AuthLogo
