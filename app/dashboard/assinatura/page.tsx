'use client'

import { useState, useEffect } from 'react'
import { useSubscription } from '@/hooks/use-subscription'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarDays, Crown, Shield, AlertCircle, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Número de suporte fixo
const SUPPORT_PHONE_NUMBER = '24981757110'

export default function SubscriptionPage() {
  const { subscriptionInfo: subscription, loading, error, refresh } = useSubscription()
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const { toast } = useToast()
  const [reason, setReason] = useState<string | null>(null)
  const [refreshingToken, setRefreshingToken] = useState(false)

  // Ler query param reason (inativa | expirada)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('reason')
    if (r) setReason(r)
  }, [])

  // Se houver reason, tentar atualizar token para sincronizar estado mais recente
  useEffect(() => {
    if (!reason) return
    const sync = async () => {
      try {
        setRefreshingToken(true)
        const res = await fetch('/api/auth/refresh-token')
        if (res.ok) {
          const data = await res.json()
          // atualizar localStorage para manter coerência com AuthProvider
            localStorage.setItem('auth_token', data.token)
          // Forçar refresh das infos de assinatura
          await refresh()
        }
      } catch (e) {
        console.error('Erro ao atualizar token pós-redirecionamento', e)
      } finally {
        setRefreshingToken(false)
      }
    }
    sync()
  }, [reason, refresh])
  const { user } = useAuth()

  // Abrir modal de instruções (mantendo validação de assinatura ativa)
  const handleOpenManageModal = () => {
    if (!subscription?.isActive || subscription?.isExpired) {
      toast({
        title: 'Assinatura inativa',
        description: 'Renove ou ative sua assinatura para gerenciar.',
        variant: 'destructive'
      })
      return
    }
    setIsManageModalOpen(true)
  }

  // Função para abrir suporte no WhatsApp
  const handleSupportClick = () => {
    const message = 'Olá, preciso de ajuda com questões sobre minha assinatura.'
    const whatsappUrl = `https://wa.me/55${SUPPORT_PHONE_NUMBER}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Crown className="h-8 w-8 text-yellow-600" />
          <h1 className="text-3xl font-bold">Gerenciamento da Assinatura</h1>
        </div>

        {/* Loading Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Crown className="h-8 w-8 text-yellow-600" />
          <h1 className="text-3xl font-bold">Gerenciamento da Assinatura</h1>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar informações da assinatura: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Crown className="h-8 w-8 text-yellow-600" />
          <h1 className="text-3xl font-bold">Gerenciamento da Assinatura</h1>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma informação de assinatura encontrada.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Função para obter cor do plano
  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return 'bg-gray-100 text-gray-800'
      case 'BASIC':
        return 'bg-blue-100 text-blue-800'
      case 'PREMIUM':
        return 'bg-purple-100 text-purple-800'
      case 'ULTRA':
        return 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Função para obter ícone do plano
  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return <Shield className="h-4 w-4" />
      case 'BASIC':
        return <CheckCircle2 className="h-4 w-4" />
      case 'PREMIUM':
        return <Crown className="h-4 w-4" />
      case 'ULTRA':
        return <Crown className="h-4 w-4 text-yellow-600" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  // Função para formatear nome do plano
  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return 'Gratuito'
      case 'BASIC':
        return 'Básico'
      case 'PREMIUM':
        return 'Premium'
      case 'ULTRA':
        return 'Ultra'
      default:
        return plan
    }
  }

  // Função para formatar data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Função para obter mensagem de status
  const getStatusMessage = () => {
    if (subscription.isExpired) {
      return {
        icon: <XCircle className="h-5 w-5" />,
        text: 'Expirada',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200'
      }
    } else if (subscription.isActive) {
      if (subscription.daysUntilExpiry && subscription.daysUntilExpiry <= 7) {
        return {
          icon: <Clock className="h-5 w-5" />,
          text: 'Expira em breve',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200'
        }
      }
      return {
        icon: <CheckCircle2 className="h-5 w-5" />,
        text: 'Ativa',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200'
      }
    } else {
      return {
        icon: <XCircle className="h-5 w-5" />,
        text: 'Inativa',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200'
      }
    }
  }

  const statusInfo = getStatusMessage()

  // Estrutura centralizada de recursos dos planos
  const planFeatures = {
    'FREE': {
      professionals: 'Até 1 profissional',
      features: [
        'Até 100 clientes',
        'Até 500 agendamentos',
        'Até 10 serviços',
      ]
    },
    'BASIC': {
      professionals: 'Até 1 profissional',
      features: [
        'Clientes ilimitados',
        'Agendamentos ilimitados',
        'Serviços ilimitados',
      ]
    },
    'PREMIUM': {
      professionals: 'Até 3 profissionais',
      features: [
        'Clientes ilimitados',
        'Agendamentos ilimitados',
        'Serviços ilimitados',
      ]
    },
    'ULTRA': {
      professionals: 'Profissionais ilimitados',
      features: [
        'Clientes ilimitados',
        'Agendamentos ilimitados',
        'Serviços ilimitados',
      ]
    }
  }

  // Recursos comuns a todos os planos pagos
  const commonFeatures = [
    'Integração com WhatsApp',
  ]
  // Recursos avançados apenas para PREMIUM e ULTRA
  const advancedFeatures = [
    'Relatórios de Desempenho por Profissional',
  ]
  // Exclusivos do ULTRA
  const ultraExclusive = [
    'Suporte Prioritário'
  ]

  // Obter recursos do plano atual
  const currentPlanFeatures = planFeatures[subscription.plan as keyof typeof planFeatures] || planFeatures['FREE']

  return (
    <div className="space-y-8 pb-28"> {/* padding extra para não ficar escondido atrás do banner fixo */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">Gerenciamento da Assinatura</h1>
          <p className="text-[#71717a]">Controle completo da sua assinatura e faturas</p>
        </div>
      </div>

      {/* Alertas de bloqueio vindos do middleware */}
      {reason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {reason === 'inativa' && 'Sua assinatura está inativa. Renove para recuperar o acesso completo.'}
            {reason === 'expirada' && 'Sua assinatura expirou. Renove para continuar utilizando a plataforma.'}
            {refreshingToken && <span className="ml-2 text-xs opacity-80">Sincronizando status...</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Status Alert */}
      {subscription.isExpired && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Assinatura expirada!</strong> Sua assinatura expirou há {Math.abs(subscription.daysUntilExpiry || 0)} dias. 
            Renove sua assinatura para continuar aproveitando todos os recursos.
          </AlertDescription>
        </Alert>
      )}

      {subscription.daysUntilExpiry && subscription.daysUntilExpiry <= 7 && subscription.daysUntilExpiry > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Assinatura expira em breve!</strong> Sua assinatura expira em {subscription.daysUntilExpiry} dias. 
            Renove para não perder o acesso aos recursos.
          </AlertDescription>
        </Alert>
      )}

      {/* Cards Principal */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card do Plano Atual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getPlanIcon(subscription.plan)}
              <span>Plano Atual</span>
            </CardTitle>
            <CardDescription>
              Seu plano de assinatura ativo no momento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge className={getPlanColor(subscription.plan)} variant="secondary">
                {getPlanDisplayName(subscription.plan)}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Recursos inclusos:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                {/* Recursos principais do plano */}
                {currentPlanFeatures.features.map((feature, index) => (
                  <li key={`feature-${index}`}>{feature}</li>
                ))}
                
                {/* Número de profissionais */}
                <li>{currentPlanFeatures.professionals}</li>
                
                {/* Recursos comuns (planos pagos) */}
                {subscription.plan !== 'FREE' && commonFeatures.map((feature, index) => (
                  <li key={`common-${index}`}>{feature}</li>
                ))}
                {/* Recursos avançados apenas PREMIUM e ULTRA */}
                {['PREMIUM','ULTRA'].includes(subscription.plan) && advancedFeatures.map((feature, index) => (
                  <li key={`adv-${index}`}>{feature}</li>
                ))}
                {/* Exclusivos ULTRA */}
                {subscription.plan === 'ULTRA' && ultraExclusive.map((feature, index) => (
                  <li key={`ultra-${index}`}>{feature}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Card do Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5" />
              <span>Status da Assinatura</span>
            </CardTitle>
            <CardDescription>
              Informações sobre o estado atual da sua assinatura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Badge */}
            <div className={`flex items-center space-x-2 p-3 rounded-lg border ${statusInfo.bgColor}`}>
              <div className={statusInfo.color}>
                {statusInfo.icon}
              </div>
              <span className={`font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>

            {/* Data de Validade */}
            {subscription.daysUntilExpiry !== undefined && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Data de renovação:
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscription.daysUntilExpiry > 0 
                    ? `Em ${subscription.daysUntilExpiry} dias`
                    : subscription.daysUntilExpiry === 0
                    ? 'Hoje'
                    : `Expirou há ${Math.abs(subscription.daysUntilExpiry)} dias`
                  }
                </p>
              </div>
            )}

            {/* Botão de Gerenciamento */}
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={handleOpenManageModal}
              disabled={!subscription?.isActive || subscription?.isExpired}
            >
              <Crown className="h-4 w-4 mr-2" />
              Gerenciar Assinatura
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
            
            {(!subscription?.isActive || subscription?.isExpired) && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Apenas assinaturas ativas podem ser gerenciadas
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card de Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Precisa de ajuda?</CardTitle>
          <CardDescription>
            Entre em contato conosco para dúvidas sobre sua assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={handleSupportClick}>
            Contatar Suporte
          </Button>
        </CardContent>
      </Card>
      {/* Modal de instruções Kirvano */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-md mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Gerenciar sua Assinatura</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4 text-left text-sm leading-relaxed">
                <p>
                  Para alterar sua forma de pagamento, ver suas faturas ou cancelar sua assinatura, você precisa acessar seu painel na plataforma de pagamentos Kirvano.
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Acesse{' '}
                    <a href="https://app.kirvano.com" target="_blank" rel="noopener noreferrer" className="text-tymer-primary underline hover:opacity-80">
                      app.kirvano.com
                    </a>
                  </li>
                  <li>
                    Faça login com o e-mail: <span className="font-semibold">{user?.email || 'seu-email@exemplo.com'}</span>
                  </li>
                  <li>
                    Se for seu primeiro acesso, use a opção "Esqueci minha senha" para criar uma senha.
                  </li>
                  <li>
                    No painel da Kirvano, vá em <span className="font-semibold">Minhas Compras</span> para gerir sua assinatura.
                  </li>
                </ol>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <a href="https://app.kirvano.com" target="_blank" rel="noopener noreferrer" className="w-full">
              <Button className="w-full bg-tymer-primary hover:bg-tymer-primary/80 text-white" onClick={() => setIsManageModalOpen(false)}>
                Acessar a Kirvano
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Banner Persistente (fixo) */}
  <div className="fixed inset-x-0 bottom-0 z-50 px-3 sm:px-4 pb-4">
        <div
          className={[
            'mx-auto max-w-6xl rounded-lg shadow-lg border backdrop-blur supports-[backdrop-filter]:bg-opacity-90 transition-colors',
            'p-3 sm:p-4',
            subscription.isExpired || !subscription.isActive
              ? 'bg-red-600/90 border-red-500/60 text-white'
              : subscription.plan === 'FREE'
                ? 'bg-gradient-to-r from-gray-800 via-gray-800 to-gray-900 border-gray-700 text-gray-100'
                : (subscription.daysUntilExpiry && subscription.daysUntilExpiry <= 7)
                  ? 'bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 text-white border-amber-400/60'
                  : 'bg-[#18181b]/90 border-[#27272a] text-[#ededed]'
          ].join(' ')}
        >
          <div className="flex flex-col gap-3 sm:gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 text-sm leading-tight">
              {/* Linha principal */}
              <div className="flex items-center gap-2 flex-wrap">
                {subscription.isExpired || !subscription.isActive ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
                      <XCircle className="h-4 w-4" /> Assinatura {subscription.isExpired ? 'expirada' : 'inativa'}
                    </span>
                    <span className="hidden sm:inline opacity-70">|</span>
                    <span className="font-medium">
                      Renove para recuperar o acesso completo.
                    </span>
                  </>
                ) : subscription.plan === 'FREE' ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
                      <Shield className="h-4 w-4" /> Plano Gratuito
                    </span>
                    <span className="hidden sm:inline opacity-70">|</span>
                    <span className="font-medium">Desbloqueie mais recursos atualizando seu plano.</span>
                  </>
                ) : (subscription.daysUntilExpiry && subscription.daysUntilExpiry <= 7) ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
                      <Clock className="h-4 w-4" /> Expira em breve
                    </span>
                    <span className="hidden sm:inline opacity-70">|</span>
                    <span className="font-medium">Renova em {subscription.daysUntilExpiry === 0 ? 'hoje' : `${subscription.daysUntilExpiry} dias`}.</span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
                      <CheckCircle2 className="h-4 w-4" /> Assinatura ativa
                    </span>
                    <span className="hidden sm:inline opacity-70">|</span>
                    <span className="font-medium">Plano {getPlanDisplayName(subscription.plan)}{subscription.daysUntilExpiry ? ` · renova em ${subscription.daysUntilExpiry} dias` : ''}</span>
                  </>
                )}
              </div>
              {/* Linha secundária opcional */}
              {(subscription.isExpired || !subscription.isActive) && subscription.daysUntilExpiry !== undefined && (
                <span className="text-xs opacity-80">
                  {subscription.daysUntilExpiry < 0
                    ? `Expirada há ${Math.abs(subscription.daysUntilExpiry)} dias`
                    : subscription.daysUntilExpiry === 0
                      ? 'Expira hoje'
                      : `Expira em ${subscription.daysUntilExpiry} dias`}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end w-full sm:w-auto">
              {subscription.isExpired || !subscription.isActive ? (
                <Button
                  size="sm"
                  className="w-full sm:w-auto bg-white text-red-600 hover:bg-red-50"
                  onClick={handleOpenManageModal}
                >
                  Renovar agora
                </Button>
              ) : subscription.plan === 'FREE' ? (
                <Button
                  size="sm"
                  className="w-full sm:w-auto bg-tymer-primary hover:bg-tymer-primary/80 text-white"
                  onClick={handleOpenManageModal}
                >
                  Ver planos
                </Button>
              ) : (subscription.daysUntilExpiry && subscription.daysUntilExpiry <= 7) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={handleOpenManageModal}
                >
                  Renovar assinatura
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleOpenManageModal}
                >
                  Gerenciar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
