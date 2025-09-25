export interface NewAppointmentNotificationProps {
  clientName: string
  professionalName: string
  services: string // Nomes dos serviços concatenados
  date: string // Data formatada
  time: string // Hora formatada
  totalPrice: string // Preço formatado
}

export const newAppointmentNotificationEmail = ({
  clientName,
  professionalName,
  services,
  date,
  time,
  totalPrice,
}: NewAppointmentNotificationProps): string => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #4700FF;">🎉 Novo Agendamento Recebido!</h2>
      <p>Olá! Você tem um novo agendamento na sua barbearia.</p>
      <hr>
      <h3>Detalhes do Agendamento:</h3>
      <ul>
        <li><strong>Cliente:</strong> ${clientName}</li>
        <li><strong>Serviços:</strong> ${services}</li>
        <li><strong>Profissional:</strong> ${professionalName}</li>
        <li><strong>Data:</strong> ${date}</li>
        <li><strong>Hora:</strong> ${time}</li>
        <li><strong>Valor Total:</strong> ${totalPrice}</li>
      </ul>
      <hr>
      <p>Pode ver mais detalhes acedendo à sua agenda no painel da TymerBook.</p>
      <p>Obrigado,<br>Equipa TymerBook</p>
    </div>
  `
}
