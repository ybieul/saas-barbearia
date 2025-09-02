import { NextResponse } from 'next/server';

export async function GET() {
  const nextPublicVars: { [key: string]: string | undefined } = {};
  
  for (const key in process.env) {
    if (key.startsWith('NEXT_PUBLIC_')) {
      nextPublicVars[key] = process.env[key];
    }
  }

  // Retorna um JSON com todas as variáveis NEXT_PUBLIC_ encontradas
  return NextResponse.json({
    message: "Variáveis de ambiente NEXT_PUBLIC_ encontradas no servidor",
    variables: nextPublicVars,
    totalFound: Object.keys(nextPublicVars).length,
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV
  });
}
