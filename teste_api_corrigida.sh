#!/bin/bash

# TESTE DA API APÓS CORREÇÕES
# ============================

# URL da API (ajuste conforme necessário)
API_URL="http://localhost:3000/api/public/appointments"

# Payload de teste
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "businessSlug": "rifados-vianna",
    "clientName": "Gabriel Barboza da Silva", 
    "clientPhone": "24981757110",
    "clientEmail": "biel782003@gmail.com",
    "professionalId": null,
    "serviceId": "cm40e58k0001jenobgn172s", 
    "services": [
      "cm40e58k0001jenobgn172s",
      "cmdkwvnobe0001jetmrvu45gy7",
      "cmdqvbc3r00001jezanmnmadf"
    ],
    "appointmentDateTime": "2025-08-04T15:00:00.000Z",
    "notes": "Teste de agendamento com upsells"
  }' \
  -w "\n\nStatus: %{http_code}\nTime: %{time_total}s\n"
