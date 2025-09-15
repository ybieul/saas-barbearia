import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// DELETE - Deletar uma exceção/bloqueio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { exceptionId: string } }
) {
  try {
    const user = verifyToken(request)
    const exceptionId = params.exceptionId

    // Buscar a exceção para validar propriedade
    const exception = await prisma.scheduleException.findFirst({
      where: {
        id: exceptionId
      },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            tenantId: true
          }
        }
      }
    })

    if (!exception) {
      return NextResponse.json(
        { error: 'Bloqueio não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o profissional pertence ao tenant do usuário
    if (exception.professional.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Deletar a exceção
    await prisma.scheduleException.delete({
      where: {
        id: exceptionId
      }
    })

    return NextResponse.json({
      message: 'Bloqueio deletado com sucesso',
      deletedId: exceptionId
    })

  } catch (error) {
    console.error('Erro ao deletar exceção:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
