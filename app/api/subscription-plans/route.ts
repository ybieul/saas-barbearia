import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequired } from '@/lib/api-utils'
import { verifyToken, AuthError } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

// tenantId vem do token

export async function GET(request: NextRequest) {
  try {
    console.log('[subscription-plans][GET] Iniciando listagem de planos')
    const user = verifyToken(request)
    const tenantId = user.tenantId
    if (!tenantId) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 })

    // Tenta incluir serviços normalmente; se falhar (ex.: delegate ausente ou join table indisponível), usa fallbacks
    try {
      console.log('[subscription-plans][GET] Tentando via Prisma com include de serviços...')
      const plans = await prisma.subscriptionPlan.findMany({
        where: { tenantId },
        include: { services: { select: { id: true, name: true } }, _count: { select: { clientSubscriptions: true } } },
        orderBy: { createdAt: 'desc' }
      })
      console.log('[subscription-plans][GET] Sucesso via Prisma. planos=', plans.length)
      return NextResponse.json({ plans })
    } catch (err: unknown) {
      console.warn('[subscription-plans][GET] Falha via Prisma include. Caindo no fallback 1. err=', err)
      const msg = err instanceof Error ? err.message : ''
      try {
        // Fallback 1: listar sem include via delegate
        const plans: any[] = await prisma.subscriptionPlan.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
        console.log('[subscription-plans][GET] Fallback 1: listados', plans.length, 'planos; enriquecendo serviços via SQL...')
        // Tentar enriquecer com serviços via SQL
        const ids = plans.map(p => p.id)
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',')
          const svcRows = await prisma.$queryRawUnsafe<Array<{ planId: string, id: string, name: string }>>(
            `SELECT link.B as planId, s.id, s.name FROM _ServiceToSubscriptionPlan link JOIN services s ON s.id = link.A WHERE link.B IN (${placeholders})`,
            ...ids
          )
          console.log('[subscription-plans][GET] Fallback 1: serviços retornados via SQL=', svcRows.length)
          const byPlan = new Map<string, Array<{ id: string, name: string }>>()
          for (const r of svcRows) {
            const arr = byPlan.get(r.planId) || []
            arr.push({ id: r.id, name: r.name })
            byPlan.set(r.planId, arr)
          }
          for (const p of plans) {
            p.services = byPlan.get(p.id) || []
          }
        }
        console.log('[subscription-plans][GET] Fallback 1: retorno com serviços agregados')
        return NextResponse.json({ plans, warning: 'Planos listados sem include de serviços (fallback). Motivo: ' + (msg || 'falha ao carregar serviços.') })
      } catch {
        console.warn('[subscription-plans][GET] Fallback 1 falhou. Partindo para fallback 2 (SQL bruto).')
        // Fallback 2: delegate ausente — usar SQL bruto
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT id, name, price, cycleInDays, isActive, createdAt, updatedAt
          FROM subscription_plans
          WHERE tenantId = ${tenantId}
          ORDER BY createdAt DESC
        `
        console.log('[subscription-plans][GET] Fallback 2: planos via SQL bruto =', rows.length)
        if (rows.length > 0) {
          const ids = rows.map(r => r.id)
          const placeholders = ids.map(() => '?').join(',')
          const svcRows = await prisma.$queryRawUnsafe<Array<{ planId: string, id: string, name: string }>>(
            `SELECT link.B as planId, s.id, s.name FROM _ServiceToSubscriptionPlan link JOIN services s ON s.id = link.A WHERE link.B IN (${placeholders})`,
            ...ids
          )
          console.log('[subscription-plans][GET] Fallback 2: serviços via SQL bruto =', svcRows.length)
          const byPlan = new Map<string, Array<{ id: string, name: string }>>()
          for (const r of svcRows) {
            const arr = byPlan.get(r.planId) || []
            arr.push({ id: r.id, name: r.name })
            byPlan.set(r.planId, arr)
          }
          for (const p of rows as any[]) {
            p.services = byPlan.get(p.id) || []
          }
        }
        console.log('[subscription-plans][GET] Fallback 2: retorno com serviços agregados (SQL bruto)')
        return NextResponse.json({ plans: rows, warning: 'Listagem via SQL bruto (delegate Prisma indisponível).' })
      }
    }
  } catch (error: any) {
    const msg = error?.message || ''
    console.error('[subscription-plans][GET] Erro fatal:', msg, error)
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ message: error.message || 'Erro ao listar planos' }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[subscription-plans][POST] Iniciando criação de plano')
    const user = verifyToken(request)
    const body = await request.json()
    console.log('[subscription-plans][POST] Body recebido:', body)
    const missing = validateRequired(body, ['name', 'price', 'cycleInDays'])
    if (missing) return NextResponse.json({ message: missing }, { status: 400 })

    const tenantId = user.tenantId
    if (!tenantId) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 })

    const serviceIds: string[] = Array.isArray(body.services) ? body.services.filter(Boolean) : []
    console.log('[subscription-plans][POST] serviceIds válidos:', serviceIds)
    // Garantir que os serviços pertençam ao tenant
    let connectServices: { id: string }[] | undefined
    if (serviceIds.length > 0) {
      const valid = await prisma.service.findMany({ where: { id: { in: serviceIds }, tenantId }, select: { id: true } })
      console.log('[subscription-plans][POST] serviços validados do tenant=', valid.map(v => v.id))
      if (valid.length === 0) return NextResponse.json({ message: 'Nenhum serviço válido encontrado para este tenant' }, { status: 400 })
      connectServices = valid.map(s => ({ id: s.id }))
    }

    try {
      // 1) Cria o plano básico
      let plan = await prisma.subscriptionPlan.create({
        data: {
          name: body.name,
          price: body.price,
          cycleInDays: body.cycleInDays,
          isActive: body.isActive ?? true,
          tenantId,
        },
      })
      console.log('[subscription-plans][POST] Plano criado (Prisma):', plan.id)
      // 2) Tenta vincular serviços (passo separado para evitar derrubar a criação)
      if (connectServices && connectServices.length > 0) {
        try {
          plan = await prisma.subscriptionPlan.update({
            where: { id: plan.id },
            data: { services: { connect: connectServices } },
            include: { services: true }
          })
          console.log('[subscription-plans][POST] Serviços conectados via Prisma:', connectServices.length)
          return NextResponse.json({ plan })
        } catch (linkErr: any) {
          console.warn('[subscription-plans][POST] Falhou conectar serviços via Prisma. Tentando SQL bruto. err=', linkErr?.message)
          // Tentar vincular via SQL bruto (caso delegate/join table não esteja configurado no Prisma Client)
          try {
            for (const s of connectServices) {
              await prisma.$executeRawUnsafe(
                'INSERT IGNORE INTO _ServiceToSubscriptionPlan (A, B) VALUES (?, ?)',
                s.id,
                plan.id
              )
            }
            console.log('[subscription-plans][POST] Serviços vinculados via SQL bruto com sucesso')
            // Enriquecer com serviços após inserir via SQL
            const svcRows = await prisma.$queryRaw<Array<{ id: string, name: string }>>`
              SELECT s.id, s.name FROM _ServiceToSubscriptionPlan link JOIN services s ON s.id = link.A WHERE link.B = ${plan.id}
            `
            return NextResponse.json({ plan: { ...plan, services: svcRows }, warning: 'Serviços vinculados via SQL bruto (fallback). Recomenda-se aplicar a migration e regenerar o Prisma.' }, { status: 201 })
          } catch (sqlErr) {
            console.error('[subscription-plans][POST] Falhou ao vincular via SQL bruto:', sqlErr)
            const warn = 'Plano criado, mas os serviços não foram vinculados. Verifique se a migração da tabela de junção está aplicada e tente editar o plano para adicionar os serviços.'
            return NextResponse.json({ plan, warning: warn }, { status: 201 })
          }
        }
      }
      return NextResponse.json({ plan })
    } catch (err: any) {
      const msg = err?.message || ''
      console.warn('[subscription-plans][POST] Falha ao criar via Prisma. Tentando SQL bruto. err=', msg)
      // Fallback quando delegate/tabela indisponível: usar SQL bruto para inserir o plano e pular vinculação
      const id = randomUUID()
      await prisma.$executeRaw`
        INSERT INTO subscription_plans (id, name, price, cycleInDays, isActive, createdAt, updatedAt, tenantId)
        VALUES (${id}, ${body.name}, ${body.price}, ${body.cycleInDays}, ${body.isActive ?? true}, NOW(), NOW(), ${tenantId})
      `
      const plan = { id, name: body.name, price: body.price, cycleInDays: body.cycleInDays, isActive: body.isActive ?? true }
      console.log('[subscription-plans][POST] Plano criado via SQL bruto:', id)
      // Tentar vincular serviços via SQL bruto se informados
      if (connectServices && connectServices.length > 0) {
        try {
          for (const s of connectServices) {
            await prisma.$executeRawUnsafe(
              'INSERT IGNORE INTO _ServiceToSubscriptionPlan (A, B) VALUES (?, ?)',
              s.id,
              id
            )
          }
          console.log('[subscription-plans][POST] Serviços vinculados (SQL bruto) para plano:', id)
          const svcRows = await prisma.$queryRaw<Array<{ id: string, name: string }>>`
            SELECT s.id, s.name FROM _ServiceToSubscriptionPlan link JOIN services s ON s.id = link.A WHERE link.B = ${id}
          `
          return NextResponse.json({ plan: { ...plan, services: svcRows }, warning: 'Plano criado via SQL bruto; serviços vinculados via SQL. Recomenda-se aplicar a migration e regenerar o Prisma.' }, { status: 201 })
        } catch (sqlErr) {
          console.error('[subscription-plans][POST] Falha ao vincular serviços (SQL bruto). err=', sqlErr)
          return NextResponse.json({ plan, warning: 'Plano criado via SQL bruto (delegate Prisma indisponível). Serviços não foram vinculados.' }, { status: 201 })
        }
      }
      return NextResponse.json({ plan, warning: 'Plano criado via SQL bruto (delegate Prisma indisponível). Sem serviços vinculados.' }, { status: 201 })
    }
  } catch (error: any) {
    const msg = error?.message || ''
    console.error('[subscription-plans][POST] Erro fatal:', msg, error)
    // Não retornar 503 aqui — a criação já tem fallback
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ message: msg || 'Erro ao criar plano' }, { status })
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('[subscription-plans][PUT] Iniciando atualização de plano')
    const user = verifyToken(request)
    const body = await request.json()
    console.log('[subscription-plans][PUT] Body recebido:', body)
    const missing = validateRequired(body, ['id'])
    if (missing) return NextResponse.json({ message: missing }, { status: 400 })

    const { id, name, price, cycleInDays, isActive, services } = body

    let servicesSet: { id: string }[] | undefined
    if (Array.isArray(services)) {
      const valid = await prisma.service.findMany({ where: { id: { in: services }, tenantId: user.tenantId }, select: { id: true } })
      console.log('[subscription-plans][PUT] Serviços válidos para set:', valid.map(v => v.id))
      servicesSet = valid.map(s => ({ id: s.id }))
    }

    try {
      const plan = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(price !== undefined && { price }),
          ...(cycleInDays !== undefined && { cycleInDays }),
          ...(isActive !== undefined && { isActive }),
          ...(servicesSet ? { services: { set: servicesSet } } : {}),
        },
        include: { services: true },
      })
      console.log('[subscription-plans][PUT] Plano atualizado via Prisma:', id)
      return NextResponse.json({ plan })
    } catch (err: any) {
      const msg = err?.message || ''
      console.warn('[subscription-plans][PUT] Falhou via Prisma. Tentando SQL bruto. err=', msg)
      // Fallback: usar SQL bruto para atualizar campos básicos quando delegate/tabela indisponível
      const sets: string[] = []
      const params: any[] = []
      if (name !== undefined) { sets.push('name = ?'); params.push(name) }
      if (price !== undefined) { sets.push('price = ?'); params.push(price) }
      if (cycleInDays !== undefined) { sets.push('cycleInDays = ?'); params.push(cycleInDays) }
      if (isActive !== undefined) { sets.push('isActive = ?'); params.push(isActive ? 1 : 0) }
      sets.push('updatedAt = NOW()')
      const sql = `UPDATE subscription_plans SET ${sets.join(', ')} WHERE id = ?`
      params.push(id)
      await prisma.$executeRawUnsafe(sql, ...params)
      console.log('[subscription-plans][PUT] Plano atualizado via SQL bruto:', id)
      const plan = { id, name, price, cycleInDays, isActive }
      // Se serviços foram enviados, tentar regravar via SQL bruto
      if (Array.isArray(services) && services.length > 0) {
        try {
          await prisma.$executeRaw`DELETE FROM _ServiceToSubscriptionPlan WHERE B = ${id}`
          const valid = await prisma.service.findMany({ where: { id: { in: services }, tenantId: user.tenantId }, select: { id: true } })
          for (const s of valid) {
            await prisma.$executeRawUnsafe('INSERT IGNORE INTO _ServiceToSubscriptionPlan (A, B) VALUES (?, ?)', s.id, id)
          }
          console.log('[subscription-plans][PUT] Serviços regravados via SQL bruto:', services.length)
          const svcRows = await prisma.$queryRaw<Array<{ id: string, name: string }>>`
            SELECT s.id, s.name FROM _ServiceToSubscriptionPlan link JOIN services s ON s.id = link.A WHERE link.B = ${id}
          `
          return NextResponse.json({ plan: { ...plan, services: svcRows }, warning: 'Plano atualizado via SQL bruto; serviços regravados via SQL.' })
        } catch {
          console.warn('[subscription-plans][PUT] Falha ao regravar serviços via SQL bruto')
          return NextResponse.json({ plan, warning: 'Plano atualizado via SQL bruto. Não foi possível alterar serviços (fallback).' })
        }
      }
      return NextResponse.json({ plan, warning: 'Plano atualizado via SQL bruto (delegate Prisma/join table indisponível). Serviços não foram alterados.' })
    }
  } catch (error: any) {
    const msg = error?.message || ''
    console.error('[subscription-plans][PUT] Erro fatal:', msg, error)
    // Não retornar 503 no PUT; já há fallback
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ message: msg || 'Erro ao atualizar plano' }, { status })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('[subscription-plans][DELETE] Iniciando remoção de plano')
    verifyToken(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'id é obrigatório' }, { status: 400 })

    try {
      await prisma.subscriptionPlan.delete({ where: { id } })
      console.log('[subscription-plans][DELETE] Removido via Prisma:', id)
      return NextResponse.json({ success: true })
    } catch {
      // Fallback: SQL bruto
      await prisma.$executeRaw`DELETE FROM subscription_plans WHERE id = ${id}`
      console.log('[subscription-plans][DELETE] Removido via SQL bruto:', id)
      return NextResponse.json({ success: true, warning: 'Remoção via SQL bruto (delegate Prisma indisponível).' })
    }
  } catch (error: any) {
    console.error('[subscription-plans][DELETE] Erro fatal:', error?.message, error)
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ message: error?.message || 'Erro ao remover plano' }, { status })
  }
}
