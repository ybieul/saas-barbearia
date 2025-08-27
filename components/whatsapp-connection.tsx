"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Smartphone, CheckCircle, AlertCircle, QrCode, Unlink } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface WhatsAppConnectionData {
  connected: boolean
  instanceName: string
  status: string
  error?: string
}

export function WhatsAppConnection() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  const { user } = useAuth()
  const { toast } = useToast()

  // Função para fazer chamadas à API
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    if (!user?.tenantId) {
      throw new Error('Usuário não autenticado')
    }

    // Tentar obter token de diferentes locais para compatibilidade
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    
    console.log('🔐 [Frontend] Fazendo chamada API:', endpoint)
    console.log('🔐 [Frontend] Token encontrado:', token ? '✅ Sim' : '❌ Não')
    console.log('🔐 [Frontend] TenantId:', user.tenantId)

    const response = await fetch(`/api/tenants/${user.tenantId}/whatsapp/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    console.log('📡 [Frontend] Response status:', response.status)
    console.log('📡 [Frontend] Response ok:', response.ok)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ [Frontend] Erro na API:', errorData)
      throw new Error(errorData.error || `Erro HTTP ${response.status}`)
    }

    const responseData = await response.json()
    console.log('✅ [Frontend] Resposta da API:', responseData)
    return responseData
  }, [user?.tenantId])

  // Verificar status inicial
  const checkInitialStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data: WhatsAppConnectionData = await apiCall('status')
      
      if (data.connected) {
        setConnectionStatus('connected')
        setInstanceName(data.instanceName)
      } else {
        setConnectionStatus('disconnected')
      }
    } catch (err: any) {
      console.error('Erro ao verificar status inicial:', err)
      setError(err.message)
      setConnectionStatus('disconnected')
    } finally {
      setIsLoading(false)
    }
  }, [apiCall])

  // Verificar status durante o polling
  const checkConnectionStatus = useCallback(async (currentInstanceName: string) => {
    try {
      const data: WhatsAppConnectionData = await apiCall(`status?instanceName=${currentInstanceName}`)
      
      if (data.connected && data.status === 'open') {
        // Conexão estabelecida!
        setConnectionStatus('connected')
        setQrCodeBase64(null)
        setInstanceName(data.instanceName)
        
        // Parar o polling
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }

        toast({
          title: "✅ WhatsApp Conectado!",
          description: "Seu número WhatsApp foi conectado com sucesso.",
          duration: 5000,
        })
      }
    } catch (err: any) {
      console.error('Erro no polling:', err)
      // Não mostrar erro durante polling para evitar spam
    }
  }, [apiCall, pollingInterval, toast])

  // Iniciar conexão (gerar QR Code)
  const startConnection = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setConnectionStatus('connecting')

      const response = await apiCall('connect', {
        method: 'POST',
      })

      if (response.success && response.qrcode) {
        setQrCodeBase64(response.qrcode)
        setInstanceName(response.instanceName)
        
        // Iniciar polling para verificar quando a conexão for estabelecida
        const interval = setInterval(() => {
          checkConnectionStatus(response.instanceName)
        }, 3000) // A cada 3 segundos

        setPollingInterval(interval)

        toast({
          title: "QR Code Gerado",
          description: "Escaneie o QR Code com seu WhatsApp para conectar.",
        })
      } else {
        throw new Error('Erro ao gerar QR Code')
      }
    } catch (err: any) {
      console.error('Erro ao conectar:', err)
      setError(err.message)
      setConnectionStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  // Desconectar WhatsApp
  const disconnect = async () => {
    try {
      setIsLoading(true)
      setError(null)

      await apiCall('disconnect', {
        method: 'DELETE',
      })

      // Limpar estado
      setConnectionStatus('disconnected')
      setQrCodeBase64(null)
      setInstanceName(null)
      
      // Parar polling se estiver ativo
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }

      toast({
        title: "WhatsApp Desconectado",
        description: "Sua conta WhatsApp foi desconectada com sucesso.",
      })
    } catch (err: any) {
      console.error('Erro ao desconectar:', err)
      setError(err.message)
      setConnectionStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  // Efeito para verificar status inicial
  useEffect(() => {
    checkInitialStatus()
  }, [checkInitialStatus])

  // Cleanup do polling ao desmontar componente
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          <CardTitle>Conexão WhatsApp</CardTitle>
        </div>
        <CardDescription>
          Conecte seu número de WhatsApp para enviar mensagens automáticas aos seus clientes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Estado: Desconectado */}
        {connectionStatus === 'disconnected' && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span>WhatsApp não conectado</span>
            </div>
            <Button 
              onClick={startConnection} 
              disabled={isLoading}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando QR Code...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Conectar WhatsApp
                </>
              )}
            </Button>
          </div>
        )}

        {/* Estado: Conectando (mostrando QR Code) */}
        {connectionStatus === 'connecting' && qrCodeBase64 && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Aguardando conexão...</span>
            </div>
            
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
              <Image
                src={qrCodeBase64}
                alt="QR Code WhatsApp"
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Como conectar:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                <li>Abra o WhatsApp no seu celular</li>
                <li>Toque em "Mais opções" (⋮) &gt; "Aparelhos conectados"</li>
                <li>Toque em "Conectar um aparelho"</li>
                <li>Escaneie este QR Code</li>
              </ol>
            </div>

            <Button 
              variant="outline" 
              onClick={() => {
                setConnectionStatus('disconnected')
                setQrCodeBase64(null)
                if (pollingInterval) {
                  clearInterval(pollingInterval)
                  setPollingInterval(null)
                }
              }}
            >
              Cancelar
            </Button>
          </div>
        )}

        {/* Estado: Conectado */}
        {connectionStatus === 'connected' && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">✅ WhatsApp Conectado com Sucesso!</span>
            </div>
            
            {instanceName && (
              <div className="text-sm text-muted-foreground">
                <p>Instância: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{instanceName}</code></p>
              </div>
            )}

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Seu WhatsApp está conectado e pronto para enviar mensagens automáticas de confirmação, lembretes e reativação de clientes.
              </AlertDescription>
            </Alert>

            <Button 
              variant="destructive" 
              onClick={disconnect} 
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desconectando...
                </>
              ) : (
                <>
                  <Unlink className="mr-2 h-4 w-4" />
                  Desconectar
                </>
              )}
            </Button>
          </div>
        )}

        {/* Estado: Erro */}
        {connectionStatus === 'error' && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Erro na Conexão</span>
            </div>
            
            <Button 
              onClick={checkInitialStatus}
              variant="outline"
            >
              Tentar Novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
