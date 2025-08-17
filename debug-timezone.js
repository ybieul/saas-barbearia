// Script de debug para verificar comportamento de timezone
console.log('=== DEBUG TIMEZONE - TESTE LOCAL ===')

// Simular o que acontece no servidor
const inputString = "2025-08-18 12:00:00"
console.log('String de entrada:', inputString)

// Método atual (parse manual)
const [datePart, timePart] = inputString.split(' ')
const [year, month, day] = datePart.split('-').map(Number)
const [hour, minute, second] = timePart.split(':').map(Number)

const dateLocal = new Date(year, month - 1, day, hour, minute, second)

console.log('Data criada com parse manual:', dateLocal)
console.log('toString():', dateLocal.toString())
console.log('toISOString():', dateLocal.toISOString())
console.log('getHours():', dateLocal.getHours())
console.log('getTimezoneOffset():', dateLocal.getTimezoneOffset())
console.log('getTime():', dateLocal.getTime())

// Comparar com método que causa problema
const dateProblem = new Date(inputString.replace(' ', 'T'))
console.log('\n=== COMPARAÇÃO COM MÉTODO PROBLEMÁTICO ===')
console.log('new Date(replace):', dateProblem)
console.log('toString():', dateProblem.toString())
console.log('toISOString():', dateProblem.toISOString())
console.log('getHours():', dateProblem.getHours())

console.log('\n=== INFORMAÇÕES DO SISTEMA ===')
console.log('Timezone atual:', Intl.DateTimeFormat().resolvedOptions().timeZone)
console.log('Offset atual (minutes):', new Date().getTimezoneOffset())
