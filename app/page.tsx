"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
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
  Check,
  Instagram,
  Facebook,
  Twitter,
} from "lucide-react"

// Configuração dos links de checkout da Kirvano via variáveis públicas
// Defina no .env: NEXT_PUBLIC_KIRVANO_CHECKOUT_<PLANO>_<CICLO>
// Ex.: NEXT_PUBLIC_KIRVANO_CHECKOUT_BASIC_MONTHLY, NEXT_PUBLIC_KIRVANO_CHECKOUT_BASIC_ANNUAL, etc.
const CHECKOUT_LINKS = {
  BASIC: {
    monthly: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_BASIC_MONTHLY || "#",
    annual: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_BASIC_ANNUAL || "#",
  },
  PREMIUM: {
    monthly: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_PREMIUM_MONTHLY || "#",
    annual: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_PREMIUM_ANNUAL || "#",
  },
  ULTRA: {
    monthly: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_ULTRA_MONTHLY || "#",
    annual: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_ULTRA_ANNUAL || "#",
  },
} as const

type Cycle = "monthly" | "annual"

export default function LandingPage() {
  const [cycle, setCycle] = useState<Cycle>("monthly")

  const pricing = useMemo(
    () => ([
      {
        tier: "Básico",
        code: "BASIC" as const,
        blurb: "Ideal para começar.",
        limit: "Até 1 profissional",
        features: [
          "Agendamento online 24/7",
          "Lembretes via WhatsApp",
          "Gestão de clientes (CRM)",
          "Relatórios essenciais",
        ],
      },
      {
        tier: "Premium",
        code: "PREMIUM" as const,
        blurb: "Para equipes em crescimento.",
        limit: "Até 3 profissionais",
        features: [
          "Tudo do Básico",
          "Agenda por profissional",
          "Bloqueios e intervalos",
          "Relatórios avançados",
        ],
      },
      {
        tier: "Ultra",
        code: "ULTRA" as const,
        blurb: "Para barbearias sem limites.",
        limit: "Profissionais ilimitados",
        features: [
          "Tudo do Premium",
          "Suporte prioritário",
          "Upsell inteligente",
          "Recursos ilimitados",
        ],
      },
    ]),
    []
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#18181b]/80 backdrop-blur-xl border-b border-[#27272a]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-tymer-primary to-tymer-primary/80 rounded-lg flex items-center justify-center shadow-lg shadow-tymer-primary/25">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-tymer-primary to-yellow-400 bg-clip-text text-transparent">
              TymerBook
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#a1a1aa]">
            <a href="#audience" className="hover:text-[#ededed]">Para quem é</a>
            <a href="#features" className="hover:text-[#ededed]">Funcionalidades</a>
            <a href="#pricing" className="hover:text-[#ededed]">Planos</a>
          </nav>
          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost" className="text-[#71717a] hover:text-[#ededed] hover:bg-[#3f3f46]/50">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-tymer-primary to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0">
                Cadastrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 md:pt-32 pb-16 px-4">
        <div className="container mx-auto text-center max-w-5xl">
          <Badge className="mb-6 bg-tymer-primary/15 text-tymer-primary border-tymer-primary/30">
            ✨ Nova era do agendamento inteligente
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            O Sistema de Agendamento que Trabalha por Você
          </h1>
          <p className="text-xl text-[#a1a1aa] mb-8">
            Automatize seus agendamentos, reduza as faltas em até 90% com lembretes via WhatsApp e tenha o controle
            total do seu faturamento em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-tymer-primary to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-lg px-8 py-6">
                Começar Agora (Teste Grátis por 7 dias)
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-[#3f3f46] text-[#ededed] hover:bg-[#27272a] text-lg px-8 py-6">
                Ver Funcionalidades
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Para quem é o TymerBook? */}
      <section id="audience" className="py-16 px-4 bg-tymer-card/50 border-y border-tymer-border">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Para quem é o TymerBook?</h2>
            <p className="text-gray-400 text-lg mt-2">Quebrando objeções para dois cenários reais</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="bg-tymer-card border-tymer-border p-6">
              <CardContent className="p-0">
                <h3 className="text-2xl font-semibold mb-3">Organize sua Agenda e Fidelize Clientes</h3>
                <p className="text-gray-400 leading-relaxed">
                  Elimine o caderno de papel, a desorganização e as mensagens manuais de confirmação. Centralize tudo
                  em um só sistema e ofereça uma experiência premium do agendamento ao pós-atendimento.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-tymer-card border-tymer-border p-6">
              <CardContent className="p-0">
                <h3 className="text-2xl font-semibold mb-3">Transforme Clientes de Passagem em Clientes Fixos</h3>
                <p className="text-gray-400 leading-relaxed">
                  Não trabalha com hora marcada? Perfeito. O TymerBook organiza seu fluxo. Disponibilize um QR Code no
                  balcão; o cliente que chegar pode ler e agendar o próximo horário vago na hora. Tenha controle total
                  de quem entra e sai, crie histórico e transforme clientes de passagem em uma base fiel com promoções
                  de reativação.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">Funcionalidades que impulsionam seu negócio</h2>
            <p className="text-gray-400 text-lg mt-2">Foco em benefícios reais para o dia a dia</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[ 
              { icon: Calendar, title: "Agendamento Online 24/7", desc: "Seus clientes agendam sozinhos, a qualquer hora, pelo seu link exclusivo." },
              { icon: MessageCircle, title: "Lembretes via WhatsApp", desc: "Reduza as faltas em até 90%. Nosso robô confirma e lembra seus clientes automaticamente." },
              { icon: Users, title: "Gestão de Clientes (CRM)", desc: "Conheça seus clientes. Histórico, preferências e total de gastos em um só lugar." },
              { icon: DollarSign, title: "Controle Financeiro", desc: "Saiba exatamente quanto você fatura por dia, por serviço e por profissional." },
              { icon: Clock, title: "Agenda Inteligente", desc: "Gerencie horários de múltiplos profissionais, com intervalos e bloqueios personalizados." },
              { icon: TrendingUp, title: "Upsell Inteligente (Sugestão)", desc: "Sugestões automáticas de serviços adicionais para aumentar o ticket médio." },
            ].map((f, i) => (
              <Card key={i} className="bg-tymer-card/30 border-tymer-border p-6 hover:bg-tymer-card/50 transition-colors">
                <CardContent className="p-0">
                  <div className="w-12 h-12 bg-tymer-primary/20 rounded-lg flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-tymer-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">{f.title}</h3>
                  <p className="text-gray-400">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planos e Preços */}
      <section id="pricing" className="py-20 px-4 bg-tymer-card/50 border-y border-tymer-border">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">Planos e Preços</h2>
            <p className="text-gray-400 text-lg mt-2">Escolha o plano ideal para o seu momento</p>
          </div>

          {/* Toggle Mensal/Anual */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center rounded-lg border border-[#3f3f46] bg-[#18181b] p-1">
              {(["monthly","annual"] as Cycle[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${cycle === c ? "bg-tymer-primary text-white" : "text-[#a1a1aa] hover:text-[#ededed]"}`}
                  aria-pressed={cycle === c}
                >
                  {c === "monthly" ? "Mensal" : "Anual"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.map((p) => {
              const href = CHECKOUT_LINKS[p.code][cycle]
              return (
                <Card key={p.code} className="bg-tymer-card border-tymer-border p-6 flex flex-col">
                  <CardContent className="p-0 flex flex-col flex-1">
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-semibold text-white">{p.tier}</h3>
                        <Badge variant="secondary" className="bg-tymer-primary/15 text-tymer-primary border-tymer-primary/30">
                          {cycle === "annual" ? "Anual" : "Mensal"}
                        </Badge>
                      </div>
                      <p className="text-gray-400 mt-1">{p.blurb}</p>
                      <p className="text-sm text-[#a1a1aa] mt-1">{p.limit}</p>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-300 mb-6">
                      {p.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-tymer-primary mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">
                      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
                        <Button className="w-full bg-gradient-to-r from-tymer-primary to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white">
                          Assinar Agora
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Prova Social */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">O que nossos clientes dizem</h2>
            <p className="text-gray-400 text-lg mt-2">Resultados reais de quem já transformou seu negócio</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
            ].map((t, i) => (
              <Card key={i} className="bg-tymer-card/30 border-tymer-border p-6">
                <CardContent className="p-0">
                  <div className="flex mb-4">
                    {Array.from({ length: t.rating }).map((_, k) => (
                      <Star key={k} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-4 italic">“{t.text}”</p>
                  <div>
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-sm text-gray-400">{t.business}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-gradient-to-r from-emerald-500/10 to-yellow-500/10">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto para transformar seu negócio?</h2>
          <p className="text-xl text-gray-400 mb-8">Configuração em minutos, suporte em português e resultados desde o primeiro dia.</p>
          <a href="#pricing">
            <Button size="lg" className="bg-gradient-to-r from-tymer-primary to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-lg px-8 py-6">
              Criar Minha Conta Agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
          <p className="text-sm text-gray-500 mt-4">✅ Sem cartão de crédito • ✅ Teste grátis por 7 dias • ✅ Cancelamento fácil</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-tymer-card border-t border-tymer-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-6 md:items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-tymer-primary to-tymer-primary/80 rounded-lg flex items-center justify-center">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-tymer-primary to-yellow-400 bg-clip-text text-transparent">
                TymerBook
              </span>
            </div>
            <div className="flex items-center gap-4 text-[#a1a1aa]">
              <a href="#" aria-label="Instagram" className="hover:text-[#ededed]"><Instagram className="w-5 h-5" /></a>
              <a href="#" aria-label="Facebook" className="hover:text-[#ededed]"><Facebook className="w-5 h-5" /></a>
              <a href="#" aria-label="Twitter" className="hover:text-[#ededed]"><Twitter className="w-5 h-5" /></a>
            </div>
            <div className="text-sm text-[#a1a1aa] flex gap-4">
              <a href="#" className="hover:text-[#ededed]">Política de Privacidade</a>
              <a href="#" className="hover:text-[#ededed]">Termos de Uso</a>
            </div>
          </div>
          <div className="text-[#71717a] text-sm mt-6">© {new Date().getFullYear()} TymerBook. Todos os direitos reservados.</div>
        </div>
      </footer>
    </div>
  )
}
