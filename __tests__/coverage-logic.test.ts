import { decideCoverage } from '../lib/coverage-logic'

describe('decideCoverage', () => {
  test('prioriza assinatura sobre pacote', () => {
    const out = decideCoverage({ hasActiveSubscriptionCoveringAll: true, hasEligiblePackageCombo: true, packageCreditsRemaining: 5 })
    expect(out.covered).toBe(true)
    if (out.covered) {
      expect(out.coveredBy).toBe('subscription')
    }
  })

  test('cobre por pacote quando não há assinatura', () => {
    const out = decideCoverage({ hasActiveSubscriptionCoveringAll: false, hasEligiblePackageCombo: true, packageCreditsRemaining: 2 })
    expect(out.covered).toBe(true)
    if (out.covered) {
      expect(out.coveredBy).toBe('package')
    }
  })

  test('não cobre quando não há opções', () => {
    const out = decideCoverage({ hasActiveSubscriptionCoveringAll: false, hasEligiblePackageCombo: false })
    expect(out.covered).toBe(false)
  })

  test('não cobre pacote com 0 créditos', () => {
    const out = decideCoverage({ hasActiveSubscriptionCoveringAll: false, hasEligiblePackageCombo: true, packageCreditsRemaining: 0 })
    expect(out.covered).toBe(false)
  })
})
