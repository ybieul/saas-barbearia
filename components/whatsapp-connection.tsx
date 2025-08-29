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

  // Cleanup polling quando componente for desmontado
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        console.log('🧹 [Frontend] Limpando polling no unmount')
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Sistema de limpeza automática híbrido - Frontend (Best-Effort) + Backend (Garantido)
  useEffect(() => {
    // Só ativar o cleanup se estivermos no estado de conexão (mostrando QR Code)
    if (connectionStatus !== 'connecting' || !instanceName || !qrCodeBase64) {
      return
    }

    console.log('🔧 [Frontend] Iniciando sistema híbrido de cleanup para instância:', instanceName)

    // Função para fazer cleanup imediato da instância (Best-Effort)
    const performImmediateCleanup = async (reason: string) => {
      try {
        console.log(`🧹 [Frontend] Executando cleanup imediato (${reason}):`, instanceName)
        
        const cleanupData = JSON.stringify({
          instanceName: instanceName,
          reason: reason
        })

        const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
        const cleanupUrl = `/api/tenants/${user?.tenantId}/whatsapp/cleanup`
        
        // Estratégia híbrida: Tentar múltiplos métodos para máxima confiabilidade
        let success = false

        // Método 1: sendBeacon (mais confiável para unload events)
        if (navigator.sendBeacon) {
          const blob = new Blob([cleanupData], { type: 'application/json' })
          success = navigator.sendBeacon(cleanupUrl, blob)
          console.log(`📡 [Frontend] Cleanup via sendBeacon (${reason}):`, success ? 'sucesso' : 'falha')
        }

        // Método 2: fetch com keepalive como backup
        if (!success) {
          try {
            await fetch(cleanupUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: cleanupData,
              keepalive: true // Manter conexão viva durante navegação
            })
            console.log(`📡 [Frontend] Cleanup via fetch keepalive (${reason}): sucesso`)
            success = true
          } catch (fetchError) {
            console.warn(`⚠️ [Frontend] Fetch keepalive falhou (${reason}):`, fetchError)
          }
        }

        // Método 3: localStorage como último recurso (para o GC backend pegar)
        if (!success) {
          console.log(`💾 [Frontend] Salvando cleanup pendente no localStorage (${reason})`)
          const pendingCleanups = JSON.parse(localStorage.getItem('pendingWhatsappCleanups') || '[]')
          pendingCleanups.push({
            instanceName,
            reason,
            timestamp: Date.now(),
            tenantId: user?.tenantId
          })
          localStorage.setItem('pendingWhatsappCleanups', JSON.stringify(pendingCleanups))
        }

      } catch (error) {
        console.error(`❌ [Frontend] Erro durante cleanup imediato (${reason}):`, error)
        
        // Fallback: salvar no localStorage para o backend processar
        try {
          const pendingCleanups = JSON.parse(localStorage.getItem('pendingWhatsappCleanups') || '[]')
          pendingCleanups.push({
            instanceName,
            reason: `${reason}_error`,
            timestamp: Date.now(),
            tenantId: user?.tenantId,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          localStorage.setItem('pendingWhatsappCleanups', JSON.stringify(pendingCleanups))
          console.log(`💾 [Frontend] Cleanup salvo no localStorage devido a erro`)
        } catch (storageError) {
          console.error(`💥 [Frontend] Falha crítica no cleanup (${reason}):`, storageError)
        }
      }
    }

    // Detectar quando usuário sai da página/aba (página sendo fechada/navegação)
    const handleBeforeUnload = () => {
      console.log('🚪 [Frontend] Detectado beforeunload - executando cleanup imediato')
      performImmediateCleanup('page_unload')
    }

    // Detectar quando página perde foco (usuário mudou de aba) - Mais agressivo
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ [Frontend] Página perdeu visibilidade - iniciando cleanup agressivo')
        // Cleanup mais rápido para visibilidade (15 segundos ao invés de 30)
        setTimeout(() => {
          if (document.hidden && connectionStatus === 'connecting') {
            console.log('👁️ [Frontend] Página ainda oculta após 15s - executando cleanup')
            performImmediateCleanup('page_hidden')
          }
        }, 15000) // 15 segundos de página oculta = cleanup
      }
    }

    // Cleanup programado agressivo para instâncias muito antigas (3 minutos ao invés de 5)
    const cleanupTimer = setTimeout(() => {
      if (connectionStatus === 'connecting') {
        console.log('⏰ [Frontend] Timeout de 3 minutos atingido - executando cleanup agressivo')
        performImmediateCleanup('frontend_timeout')
      }
    }, 180000) // 3 minutos (o backend fará limpeza adicional a cada 5 minutos)

    // Registrar event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Limpeza inicial do localStorage de cleanups antigos (mais de 1 hora)
    try {
      const pendingCleanups = JSON.parse(localStorage.getItem('pendingWhatsappCleanups') || '[]')
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      const recentCleanups = pendingCleanups.filter((cleanup: any) => cleanup.timestamp > oneHourAgo)
      if (recentCleanups.length !== pendingCleanups.length) {
        localStorage.setItem('pendingWhatsappCleanups', JSON.stringify(recentCleanups))
        console.log(`🧹 [Frontend] Removidos ${pendingCleanups.length - recentCleanups.length} cleanups antigos do localStorage`)
      }
    } catch (error) {
      console.warn('⚠️ [Frontend] Erro ao limpar localStorage:', error)
    }

    // Cleanup function para remover listeners e timer
    return () => {
      console.log('🧹 [Frontend] Removendo listeners de cleanup para:', instanceName)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(cleanupTimer)
    }
  }, [connectionStatus, instanceName, qrCodeBase64, user?.tenantId])

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
      console.log('🔍 [Frontend] Verificando status da conexão (polling)...')
      const data: WhatsAppConnectionData = await apiCall(`status?instanceName=${currentInstanceName}`)
      
      if (data.connected && data.status === 'open') {
        // Conexão estabelecida!
        console.log('✅ [Frontend] WhatsApp conectado detectado - parando polling')
        setConnectionStatus('connected')
        setQrCodeBase64(null)
        setInstanceName(data.instanceName)
        
        // Parar o polling PRIMEIRO antes de mostrar toast
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
          console.log('🛑 [Frontend] Polling interrompido')
        }

        toast({
          title: "✅ WhatsApp Conectado!",
          description: "Seu número WhatsApp foi conectado com sucesso.",
          duration: 5000,
        })
        
        return true // Indicar que a conexão foi estabelecida
      }
      
      return false // Conexão ainda não estabelecida
    } catch (err: any) {
      console.error('Erro no polling:', err)
      // Não mostrar erro durante polling para evitar spam
      return false
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

      // Verificar se já está conectado (lógica idempotente)
      if (response.alreadyConnected) {
        console.log('✅ [Frontend] WhatsApp já estava conectado')
        setConnectionStatus('connected')
        setInstanceName(response.instanceName)
        setQrCodeBase64(null)
        
        toast({
          title: "✅ WhatsApp Já Conectado!",
          description: response.message || "Seu WhatsApp já estava conectado.",
          duration: 5000,
        })
        
        return // Sair da função sem iniciar polling
      }

      // Fluxo normal - QR Code gerado
      if (response.success && response.qrcode) {
        console.log('📱 [Frontend] QR Code gerado - iniciando polling')
        setQrCodeBase64(response.qrcode)
        setInstanceName(response.instanceName)
        
        // Iniciar polling para verificar quando a conexão for estabelecida
        const interval = setInterval(async () => {
          const isConnected = await checkConnectionStatus(response.instanceName)
          if (isConnected) {
            // Conexão detectada, limpar este polling também
            clearInterval(interval)
            console.log('🛑 [Frontend] Polling principal interrompido')
          }
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
      console.log('🔄 [Frontend] Iniciando desconexão do WhatsApp...')

      await apiCall('disconnect', {
        method: 'DELETE',
      })

      // Limpar estado
      setConnectionStatus('disconnected')
      setQrCodeBase64(null)
      setInstanceName(null)
      
      // Parar polling se estiver ativo
      if (pollingInterval) {
        console.log('🛑 [Frontend] Limpando polling na desconexão')
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }

      toast({
        title: "WhatsApp Desconectado",
        description: "Sua conta WhatsApp foi desconectada com sucesso.",
      })
      
      console.log('✅ [Frontend] WhatsApp desconectado com sucesso')
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
              onClick={async () => {
                // Fazer cleanup imediato da instância antes de cancelar
                if (instanceName) {
                  console.log('🚫 [Frontend] Cancelamento manual - fazendo cleanup imediato de:', instanceName)
                  
                  try {
                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                    
                    // Tentar cleanup imediato via fetch (mais confiável para ação manual)
                    await fetch(`/api/tenants/${user?.tenantId}/whatsapp/cleanup`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        instanceName: instanceName,
                        reason: 'manual_cancel'
                      }),
                      signal: AbortSignal.timeout(5000) // 5 segundos timeout
                    })
                    console.log('✅ [Frontend] Cleanup de cancelamento concluído via fetch')
                  } catch (error) {
                    console.error('❌ [Frontend] Erro no cleanup de cancelamento:', error)
                    
                    // Fallback: sendBeacon como alternativa
                    if (navigator.sendBeacon) {
                      const blob = new Blob([JSON.stringify({
                        instanceName: instanceName,
                        reason: 'manual_cancel_fallback'
                      })], { type: 'application/json' })
                      
                      const success = navigator.sendBeacon(`/api/tenants/${user?.tenantId}/whatsapp/cleanup`, blob)
                      console.log('📡 [Frontend] Cleanup de cancelamento via sendBeacon:', success ? 'sucesso' : 'falha')
                    }
                  }
                }

                // Limpar estado local
                setConnectionStatus('disconnected')
                setQrCodeBase64(null)
                setInstanceName(null)
                
                if (pollingInterval) {
                  clearInterval(pollingInterval)
                  setPollingInterval(null)
                }

                toast({
                  title: "Conexão Cancelada",
                  description: "A tentativa de conexão foi cancelada e a instância será limpa automaticamente.",
                })
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
                Seu WhatsApp está conectado e pronto para enviar mensagens automáticas de confirmação e lembretes.
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
