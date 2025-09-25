"use client"

import Image from "next/image"
import SectionLayout from "@/components/ui/section-layout"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const IMG_DASHBOARD = "/placeholder.jpg"
const IMG_FLUXO_CAIXA = "/placeholder.jpg"
const IMG_WHATSAPP = "/placeholder.jpg"
const IMG_UPSELL = "/placeholder.jpg"

type CardProps = {
	src: string
	title: string
	description: string
	className?: string
}

function FloatingCard({ src, title, description, className }: CardProps) {
	return (
		<motion.div
			className={cn(
				"relative rounded-xl border border-border/60 bg-card/60 p-3 shadow-sm backdrop-blur",
				"supports-[backdrop-filter]:bg-card/50",
				className
			)}
			initial={{ opacity: 0, y: 16, scale: 0.98 }}
			whileInView={{ opacity: 1, y: 0, scale: 1 }}
			viewport={{ once: true, amount: 0.3 }}
			transition={{ duration: 0.5 }}
		>
			<div className="overflow-hidden rounded-lg">
				<Image src={src} alt={title} width={640} height={360} className="h-auto w-full object-cover" />
			</div>
			<div className="mt-3">
				<h4 className="text-sm font-semibold text-foreground">{title}</h4>
				<p className="mt-1 text-xs text-muted-foreground">{description}</p>
			</div>
			<div className="pointer-events-none absolute -inset-1 -z-10 rounded-xl bg-gradient-to-b from-primary/10 to-transparent blur opacity-0 transition-opacity duration-300 hover:opacity-100" aria-hidden />
		</motion.div>
	)
}

export default function BusinessGrowthSection() {
	return (
		<SectionLayout className="relative">
			<div id="beneficios" className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-12">
				<div>
					<motion.h2
						className="font-lufga text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, amount: 0.3 }}
						transition={{ duration: 0.5 }}
					>
						Veja o seu negócio crescer, em tempo real.
					</motion.h2>
					<motion.p
						className="mt-4 max-w-prose text-base text-muted-foreground"
						initial={{ opacity: 0, y: 16 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, amount: 0.3 }}
						transition={{ duration: 0.5, delay: 0.05 }}
					>
						A TymerBook te dá todas as ferramentas para gerenciar seu negócio e alcançar seus objetivos de forma simples e intuitiva.
					</motion.p>

					<div className="relative mt-8">
						<div className="pointer-events-none absolute -inset-6 rounded-2xl bg-primary/10 blur-2xl" aria-hidden />
						<motion.div
							className={cn(
								"group relative rounded-2xl border border-border/60 bg-card/60 p-2 shadow-md backdrop-blur",
								"supports-[backdrop-filter]:bg-card/50",
								"[perspective:1200px]"
							)}
							initial={{ opacity: 0, y: 24 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, amount: 0.3 }}
							transition={{ duration: 0.6 }}
						>
							<div className={cn("relative overflow-hidden rounded-xl transition-transform duration-300","[transform:rotateY(-5deg)_rotateX(1deg)] group-hover:scale-[1.03]")}> 
								<Image src={IMG_DASHBOARD} alt="Dashboard TymerBook" width={1200} height={720} className="h-auto w-full object-cover" priority />
							</div>
						</motion.div>
						<div className="pointer-events-none absolute -bottom-8 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-background" aria-hidden />
					</div>
				</div>

				<div className="relative">
					<div className="relative z-10 space-y-8">
						<FloatingCard src={IMG_FLUXO_CAIXA} title="Visão geral do fluxo de caixa" description="Acompanhe sua receita diária, semanal e mês a mês. Tenha clareza total sobre o fluxo do caixa." className="md:ml-10 lg:ml-16 xl:ml-20 shadow-lg -rotate-[0.5deg]" />
						<FloatingCard src={IMG_WHATSAPP} title="Integração com WhatsApp" description="Integre seu número ao WhatsApp (via TymerBook) e estruture a forma como você se comunica com seus clientes." className="-mt-14 md:-mt-16 md:ml-2 lg:ml-6 xl:ml-10 shadow-lg rotate-[0.4deg]" />
						<FloatingCard src={IMG_UPSELL} title="Upsell" description="Ofereça serviços e produtos adicionais no agendamento, aumentando o valor de cada atendimento sem esforço." className="-mt-14 md:-mt-16 md:ml-14 lg:ml-20 xl:ml-28 shadow-lg -rotate-[0.6deg]" />
					</div>
					<div className="pointer-events-none absolute -inset-x-6 -bottom-6 top-6 rounded-3xl bg-black/15 blur-3xl dark:bg-white/10" aria-hidden />
				</div>
			</div>
		</SectionLayout>
	)
}

