import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'DOCUMENTACAO_COMPLETA_USUARIO.md')
    const content = await fs.readFile(filePath, 'utf8')
    return NextResponse.json({ content })
  } catch (error) {
    return NextResponse.json({ error: 'Manual não encontrado' }, { status: 404 })
  }
}
