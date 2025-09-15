/**
 * Substitui placeholders em templates de mensagem
 * 
 * @param template - Template com placeholders como [nome] e [customLink]
 * @param clientName - Nome do cliente para substituição
 * @param customLink - Link personalizado da barbearia (opcional)
 * @returns Template com placeholders substituídos
 */
export function replaceTemplatePlaceholders(template: string, clientName: string, customLink?: string): string {
  let result = template.replace(/\[nome\]/gi, clientName)
  
  if (customLink) {
    result = result.replace(/\[customLink\]/gi, customLink)
  }
  
  return result
}

/**
 * Processa um template para envio em massa
 * 
 * @param template - Template original
 * @param clients - Array de clientes com { name: string }
 * @param customLink - Link personalizado da barbearia (opcional)
 * @returns Array de mensagens personalizadas
 */
export function processTemplateForClients(
  template: string, 
  clients: Array<{ name: string }>,
  customLink?: string
): Array<{ clientName: string; message: string }> {
  return clients.map(client => ({
    clientName: client.name,
    message: replaceTemplatePlaceholders(template, client.name, customLink)
  }))
}

/**
 * Verifica se um template tem placeholders
 * 
 * @param template - Template para verificar
 * @returns true se contém placeholders
 */
export function hasPlaceholders(template: string): boolean {
  return /\[nome\]|\[customLink\]/gi.test(template)
}

/**
 * Lista todos os placeholders encontrados em um template
 * 
 * @param template - Template para analisar
 * @returns Array com todos os placeholders encontrados
 */
export function getPlaceholders(template: string): string[] {
  const matches = template.match(/\[[^\]]+\]/g)
  return matches ? [...new Set(matches)] : []
}
