export type CoverageInput = {
  hasActiveSubscriptionCoveringAll: boolean
  hasEligiblePackageCombo: boolean
  packageCreditsRemaining?: number
}

export type CoverageDecision =
  | { covered: true; coveredBy: 'subscription'; message?: string }
  | { covered: true; coveredBy: 'package'; creditsRemaining: number; message?: string }
  | { covered: false }

// Regras principais:
// - Se houver assinatura ativa que cubra todos os serviços, prioridade absoluta: cobre e zera preço.
// - Caso contrário, se houver pacote com combo exato e saldo > 0, cobre por pacote.
// - Caso contrário, não cobre.
export function decideCoverage(input: CoverageInput): CoverageDecision {
  if (input.hasActiveSubscriptionCoveringAll) {
    return { covered: true, coveredBy: 'subscription', message: 'Coberto pela assinatura ativa' }
  }
  if (input.hasEligiblePackageCombo && (input.packageCreditsRemaining || 0) > 0) {
    return { covered: true, coveredBy: 'package', creditsRemaining: input.packageCreditsRemaining || 0, message: 'Coberto por pacote com saldo' }
  }
  return { covered: false }
}
