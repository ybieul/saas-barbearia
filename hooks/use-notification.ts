"use client"

import { useToast } from "@/components/ui/use-toast"

interface NotificationOptions {
  title?: string
  description?: string
  duration?: number
}

export function useNotification() {
  const { toast } = useToast()

  const success = (options: NotificationOptions | string) => {
    if (typeof options === 'string') {
      toast({
        title: "✅ Sucesso!",
        description: options,
        variant: "default",
        duration: 4000,
      })
    } else {
      toast({
        title: options.title || "✅ Sucesso!",
        description: options.description,
        variant: "default",
        duration: options.duration || 4000,
      })
    }
  }

  const error = (options: NotificationOptions | string) => {
    if (typeof options === 'string') {
      toast({
        title: "❌ Erro!",
        description: options,
        variant: "destructive",
        duration: 6000,
      })
    } else {
      toast({
        title: options.title || "❌ Erro!",
        description: options.description,
        variant: "destructive",
        duration: options.duration || 6000,
      })
    }
  }

  const warning = (options: NotificationOptions | string) => {
    if (typeof options === 'string') {
      toast({
        title: "⚠️ Atenção!",
        description: options,
        variant: "default",
        duration: 5000,
      })
    } else {
      toast({
        title: options.title || "⚠️ Atenção!",
        description: options.description,
        variant: "default",
        duration: options.duration || 5000,
      })
    }
  }

  const info = (options: NotificationOptions | string) => {
    if (typeof options === 'string') {
      toast({
        title: "ℹ️ Informação",
        description: options,
        variant: "default",
        duration: 4000,
      })
    } else {
      toast({
        title: options.title || "ℹ️ Informação",
        description: options.description,
        variant: "default",
        duration: options.duration || 4000,
      })
    }
  }

  return {
    success,
    error,
    warning,
    info,
    toast
  }
}
