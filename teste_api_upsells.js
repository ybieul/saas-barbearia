// TESTE DA API COM UPSELLS
// ========================

// Payload de teste para enviar à API
const testPayload = {
  businessSlug: "seu-slug-aqui",
  clientName: "Cliente Teste",
  clientPhone: "11999999999",
  clientEmail: "teste@teste.com",
  professionalId: null, // Qualquer profissional
  serviceId: "service-principal-id", // ID do serviço principal
  services: [
    "service-principal-id",    // Serviço principal
    "service-upsell1-id",      // Upsell 1
    "service-upsell2-id"       // Upsell 2
  ],
  appointmentDateTime: "2025-08-01T10:00:00.000Z",
  notes: "Teste de agendamento com upsells"
}

// Comando curl para testar
/*
curl -X POST https://rifadosvianna.com.br/api/public/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "businessSlug": "seu-slug-aqui",
    "clientName": "Cliente Teste",
    "clientPhone": "11999999999",
    "clientEmail": "teste@teste.com",
    "professionalId": null,
    "serviceId": "service-principal-id",
    "services": [
      "service-principal-id",
      "service-upsell1-id",
      "service-upsell2-id"
    ],
    "appointmentDateTime": "2025-08-01T10:00:00.000Z",
    "notes": "Teste de agendamento com upsells"
  }'
*/

// Resposta esperada:
/*
{
  "message": "Agendamento criado com sucesso!",
  "appointment": {
    "id": "appointment-id",
    "dateTime": "2025-08-01T10:00:00.000Z",
    "client": {
      "id": "client-id",
      "name": "Cliente Teste",
      "phone": "11999999999"
    },
    "service": {
      "id": "service-principal-id",
      "name": "Corte de Cabelo"
    },
    "professional": {
      "id": "prof-id",
      "name": "João Barbeiro"
    },
    "status": "CONFIRMED",
    "totalServices": 3,
    "totalDuration": 90,  // soma de todos os serviços
    "totalPrice": 150.00  // soma de todos os serviços
  }
}
*/

console.log('Teste payload:', JSON.stringify(testPayload, null, 2))
