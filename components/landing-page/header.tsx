"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface HeaderProps {
	className?: string;
}

export default function Header({ className }: HeaderProps) {
	const [open, setOpen] = useState(false);

	return (
		<header
			className={cn(
				"fixed top-0 left-0 right-0 z-50 border-b border-border/40",
				"bg-background/80 backdrop-blur-sm",
				className
			)}
		>
			<div className="container mx-auto h-16 px-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Link href="/" aria-label="Ir para início" className="flex items-center gap-2">
						<Logo variant="full" className="w-36 sm:w-40" />
					</Link>
				</div>

				<nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
					<a href="#sobre" className="hover:text-foreground">Sobre</a>
					<a href="#beneficios" className="hover:text-foreground">Benefícios</a>
					<a href="#depoimentos" className="hover:text-foreground">Depoimentos</a>
					<a href="#faq" className="hover:text-foreground">FAQ</a>
				</nav>

				<div className="hidden sm:flex items-center gap-3">
					<a href="#contato">
						<Button variant="secondary" className="rounded-full">Contato</Button>
					</a>
					<Link href="/login">
						<Button className="rounded-full">Entrar</Button>
					</Link>
				</div>

				{/* Mobile trigger (opcional) */}
				<button
					className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-border/50"
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
					aria-controls="mobile-nav"
				>
					<span className="sr-only">Abrir menu</span>
					<div className="i-[hamburger] w-5 h-5" />
				</button>
			</div>

			{/* Mobile nav (simples) */}
			{open && (
				<div id="mobile-nav" className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-sm">
					<div className="container mx-auto px-4 py-3 flex flex-col gap-3 text-sm">
						<a href="#sobre" onClick={() => setOpen(false)}>Sobre</a>
						<a href="#beneficios" onClick={() => setOpen(false)}>Benefícios</a>
						<a href="#depoimentos" onClick={() => setOpen(false)}>Depoimentos</a>
						<a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
						<div className="flex gap-3 pt-2">
							<a href="#contato" className="flex-1">
								<Button variant="secondary" className="w-full rounded-full">Contato</Button>
							</a>
							<Link href="/login" className="flex-1">
								<Button className="w-full rounded-full">Entrar</Button>
							</Link>
						</div>
					</div>
				</div>
			)}
		</header>
	);
}


