import { prisma } from '../lib/prisma';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

interface EvolutionInstance {
  instance: {
    instanceName: string;
    instanceId?: string;
    status?: string;
  };
  status?: string;
}

export async function cleanupOrphanedInstances() {
  console.log('[GARBAGE-COLLECTOR] 🧹 Iniciando limpeza diária de instâncias órfãs...');
  
  try {
    // Verificar configuração da Evolution API
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error('[GARBAGE-COLLECTOR] ❌ Configuração da Evolution API não encontrada');
      return;
    }

    console.log(`[GARBAGE-COLLECTOR] 🔗 Conectando com Evolution API: ${EVOLUTION_API_URL}`);

    // 1. Buscar instâncias válidas do banco de dados
    const tenantsWithInstance = await prisma.tenant.findMany({
      where: { 
        whatsapp_instance_name: { not: null } 
      },
      select: { 
        id: true,
        businessName: true,
        whatsapp_instance_name: true 
      }
    });

    const validInstances = new Set(
      tenantsWithInstance
        .filter(t => t.whatsapp_instance_name)
        .map(t => t.whatsapp_instance_name!)
    );

    console.log(`[GARBAGE-COLLECTOR] 📊 Encontradas ${validInstances.size} instâncias válidas no banco de dados:`);
    tenantsWithInstance.forEach(tenant => {
      console.log(`[GARBAGE-COLLECTOR]   - ${tenant.whatsapp_instance_name} (${tenant.businessName})`);
    });

    // 2. Buscar todas as instâncias da Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/instance/all`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(30000) // 30 segundos timeout
    });

    if (!response.ok) {
      throw new Error(`Evolution API retornou ${response.status}: ${response.statusText}`);
    }

    const allEvolutionInstances: EvolutionInstance[] = await response.json();
    console.log(`[GARBAGE-COLLECTOR] 🔍 Encontradas ${allEvolutionInstances.length} instâncias na Evolution API.`);

    if (allEvolutionInstances.length === 0) {
      console.log('[GARBAGE-COLLECTOR] ✅ Nenhuma instância encontrada na Evolution API. Sistema limpo.');
      return;
    }

    // 3. Comparar e deletar instâncias órfãs
    let orphanCount = 0;
    let deletedCount = 0;
    let errorCount = 0;

    for (const evolutionInstance of allEvolutionInstances) {
      const instanceName = evolutionInstance.instance?.instanceName;
      
      if (!instanceName) {
        console.warn('[GARBAGE-COLLECTOR] ⚠️ Instância sem nome encontrada, pulando...');
        continue;
      }

      if (!validInstances.has(instanceName)) {
        orphanCount++;
        console.log(`[GARBAGE-COLLECTOR] 🗑️ Instância órfã encontrada: "${instanceName}". Removendo...`);
        
        try {
          const deleteResponse = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: {
              'apikey': EVOLUTION_API_KEY,
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(15000) // 15 segundos timeout
          });

          if (deleteResponse.ok) {
            deletedCount++;
            console.log(`[GARBAGE-COLLECTOR] ✅ Instância "${instanceName}" removida com sucesso.`);
          } else {
            errorCount++;
            console.error(`[GARBAGE-COLLECTOR] ❌ Falha ao remover instância "${instanceName}": ${deleteResponse.status} - ${deleteResponse.statusText}`);
          }
        } catch (deleteError: any) {
          errorCount++;
          console.error(`[GARBAGE-COLLECTOR] ❌ Erro ao remover instância "${instanceName}":`, deleteError.message);
        }

        // Aguardar um pouco entre deletions para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log(`[GARBAGE-COLLECTOR] ✅ Instância "${instanceName}" é válida - mantendo.`);
      }
    }

    // 4. Relatório final
    console.log('\n[GARBAGE-COLLECTOR] 📋 RELATÓRIO FINAL:');
    console.log(`[GARBAGE-COLLECTOR]   - Instâncias válidas no banco: ${validInstances.size}`);
    console.log(`[GARBAGE-COLLECTOR]   - Instâncias na Evolution API: ${allEvolutionInstances.length}`);
    console.log(`[GARBAGE-COLLECTOR]   - Instâncias órfãs encontradas: ${orphanCount}`);
    console.log(`[GARBAGE-COLLECTOR]   - Instâncias deletadas com sucesso: ${deletedCount}`);
    console.log(`[GARBAGE-COLLECTOR]   - Erros durante deleção: ${errorCount}`);

    if (orphanCount === 0) {
      console.log('[GARBAGE-COLLECTOR] 🎉 Nenhuma instância órfã encontrada. Sistema limpo!');
    } else if (deletedCount === orphanCount) {
      console.log('[GARBAGE-COLLECTOR] 🎉 Todas as instâncias órfãs foram removidas com sucesso!');
    } else if (deletedCount > 0) {
      console.log(`[GARBAGE-COLLECTOR] ⚠️ Limpeza parcial: ${deletedCount}/${orphanCount} instâncias órfãs removidas.`);
    } else {
      console.log('[GARBAGE-COLLECTOR] ❌ Nenhuma instância órfã pôde ser removida.');
    }

  } catch (error: any) {
    console.error('[GARBAGE-COLLECTOR] ❌ ERRO CRÍTICO durante limpeza de instâncias órfãs:', error.message);
    console.error('[GARBAGE-COLLECTOR] Stack trace:', error.stack);
  }

  console.log('[GARBAGE-COLLECTOR] 🏁 Limpeza diária finalizada.\n');
}
