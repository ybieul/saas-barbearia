import type { Config } from "tailwindcss";

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			inter: ['var(--font-inter)', 'Inter', 'sans-serif'],
  			poppins: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
  			sans: ['var(--font-lufga)', 'sans-serif'],
  		},
  		colors: {
  			// Nova identidade visual TymerBook
  			'tymer-bg': '#111112',        // Fundo principal
  			'tymer-card': '#18181A',      // Fundo dos cards
  			'tymer-sidebar': '#212124',   // Fundo da barra lateral
  			'tymer-primary': '#4700FF',   // Cor primária/acento (roxo)
  			'tymer-text': '#FFFFFF',      // Texto principal
  			'tymer-muted': '#888888',     // Textos secundários
  			'tymer-border': '#27272a',    // Bordas
  			'tymer-accent': '#10b981',    // Verde de sucesso (mantido para compatibilidade)
			'tymer-icon': '#9d9d9d',      // Cinza para os ícones
			'tymer-textgray': '#9d9d9d',  // Cinza para os textos
			'tymer-balon': '#373737',     // Cinza dos balões
  			
  			// Cores semânticas padrão com valores fixos TymerBook
  			background: '#111112',        // Fundo padrão (tymer-bg)
  			foreground: '#FFFFFF',        // Texto padrão branco
  			card: {
  				DEFAULT: '#18181A',         // Cards (tymer-card)
  				foreground: '#FFFFFF'       // Texto nos cards - branco
  			},
  			
			// balon: bg-tymer-balon text-tymer-textgray border-tymer-textgray/30
			// balão de concluido: "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
			// balão de confirmado: "bg-blue-500/10 text-blue-400 border-blue-500/20"

			// gradiente cinza para containers: "bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 rounded-lg p-4 space-y-3 shadow-lg">
			// gradiente roxo para containers: bg-gradient-to-r from-tymer-primary/15 to-tymer-primary/5 border border-tymer-primary/30 rounded-xl p-6 mb-6 text-left animate-slide-up animate-delay-600"

  			// Cores padrão do shadcn/ui (mantidas para compatibilidade)
  			// background: 'hsl(var(--background))',
  			// foreground: 'hsl(var(--foreground))',
  			// card: {
  			// 	DEFAULT: 'hsl(var(--card))',
  			// 	foreground: 'hsl(var(--card-foreground))'
  			// },
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
			primary: {
				// Força uso do roxo TymerBook independente de variáveis antigas
				DEFAULT: '#4700FF',
				foreground: '#FFFFFF'
			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
