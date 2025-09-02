import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/hooks/use-auth'

// Configuração da fonte Inter (principal)
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

// Configuração da fonte Poppins (secundária)
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

// Configuração da fonte Lufga (identidade visual TymerBook)
const lufga = localFont({
  src: [
    {
      path: '../public/fonts/Lufga-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Lufga-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/Lufga-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/Lufga-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-lufga',
})

export const metadata: Metadata = {
  title: 'TymerBook',
  description: 'TymerBook - A Plataforma de Agendamento Mais Completa do Brasil!',
  generator: 'gabale',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${poppins.variable} ${lufga.variable} font-lufga bg-tymer-bg text-tymer-text antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
