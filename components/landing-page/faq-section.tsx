"use client";

import { SectionLayout } from "@/components/ui/section-layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ_ITEMS = [
	{ q: "O sistema é fácil de usar?", a: "Com certeza. A gente sabe que a rotina na barbearia é corrida. Por isso, a TymerBook foi criada para ser simples e intuitiva. A plataforma tem um visual limpo e direto, onde você encontra tudo o que precisa sem complicação." },
	{ q: "A TymerBook funciona no meu celular?", a: "Sim! A TymerBook é 100% responsiva e funciona perfeitamente em qualquer dispositivo: celular, tablet ou computador. Você pode gerenciar seu negócio de onde estiver, na palma da sua mão." },
	{ q: "Posso testar o sistema antes de assinar?", a: "Sim! Oferecemos um período de teste de 7 dias para você conhecer todas as funcionalidades da TymerBook. Caso se arrependa da compra, você tem 7 dias para pedir 100% do seu valor de volta." },
	{ q: "Posso usar o sistema para gerenciar mais de um barbeiro?", a: "Sim. O plano Premium/Ultra foram feitos para barbearias com equipes. Você pode adicionar os seus barbeiros e gerenciar suas agendas." },
	{ q: "O cliente precisa pagar ou baixar um aplicativo para agendar?", a: "Não. O agendamento para o cliente é totalmente gratuito e sem a necessidade de baixar nada. Ele apenas acessa o link exclusivo da sua barbearia, escolhe o serviço e o horário, e pronto. É fácil, rápido e profissional." },
	{ q: "Como faço para divulgar a minha página de agendamentos?", a: "Ao criar sua conta, A TymerBook gera um link personalizado para sua barbearia. Você pode compartilhar este link diretamente nas suas redes sociais, no seu perfil do Instagram, no WhatsApp ou em qualquer lugar que seus clientes estejam, de forma profissional e com a sua marca." },
];

export default function FaqSection() {
	return (
		<SectionLayout>
			<div id="faq" className="sr-only" aria-hidden="true" />
			<div className="grid gap-6 md:grid-cols-2 md:items-start">
				<h2 className="text-3xl md:text-4xl font-bold">Perguntas Frequentes (FAQ)</h2>
				<p className="text-muted-foreground">Se precisar de mais ajuda, entre em contato conosco.</p>
			</div>

			<div className="mt-8 rounded-2xl border border-border/60 bg-card p-2 sm:p-4">
				<Accordion type="single" collapsible className="w-full">
					{FAQ_ITEMS.map((item, i) => (
						<AccordionItem key={i} value={`item-${i}`}>
							<AccordionTrigger className="px-2 text-left">
								<div className="flex items-center gap-3">
									<span className="inline-grid place-items-center h-8 w-8 rounded-full bg-primary/15 text-primary text-xs font-semibold">{String(i + 1).padStart(2, "0")}</span>
									<span className="text-base font-medium">{item.q}</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-2">
								<p className="text-sm text-muted-foreground">{item.a}</p>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</SectionLayout>
	);
}

