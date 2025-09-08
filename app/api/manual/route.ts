import { NextResponse } from 'next/server'
import { manualContent } from './manual-content'

export async function GET() {
  return NextResponse.json({ content: manualContent })
}
