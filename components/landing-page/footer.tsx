import Link from "next/link"
import { Instagram, Facebook, Youtube, Linkedin } from "lucide-react"
import Logo from "@/components/logo"

export default function Footer() {
	const year = new Date().getFullYear()

	return (
		<footer id="footer" className="border-t border-border/60 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
				<div id="contato" className="h-0 scroll-mt-24" aria-hidden="true" />
				<div className="grid gap-10 sm:gap-12 md:grid-cols-3 lg:grid-cols-4">
					<div className="md:col-span-3 lg:col-span-2">
						<Link href="/" aria-label="Página inicial" className="inline-flex items-center gap-3">
							<Logo variant="full" className="w-auto h-8 sm:h-9" />
						</Link>
						<p className="mt-4 max-w-prose text-sm text-muted-foreground">
							A TymerBook simplifica o agendamento, fideliza clientes e ajuda seu negócio a crescer. Uma plataforma moderna, rápida e feita para a rotina de salões e profissionais de beleza.
						</p>
					</div>

					<nav aria-label="Páginas" className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground tracking-wide">Páginas</h3>
						<ul className="space-y-3 text-sm">
							<li>
								<Link className="text-muted-foreground transition-colors hover:text-foreground" href="#">Contato</Link>
							</li>
							<li>
								<Link className="text-muted-foreground transition-colors hover:text-foreground" href="#">Termos de uso</Link>
							</li>
							<li>
								<Link className="text-muted-foreground transition-colors hover:text-foreground" href="#">Política de privacidade</Link>
							</li>
							<li>
								<Link className="text-muted-foreground transition-colors hover:text-foreground" href="#pricing">Planos</Link>
							</li>
						</ul>
					</nav>

					<nav aria-label="Informações" className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground tracking-wide">Informações</h3>
						<ul className="space-y-3 text-sm">
							<li>
								<Link className="text-muted-foreground transition-colors hover:text-foreground" href="#beneficios">Benefícios</Link>
							</li>
							<li>
								<Link className="text-muted-foreground transition-colors hover:text-foreground" href="#pricing">Planos</Link>
							</li>
							<li>
								<Link className="text-muted-foreground transition-colors hover:text-foreground" href="#como-funciona">Como funciona</Link>
							</li>
							<li>
								<Link className="text-muted-foreground transition-colors hover:text-foreground" href="#faq">FAQ</Link>
							</li>
						</ul>
					</nav>
				</div>

				<div className="mt-10 flex flex-col-reverse items-start justify-between gap-6 border-t border-border/60 pt-8 sm:flex-row sm:items-center">
					<div>
						<p className="text-xs text-muted-foreground">© {year} TymerBook. Todos os direitos reservados.</p>
						<p className="mt-1 text-[10px] text-muted-foreground/80">Designed by Alejandro Grellier ©2025</p>
					</div>

					<div className="flex items-center gap-4">
						<a href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram da TymerBook" className="text-muted-foreground transition-colors hover:text-foreground">
							<Instagram className="h-5 w-5" />
						</a>
						<a href="#" target="_blank" rel="noopener noreferrer" aria-label="Facebook da TymerBook" className="text-muted-foreground transition-colors hover:text-foreground">
							<Facebook className="h-5 w-5" />
						</a>
						<a href="#" target="_blank" rel="noopener noreferrer" aria-label="YouTube da TymerBook" className="text-muted-foreground transition-colors hover:text-foreground">
							<Youtube className="h-5 w-5" />
						</a>
						<a href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn da TymerBook" className="text-muted-foreground transition-colors hover:text-foreground">
							<Linkedin className="h-5 w-5" />
						</a>
					</div>
				</div>
			</div>
		</footer>
	)
}

