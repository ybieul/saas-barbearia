import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const CLEANUP_THRESHOLD_MINUTES = 5; // Tempo reduzido para limpeza agressiva
export async function cleanupOrphanedInstances() {
    console.log('🧹 [GC] Iniciando verificação de instâncias órfãs...');
    try {
        // Configuração da Evolution API
        const evolutionApiUrl = process.env.EVOLUTION_API_URL;
        const evolutionApiKey = process.env.EVOLUTION_API_KEY;
        if (!evolutionApiUrl || !evolutionApiKey) {
            console.error('❌ [GC] Configuração da Evolution API não encontrada');
            return;
        }
        console.log('🔗 [GC] Conectando com Evolution API:', evolutionApiUrl);
        // Buscar todas as instâncias da Evolution API
        const response = await fetch(`${evolutionApiUrl}/instance/all`, {
            method: 'GET',
            headers: {
                'apikey': evolutionApiKey,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(15000) // 15 segundos timeout
        });
        if (!response.ok) {
            throw new Error(`Evolution API retornou ${response.status}: ${response.statusText}`);
        }
        const instances = await response.json();
        if (!instances || instances.length === 0) {
            console.log('✅ [GC] Nenhuma instância encontrada na Evolution API.');
            return;
        }
        console.log(`📊 [GC] ${instances.length} instâncias encontradas na Evolution API. Verificando...`);
        let cleanedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        // Buscar todas as instâncias válidas do nosso banco de dados
        const validInstances = await prisma.tenant.findMany({
            where: {
                whatsapp_instance_name: {
                    not: null
                }
            },
            select: {
                id: true,
                whatsapp_instance_name: true
            }
        });
        const validInstanceNames = new Set(validInstances
            .filter(t => t.whatsapp_instance_name)
            .map(t => t.whatsapp_instance_name));
        console.log(`📋 [GC] ${validInstanceNames.size} instâncias válidas encontradas no banco de dados`);
        for (const instance of instances) {
            const instanceName = instance.instance.instanceName;
            const state = instance.state;
            console.log(`🔍 [GC] Verificando instância: ${instanceName} (Estado: ${state})`);
            // Pular instâncias conectadas (open)
            if (state === 'open') {
                console.log(`✅ [GC] Instância ${instanceName} está conectada - ignorando`);
                skippedCount++;
                continue;
            }
            // Verificar se a instância está registrada no nosso banco de dados
            if (validInstanceNames.has(instanceName)) {
                // Instância válida no banco - verificar se devemos limpar por tempo
                const tenant = validInstances.find(t => t.whatsapp_instance_name === instanceName);
                if (tenant && (state === 'connecting' || state === 'close')) {
                    console.log(`⏰ [GC] Instância válida mas não conectada: ${instanceName} (Estado: ${state})`);
                    // Para instâncias do banco que não estão conectadas, limpamos mais agressivamente
                    // pois sabemos que são legítimas mas abandonadas
                    try {
                        await cleanupInstance(instanceName, evolutionApiUrl, evolutionApiKey);
                        // Também limpar do banco de dados
                        await prisma.tenant.update({
                            where: { id: tenant.id },
                            data: {
                                whatsapp_instance_name: null
                            }
                        });
                        cleanedCount++;
                        console.log(`✅ [GC] Instância abandonada ${instanceName} removida e limpa do banco`);
                    }
                    catch (error) {
                        console.error(`❌ [GC] Erro ao limpar instância abandonada ${instanceName}:`, error);
                        errorCount++;
                    }
                }
                else {
                    console.log(`⏭️ [GC] Instância ${instanceName} é válida e será mantida`);
                    skippedCount++;
                }
            }
            else {
                // Instância órfã - não está no nosso banco de dados
                console.log(`🗑️ [GC] Instância órfã encontrada: ${instanceName} (Estado: ${state}). Removendo...`);
                try {
                    await cleanupInstance(instanceName, evolutionApiUrl, evolutionApiKey);
                    cleanedCount++;
                    console.log(`✅ [GC] Instância órfã ${instanceName} removida com sucesso`);
                }
                catch (error) {
                    console.error(`❌ [GC] Erro ao remover instância órfã ${instanceName}:`, error);
                    errorCount++;
                }
            }
        }
        // Relatório final
        console.log(`📈 [GC] Limpeza concluída:`);
        console.log(`   • Instâncias removidas: ${cleanedCount}`);
        console.log(`   • Instâncias mantidas: ${skippedCount}`);
        console.log(`   • Erros encontrados: ${errorCount}`);
        console.log(`   • Total processado: ${instances.length}`);
    }
    catch (error) {
        console.error('💥 [GC] Erro geral ao executar limpeza de instâncias:', error.message);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
async function cleanupInstance(instanceName, apiUrl, apiKey) {
    console.log(`🧹 [GC] Removendo instância: ${instanceName}`);
    const deleteResponse = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
    });
    if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const errorText = await deleteResponse.text().catch(() => 'Erro desconhecido');
        throw new Error(`Falha ao deletar instância ${instanceName}: ${deleteResponse.status} - ${errorText}`);
    }
    console.log(`✅ [GC] Instância ${instanceName} removida da Evolution API`);
}
// Função de teste para execução manual
export async function testGarbageCollector() {
    console.log('🧪 [GC-TEST] Executando teste do coletor de lixo...');
    try {
        await cleanupOrphanedInstances();
        console.log('✅ [GC-TEST] Teste concluído com sucesso');
    }
    catch (error) {
        console.error('❌ [GC-TEST] Teste falhou:', error);
    }
}
