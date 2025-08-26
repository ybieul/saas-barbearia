/**
 * Utilitários para formatação de moeda brasileira
 */
/**
 * Formata um valor numérico como moeda brasileira (BRL)
 * @param value - Valor a ser formatado (pode ser number, string, null ou undefined)
 * @returns String formatada como moeda brasileira (ex: "R$ 25,50")
 */
export function formatCurrency(value) {
    // Converte o valor para número de forma segura
    const priceValue = Number(value) || 0;
    // Usa Intl.NumberFormat para formatação profissional de moeda
    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    return formatter.format(priceValue);
}
/**
 * Converte um valor para número de forma segura
 * @param value - Valor a ser convertido
 * @returns Número válido ou 0 se inválido
 */
export function safeNumber(value) {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
}
/**
 * Formata valor sem símbolo de moeda (apenas formatação decimal)
 * @param value - Valor a ser formatado
 * @returns String formatada (ex: "25,50")
 */
export function formatNumber(value) {
    const priceValue = Number(value) || 0;
    const formatter = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return formatter.format(priceValue);
}
