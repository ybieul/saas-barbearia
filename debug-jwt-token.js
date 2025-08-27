// Script para testar a estrutura do JWT token
// Execute no console do navegador após fazer login

console.log("=== TESTE DE DEBUG DO TOKEN JWT ===")

// 1. Verificar se o token existe
const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
console.log("1. Token encontrado:", token ? "✅ Sim" : "❌ Não")

if (token) {
    console.log("2. Token (primeiros 50 caracteres):", token.substring(0, 50) + "...")
    
    // 3. Decodificar o payload do JWT (apenas para debug - não faça isso em produção)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        console.log("3. Payload do token:", payload)
        console.log("3.1. userId:", payload.userId)
        console.log("3.2. tenantId:", payload.tenantId)
        console.log("3.3. email:", payload.email)
        console.log("3.4. role:", payload.role)
        console.log("3.5. exp:", new Date(payload.exp * 1000))
    } catch (e) {
        console.error("Erro ao decodificar token:", e)
    }
}

// 4. Verificar dados do usuário no localStorage
const userData = localStorage.getItem('auth_user')
if (userData) {
    try {
        const user = JSON.parse(userData)
        console.log("4. Dados do usuário:", user)
        console.log("4.1. tenantId do user:", user.tenantId)
    } catch (e) {
        console.error("Erro ao parsear dados do usuário:", e)
    }
}

// 5. Fazer uma chamada de teste para a API de status
console.log("5. Fazendo chamada de teste para API...")
const testUser = userData ? JSON.parse(userData) : null
if (testUser?.tenantId && token) {
    fetch(`/api/tenants/${testUser.tenantId}/whatsapp/status`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log("5.1. Status da resposta:", response.status)
        console.log("5.2. Response OK:", response.ok)
        return response.json()
    })
    .then(data => {
        console.log("5.3. Dados da resposta:", data)
    })
    .catch(error => {
        console.error("5.4. Erro na chamada:", error)
    })
} else {
    console.log("5. ❌ Não foi possível fazer teste - dados insuficientes")
}

console.log("=== FIM DO TESTE ===")
