"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Clock,
  DollarSign,
  MessageCircle,
  BarChart3,
  Users,
  Star,
  ArrowRight,
  Scissors,
  Smartphone,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#18181b]/80 backdrop-blur-xl border-b border-[#27272a]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#10b981] to-[#059669] rounded-lg flex items-center justify-center shadow-lg shadow-[#10b981]/25">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">
              AgendaPro
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" className="text-[#71717a] hover:text-[#ededed] hover:bg-[#3f3f46]/50">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white border-0 transition-all duration-200">
                Cadastrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-6 bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30">
            ✨ Nova era do agendamento
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-[#ededed]">
            A nova era do agendamento para{" "}
            <span className="bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">
              salões e barbearias
            </span>{" "}
            começou
          </h1>
          <p className="text-xl text-[#71717a] mb-8 max-w-3xl mx-auto">
            Automatize seus agendamentos, elimine faltas, aumente sua receita e ofereça uma experiência premium para
            seus clientes.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white border-0 text-lg px-8 py-6 transition-all duration-200"
              >
                Criar Conta Gratuita
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-[#52525b] text-[#ededed] hover:bg-[#3f3f46] hover:border-[#10b981] text-lg px-8 py-6 transition-all duration-200"
              onClick={async () => {
                try {
                  const response = await fetch('/api/demo', { method: 'POST' })
                  const data = await response.json()
                  if (response.ok) {
                    alert(`Dados demo criados!\nEmail: ${data.credentials.email}\nSenha: ${data.credentials.password}`)
                  } else {
                    alert(data.message)
                  }
                } catch (error) {
                  alert('Erro ao criar dados demo')
                }
              }}
            >
              🎯 Gerar Dados Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Problemas que você enfrenta <span className="text-red-400">diariamente</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Sabemos como é difícil gerenciar um salão ou barbearia sem as ferramentas certas
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Esquecimento de Horários</h3>
                <p className="text-gray-400">
                  Clientes que não aparecem ou chegam no horário errado, causando perda de tempo e dinheiro.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Agenda Desorganizada</h3>
                <p className="text-gray-400">
                  Papel, caderno ou planilhas que se perdem, causando confusão e duplo agendamento.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Falta de Controle Financeiro</h3>
                <p className="text-gray-400">
                  Não saber quanto está faturando, quais serviços vendem mais ou como está a performance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Soluções que{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-yellow-400 bg-clip-text text-transparent">
                transformam
              </span>{" "}
              seu negócio
            </h2>
            <p className="text-gray-400 text-lg">
              Automatize processos e foque no que realmente importa: seus clientes
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Lembretes WhatsApp</h3>
                <p className="text-gray-400">Confirmações e lembretes automáticos para reduzir faltas em 90%.</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Relatórios Inteligentes</h3>
                <p className="text-gray-400">
                  Acompanhe faturamento, serviços mais vendidos e performance em tempo real.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Agendamento Online</h3>
                <p className="text-gray-400">Link personalizado para clientes agendarem 24/7 sem precisar ligar.</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Upsell Inteligente</h3>
                <p className="text-gray-400">
                  Sugestões automáticas de serviços adicionais para aumentar o ticket médio.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Funcionalidades <span className="text-emerald-400">completas</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Tudo que você precisa para gerenciar seu salão ou barbearia em um só lugar
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: BarChart3, title: "Dashboard Completo", desc: "Visão geral do seu negócio em tempo real" },
              { icon: Users, title: "Gestão de Clientes", desc: "Cadastro completo e histórico de atendimentos" },
              { icon: DollarSign, title: "Controle Financeiro", desc: "Faturamento diário, semanal e mensal" },
              { icon: Calendar, title: "Agenda Inteligente", desc: "Calendário interativo por profissional" },
              { icon: MessageCircle, title: "WhatsApp Integrado", desc: "Confirmações e lembretes automáticos" },
              { icon: TrendingUp, title: "Relatórios Avançados", desc: "Gráficos e estatísticas detalhadas" },
            ].map((feature, index) => (
              <Card key={index} className="bg-gray-800/30 border-gray-700 p-6 hover:bg-gray-800/50 transition-colors">
                <CardContent className="p-0">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                  <p className="text-gray-400">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              O que nossos clientes <span className="text-yellow-400">dizem</span>
            </h2>
            <p className="text-gray-400 text-lg">Resultados reais de quem já transformou seu negócio</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Carlos Silva",
                business: "Barbearia do Carlos",
                text: "Reduzi as faltas em 85% e aumentei meu faturamento em 40% no primeiro mês!",
                rating: 5,
              },
              {
                name: "Ana Costa",
                business: "Salão Beleza Pura",
                text: "Agora tenho controle total do meu negócio. Os relatórios me ajudam a tomar decisões certeiras.",
                rating: 5,
              },
              {
                name: "Roberto Lima",
                business: "Studio Hair",
                text: "Meus clientes adoram agendar pelo WhatsApp. Muito mais prático para todos!",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <Card key={index} className="bg-gray-800/30 border-gray-700 p-6">
                <CardContent className="p-0">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-4 italic">&quot;{testimonial.text}&quot;</p>
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-gray-400">{testimonial.business}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-emerald-500/10 to-yellow-500/10">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-yellow-400 bg-clip-text text-transparent">
              transformar
            </span>{" "}
            seu negócio?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de salões e barbearias que já aumentaram sua receita com o AgendaPro.
          </p>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 text-lg px-8 py-6"
            >
              Criar Conta Gratuita
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            ✅ Sem cartão de crédito • ✅ Configuração em 5 minutos • ✅ Suporte em português
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-yellow-400 bg-clip-text text-transparent">
                AgendaPro
              </span>
            </div>
            <div className="text-gray-400 text-sm">© 2024 AgendaPro. Todos os direitos reservados.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
