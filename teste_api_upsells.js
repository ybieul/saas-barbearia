// TESTE DA API COM UPSELLS - SCHEMA MYSQL
// =======================================

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
  appointmentDateTime: "2025-08-01T14:00:00.000Z", // 14:00 horário de Brasília
  notes: "Teste de agendamento com upsells"
}

// Comando curl para testar na produção
const curlCommand = `
curl -X POST https://rifadosvianna.com.br/api/public/appointments \\
  -H "Content-Type: application/json" \\
  -d '{
    "businessSlug": "rifados-vianna",
    "clientName": "Cliente Teste",
    "clientPhone": "11999999999",
    "clientEmail": "teste@teste.com",
    "professionalId": null,
    "serviceId": "clz123abc456",
    "services": [
      "clz123abc456",
      "clz789def012",
      "clz345ghi678"
    ],
    "appointmentDateTime": "2025-08-01T17:00:00.000Z",
    "notes": "Teste de agendamento com upsells"
  }'
`;

// Verificação no banco após criar agendamento
const verificacaoSQL = `
-- Verificar se o agendamento foi criado
SELECT * FROM appointments ORDER BY createdAt DESC LIMIT 1;

-- Verificar relacionamentos na tabela many-to-many
SELECT 
    a.id as appointment_id,
    a.dateTime,
    a.totalPrice,
    a.duration,
    s.name as service_name,
    s.price as service_price,
    s.duration as service_duration
FROM appointments a
JOIN _AppointmentToService ats ON a.id = ats.A
JOIN services s ON ats.B = s.id
ORDER BY a.createdAt DESC, s.name;
`;

// Resposta esperada da API:
const expectedResponse = {
  "message": "Agendamento criado com sucesso!",
  "appointment": {
    "id": "appointment-id",
    "dateTime": "2025-08-01T17:00:00.000Z",
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
    "totalServices": 3,        // ✅ Quantidade de serviços
    "totalDuration": 90,       // ✅ Soma de todas as durações
    "totalPrice": 150.00       // ✅ Soma de todos os preços
  }
};

console.log('Teste payload:', JSON.stringify(testPayload, null, 2));
console.log('\nComando curl:', curlCommand);
console.log('\nVerificação SQL:', verificacaoSQL);
console.log('\nResposta esperada:', JSON.stringify(expectedResponse, null, 2));
