import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Activity, Database, Calendar, User } from 'lucide-react'

interface ProfessionalScheduleStatusProps {
  professionalId?: string
  businessSlug?: string
  isReady: boolean
  isLoading: boolean
  error?: string | null
  enabledFeatures: {
    professionalSchedules: boolean
    debugging: boolean
    metrics: boolean
  }
}

export function ProfessionalScheduleStatus({
  professionalId,
  businessSlug,
  isReady,
  isLoading,
  error,
  enabledFeatures
}: ProfessionalScheduleStatusProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [systemInfo, setSystemInfo] = useState<{
    hasProfessionalSchedules: boolean
    hasRecurringBreaks: boolean
    hasScheduleExceptions: boolean
    lastCheck: Date
  } | null>(null)

  useEffect(() => {
    if (isReady && professionalId && businessSlug) {
      checkSystemCapabilities()
    }
  }, [isReady, professionalId, businessSlug])

  const checkSystemCapabilities = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token || !professionalId) return

      // Verificar se profissional tem horários configurados
      const schedulesResponse = await fetch(`/api/professionals/${professionalId}/schedules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const exceptionsResponse = await fetch(
        `/api/professionals/${professionalId}/exceptions?start_date=${new Date().toISOString().split('T')[0]}&end_date=${new Date().toISOString().split('T')[0]}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      const schedulesData = schedulesResponse.ok ? await schedulesResponse.json() : null
      const exceptionsData = exceptionsResponse.ok ? await exceptionsResponse.json() : null

      setSystemInfo({
        hasProfessionalSchedules: schedulesData?.schedule?.some((s: any) => s.isWorking) || false,
        hasRecurringBreaks: schedulesData?.schedule?.some((s: any) => s.breaks?.length > 0) || false,
        hasScheduleExceptions: exceptionsData?.exceptions?.length > 0 || false,
        lastCheck: new Date()
      })
    } catch (err) {
      console.warn('Erro ao verificar capacidades do sistema:', err)
    }
  }

  if (!enabledFeatures.professionalSchedules && !enabledFeatures.debugging) {
    return null
  }

  const getStatusColor = () => {
    if (error) return 'destructive'
    if (!isReady) return 'secondary'
    if (isLoading) return 'default'
    return 'default'
  }

  const getStatusText = () => {
    if (error) return 'Erro'
    if (isLoading) return 'Carregando...'
    if (!isReady) return 'Não Inicializado'
    return 'Sistema Pronto'
  }

  return (
    <Card className="bg-[#18181b] border-[#27272a] mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-[#27272a]/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-[#10b981]" />
                <div>
                  <CardTitle className="text-sm text-[#ededed]">
                    Sistema de Disponibilidade Profissional
                  </CardTitle>
                  <CardDescription className="text-xs text-[#a1a1aa]">
                    Status das regras avançadas de horários
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor()} className="text-xs">
                  {getStatusText()}
                </Badge>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Feature Flags Status */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-2 bg-[#27272a]/50 rounded-md">
                <Calendar className="w-4 h-4 text-[#3b82f6]" />
                <div>
                  <div className="text-xs font-medium text-[#ededed]">
                    Professional Schedules
                  </div>
                  <Badge variant={enabledFeatures.professionalSchedules ? 'default' : 'secondary'} className="text-xs">
                    {enabledFeatures.professionalSchedules ? 'ON' : 'OFF'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-[#27272a]/50 rounded-md">
                <Activity className="w-4 h-4 text-[#f59e0b]" />
                <div>
                  <div className="text-xs font-medium text-[#ededed]">
                    Debug Mode
                  </div>
                  <Badge variant={enabledFeatures.debugging ? 'default' : 'secondary'} className="text-xs">
                    {enabledFeatures.debugging ? 'ON' : 'OFF'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-[#27272a]/50 rounded-md">
                <Database className="w-4 h-4 text-[#10b981]" />
                <div>
                  <div className="text-xs font-medium text-[#ededed]">
                    Business Slug
                  </div>
                  <Badge variant={businessSlug ? 'default' : 'secondary'} className="text-xs">
                    {businessSlug ? 'OK' : 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* System Capabilities */}
            {systemInfo && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#a1a1aa] flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Configuração do Profissional
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#a1a1aa]">Horários Padrão:</span>
                    <Badge variant={systemInfo.hasProfessionalSchedules ? 'default' : 'secondary'} className="text-xs">
                      {systemInfo.hasProfessionalSchedules ? 'Configurado' : 'Não Config.'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#a1a1aa]">Intervalos:</span>
                    <Badge variant={systemInfo.hasRecurringBreaks ? 'default' : 'secondary'} className="text-xs">
                      {systemInfo.hasRecurringBreaks ? 'Tem' : 'Nenhum'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#a1a1aa]">Bloqueios:</span>
                    <Badge variant={systemInfo.hasScheduleExceptions ? 'default' : 'secondary'} className="text-xs">
                      {systemInfo.hasScheduleExceptions ? 'Ativo' : 'Nenhum'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-2 bg-red-900/20 border border-red-500/20 rounded-md">
                <div className="text-xs font-medium text-red-400">Erro:</div>
                <div className="text-xs text-red-300 mt-1">{error}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkSystemCapabilities}
                disabled={!isReady || !professionalId}
                className="text-xs"
              >
                Verificar Config.
              </Button>
              
              {enabledFeatures.debugging && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Status atual:', { 
                    professionalId, 
                    businessSlug, 
                    isReady, 
                    systemInfo 
                  })}
                  className="text-xs"
                >
                  Debug Info
                </Button>
              )}
            </div>

            <div className="text-xs text-[#71717a] pt-2 border-t border-[#27272a]">
              <strong>Fase 1:</strong> Sistema preparado para testes. Use a feature flag para habilitar.
              {systemInfo && (
                <div className="mt-1">
                  Última verificação: {systemInfo.lastCheck.toLocaleTimeString('pt-BR')}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
