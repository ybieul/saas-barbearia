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
      <p>Pode ver mais detalhes acessando a sua agenda no painel da TymerBook.</p>
      <p>Obrigado,<br>Equipe TymerBook</p>
    </div>
  `
}

// ===============
// Boas-vindas TRIAL
// ===============
export interface WelcomeTrialEmailProps {
  tenantName: string // Nome do dono da barbearia
}

export const welcomeTrialEmail = ({
  tenantName
}: WelcomeTrialEmailProps): string => {
  const dashboardUrl = `${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/dashboard`
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h1 style="color: #4700FF; text-align: center;">Bem-vindo ao TymerBook, ${tenantName}!</h1>
      <p>Estamos muito felizes por ter você a bordo para o seu teste gratuito de 15 dias.</p>
      <p>Você acaba de dar o primeiro passo para profissionalizar a gestão da sua barbearia, automatizar a sua agenda e aumentar o seu faturamento.</p>
      
      <h3 style="color: #333;">O que fazer agora?</h3>
      <p>Para aproveitar ao máximo o seu teste, o seu próximo passo é simples:</p>
      <ol>
        <li>Acesse o seu painel TymerBook.</li>
        <li>Vá até a secção <strong>"Configurações"</strong>.</li>
        <li>Siga as instruções do nosso <strong>Manual do Usuário</strong> para configurar os seus serviços, profissionais e horários.</li>
      </ol>
      <p>Em menos de 10 minutos, a sua barbearia estará pronta para receber agendamentos online!</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${dashboardUrl}" style="background-color: #4700FF; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Acessar o meu Painel
        </a>
      </div>
      <p style="margin-top: 30px; font-size: 0.9em; color: #777;">Se tiver qualquer dúvida, a nossa equipe de suporte está à disposição.</p>
      <p style="font-size: 0.9em; color: #777;">Equipe TymerBook</p>
    </div>
  `
}
