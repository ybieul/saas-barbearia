'use client'

import { useState } from 'react'
import { useSubscription } from '@/hooks/use-subscription'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarDays, Crown, Shield, AlertCircle, CheckCircle2, XCircle, Clock, ExternalLink, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'

export default function SubscriptionPage() {
  const { subscriptionInfo: subscription, loading, error, manageSubscription } = useSubscription()
  const [isManaging, setIsManaging] = useState(false)
  const { toast } = useToast()

  // Função para gerenciar assinatura (abrir portal da Kirvano)
  const handleManageSubscription = async () => {
    if (!subscription?.isActive) {
      toast({
        title: 'Assinatura inativa',
        description: 'Apenas assinaturas ativas podem ser gerenciadas.',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsManaging(true)
      
      // Chamar API para obter link do portal
      const portalUrl = await manageSubscription()
      
      // Abrir portal em nova aba
      window.open(portalUrl, '_blank', 'noopener,noreferrer')
      
      toast({
        title: 'Portal aberto',
        description: 'O portal de gerenciamento foi aberto em uma nova aba.'
      })
      
    } catch (error) {
      console.error('Erro ao abrir portal:', error)
      
      toast({
        title: 'Erro ao abrir portal',
        description: error instanceof Error ? error.message : 'Erro desconhecido. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsManaging(false)
    }
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Crown className="h-8 w-8 text-yellow-600" />
        <h1 className="text-3xl font-bold">Gerenciamento da Assinatura</h1>
      </div>

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
                {subscription.plan === 'FREE' && (
                  <>
                    <li>Até 10 clientes</li>
                    <li>Até 50 agendamentos</li>
                    <li>Até 3 serviços</li>
                    <li>1 profissional</li>
                  </>
                )}
                {subscription.plan === 'BASIC' && (
                  <>
                    <li>Até 100 clientes</li>
                    <li>Até 500 agendamentos</li>
                    <li>Até 10 serviços</li>
                    <li>Até 3 profissionais</li>
                    <li>Integração WhatsApp</li>
                  </>
                )}
                {subscription.plan === 'PREMIUM' && (
                  <>
                    <li>Clientes ilimitados</li>
                    <li>Agendamentos ilimitados</li>
                    <li>Serviços ilimitados</li>
                    <li>Profissionais ilimitados</li>
                    <li>Integração WhatsApp</li>
                    <li>Relatórios personalizados</li>
                    <li>Acesso à API</li>
                  </>
                )}
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
              onClick={handleManageSubscription}
              disabled={isManaging || !subscription?.isActive || subscription?.isExpired}
            >
              {isManaging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Abrindo portal...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Gerenciar Assinatura
                  <ExternalLink className="h-3 w-3 ml-2" />
                </>
              )}
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Suporte Técnico</h4>
              <p className="text-sm text-muted-foreground">
                Para dúvidas sobre funcionalidades e uso do sistema
              </p>
              <Button variant="outline" size="sm">
                Abrir Chat de Suporte
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Questões de Cobrança</h4>
              <p className="text-sm text-muted-foreground">
                Para dúvidas sobre pagamentos e faturas
              </p>
              <Button variant="outline" size="sm">
                Contatar Financeiro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
