import nodemailer from 'nodemailer'

// Configuração do transporter de email usando variáveis de ambiente
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outros
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

// Função para gerar senha segura
export function generateSecurePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  // Garantir pelo menos um caractere de cada tipo
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const special = '!@#$%^&*'
  
  password += lower[Math.floor(Math.random() * lower.length)]
  password += upper[Math.floor(Math.random() * upper.length)]
  password += digits[Math.floor(Math.random() * digits.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Completar com caracteres aleatórios
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Embaralhar a senha
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Utilitário para formatar nome de plano em português amigável
function formatPlanName(plan?: string): string {
    if (!plan) return 'Básico'
    const p = plan.toUpperCase()
    switch (p) {
        case 'PREMIUM': return 'Premium'
        case 'ULTRA': return 'Ultra'
        case 'BASIC': return 'Básico'
        case 'FREE': return 'Gratuito'
        default: return p.charAt(0) + p.slice(1).toLowerCase()
    }
}

function formatBrazilianDate(date?: Date): string | null {
    if (!date) return null
    try {
        return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    } catch {
        return date.toISOString().split('T')[0]
    }
}

// Template HTML para email de boas-vindas (agora inclui plano e expiração)
function getWelcomeEmailTemplate(name: string, email: string, temporaryPassword: string, plan?: string, subscriptionEnd?: Date) {
        const planDisplay = formatPlanName(plan)
        const expiryDisplay = formatBrazilianDate(subscriptionEnd)
    // Template com layout baseado em tabelas + botão bulletproof para maior compatibilidade (incluindo Outlook)
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Bem-vindo ao TymerBook</title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <style type="text/css">
        /* Resets básicos */
        body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
        table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
        img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
        table { border-collapse:collapse !important; }
        body { margin:0; padding:0; width:100% !important; background-color:#f5f5f5; }
        a { text-decoration:none; }
        /* Outlook força fontes: garantir fallback */
        .ExternalClass { width:100%; }
        .ExternalClass * { line-height:120%; }
        .apple-link a { color:inherit !important; text-decoration:none !important; }
    :root { color-scheme: light; supported-color-schemes: light; }
    /* Forçar textos brancos em dark-mode/Outlook.com */
    .force-white, .force-white a, .force-white span { color:#ffffff !important; }
    [data-ogsc] .force-white, [data-ogsc] .force-white a, [data-ogsc] .force-white span { color:#ffffff !important; }
    /* Subheading cinza claro sempre legível */
    .force-light { color:#e5e5e5 !important; }
    [data-ogsc] .force-light { color:#e5e5e5 !important; }
        @media screen and (max-width:600px){
            .container { width:100% !important; }
            .p-sm { padding:20px !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:Segoe UI, Arial, sans-serif;">
    <center style="width:100%; background-color:#f5f5f5;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
                <td align="center" style="padding:30px 10px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;">
                        <!-- Cabeçalho -->
                        <tr>
                            <td bgcolor="#4700FF" style="background:#4700FF; background:linear-gradient(90deg,#4700FF 0%, #6a32ff 100%); padding:32px 24px; text-align:center;">
                                <h1 class="force-white" style="margin:0; font-size:24px; line-height:1.3; color:#ffffff; font-weight:600; font-family:Segoe UI, Arial, sans-serif; mso-line-height-rule:exactly;"><span style="color:#ffffff !important;">Bem-vindo ao TymerBook</span></h1>
                                <p class="force-light" style="margin:8px 0 0; font-size:14px; color:#e5e5e5; font-family:Segoe UI, Arial, sans-serif; mso-line-height-rule:exactly;"><span style="color:#e5e5e5 !important;">Sua conta foi criada com sucesso</span></p>
                            </td>
                        </tr>
                        <!-- Conteúdo -->
                        <tr>
                            <td style="padding:32px 28px 8px; font-size:15px; line-height:1.55; color:#374151; font-family:Segoe UI, Arial, sans-serif;">
                                <p style="margin:0 0 16px;">Olá <strong style="color:#111827;">${name}</strong>,</p>
                                <p style="margin:0 0 16px;">Sua assinatura foi ativada e sua conta no TymerBook foi criada automaticamente. Abaixo estão suas credenciais temporárias de acesso:</p>
                            </td>
                        </tr>
                        <!-- Credenciais -->
                        <tr>
                            <td style="padding:0 28px 8px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fafc; border:1px solid #e2e8f0; border-radius:6px;">
                                    <tr>
                                        <td style="padding:16px 20px; font-family:Segoe UI, Arial, sans-serif;">
                                            <p style="margin:0 0 12px; font-size:14px; color:#1f2937; font-weight:600;">Credenciais de acesso</p>
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding:6px 0; font-size:13px; color:#374151; width:140px; font-weight:600;">Email:</td>
                                                    <td style="padding:6px 0; font-size:13px; color:#4b5563;">${email}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:6px 0; font-size:13px; color:#374151; font-weight:600;">Senha temporária:</td>
                                                    <td style="padding:6px 0; font-size:13px; color:#4b5563; font-family:Consolas, 'Courier New', monospace;">${temporaryPassword}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:6px 0; font-size:13px; color:#374151; font-weight:600;">Plano contratado:</td>
                                                    <td style="padding:6px 0; font-size:13px; color:#4b5563;">${planDisplay}</td>
                                                </tr>
                                                ${expiryDisplay ? `<tr>
                                                    <td style=\"padding:6px 0; font-size:13px; color:#374151; font-weight:600;\">Expira em:</td>
                                                    <td style=\"padding:6px 0; font-size:13px; color:#4b5563;\">${expiryDisplay}</td>
                                                </tr>` : ''}
                                            </table>
                                            <p style="margin:12px 0 0; font-size:12px; color:#6b7280;">Altere sua senha assim que acessar o painel.</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <!-- Botão -->
                        <tr>
                            <td align="center" style="padding:24px 28px 4px;">
                                <!--[if mso]>
                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/login" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="10%" fillcolor="#4700FF" stroke="f">
                                    <w:anchorlock/>
                                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Fazer Login Agora</center>
                                </v:roundrect>
                                <![endif]-->
                                <!--[if !mso]><!-- -->
                                <a href="${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/login" style="display:inline-block; background:#4700FF; background:linear-gradient(90deg,#4700FF 0%,#6a32ff 100%); color:#ffffff; font-family:Segoe UI, Arial, sans-serif; font-size:16px; font-weight:600; line-height:48px; text-align:center; text-decoration:none; width:260px; border-radius:6px; -webkit-text-size-adjust:none; mso-hide:all;" class="force-white"><span style="color:#ffffff !important;">Fazer Login Agora</span></a>
                                <!--<![endif]-->
                            </td>
                        </tr>
                        <!-- Próximos passos -->
                        <tr>
                            <td style="padding:28px 28px 8px; font-family:Segoe UI, Arial, sans-serif;">
                                <p style="margin:0 0 12px; font-size:15px; color:#111827; font-weight:600;">Próximos passos</p>
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px; color:#374151; line-height:1.5;">
                                    <tr><td style="padding:4px 0;">1. Faça login com as credenciais acima</td></tr>
                                    <tr><td style="padding:4px 0;">2. Altere sua senha nas configurações</td></tr>
                                    <tr><td style="padding:4px 0;">3. Complete as informações do seu negócio</td></tr>
                                    <tr><td style="padding:4px 0;">4. Adicione serviços e profissionais</td></tr>
                                    <tr><td style="padding:4px 0;">5. Comece a receber agendamentos</td></tr>
                                </table>
                            </td>
                        </tr>
                        <!-- Aviso -->
                        <tr>
                            <td style="padding:20px 28px 8px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef5e7; border-left:4px solid #f6ad55; border-radius:4px;">
                                    <tr>
                                        <td style="padding:12px 16px; font-size:12px; color:#8a6d3b; font-family:Segoe UI, Arial, sans-serif;">Por segurança, não compartilhe estas credenciais. O link deste email é exclusivo para você.</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <!-- Rodapé -->
                        <tr>
                            <td style="background:#f7fafc; padding:24px 20px; text-align:center; font-family:Segoe UI, Arial, sans-serif;">
                                <p style="margin:0 0 8px; font-size:12px; color:#6b7280;">Este é um email automático. Não responda.</p>
                                <p style="margin:0 0 8px; font-size:12px; color:#6b7280;">Suporte: <a href="mailto:suporte@tymerbook.com" style="color:#4700FF; font-weight:500;">suporte@tymerbook.com</a></p>
                                <p style="margin:12px 0 0; font-size:11px; color:#9ca3af;">© ${new Date().getFullYear()} TymerBook. Todos os direitos reservados.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`
}

// Função para enviar email de boas-vindas
export async function sendWelcomeEmail(
    name: string, 
    email: string, 
    temporaryPassword: string,
    plan?: string,
    subscriptionEnd?: Date
): Promise<boolean> {
  try {
    const transporter = createTransporter()
        const planDisplay = formatPlanName(plan)
        const expiryDisplay = formatBrazilianDate(subscriptionEnd)
    
    const mailOptions = {
      from: {
        name: 'TymerBook',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@tymerbook.com'
      },
      to: email,
      subject: '🎉 Bem-vindo ao TymerBook - Sua conta foi criada!',
            html: getWelcomeEmailTemplate(name, email, temporaryPassword, plan, subscriptionEnd),
      text: `
Bem-vindo ao TymerBook!

Olá ${name},

Sua assinatura foi ativada e sua conta foi criada automaticamente!

Credenciais de acesso:
- Email: ${email}
- Senha temporária: ${temporaryPassword}
 - Plano contratado: ${planDisplay}
${expiryDisplay ? ` - Expira em: ${expiryDisplay}` : ''}

Faça login em: ${process.env.NEXTAUTH_URL || 'https://app.tymerbook.com'}/login

IMPORTANTE: Altere sua senha assim que fizer o primeiro login por motivos de segurança.

Atenciosamente,
Equipe TymerBook
      `
    }

    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ Email de boas-vindas enviado com sucesso:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      to: email
    })
    
    return true
    
  } catch (error) {
    console.error('❌ Erro ao enviar email de boas-vindas:', error)
    return false
  }
}

// Função para testar configuração de email
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    console.log('✅ Configuração de email testada com sucesso')
    return true
  } catch (error) {
    console.error('❌ Erro na configuração de email:', error)
    return false
  }
}

// Template HTML para email de redefinição de senha
function getPasswordResetEmailTemplate(name: string, resetUrl: string) {
    return `<!DOCTYPE html>
<html lang=\"pt-BR\">
<head>
    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>
    <title>Redefinir Senha - TymerBook</title>
    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" />
    <style type=\"text/css\">
        body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
        table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
        img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
        table { border-collapse:collapse !important; }
        body { margin:0; padding:0; width:100% !important; background-color:#f5f5f5; }
        a { text-decoration:none; }
        .ExternalClass { width:100%; }
        .ExternalClass * { line-height:120%; }
    :root { color-scheme: light; supported-color-schemes: light; }
    .force-white, .force-white a, .force-white span { color:#ffffff !important; }
    [data-ogsc] .force-white, [data-ogsc] .force-white a, [data-ogsc] .force-white span { color:#ffffff !important; }
    .force-light { color:#e5e5e5 !important; }
    [data-ogsc] .force-light { color:#e5e5e5 !important; }
        @media screen and (max-width:600px){ .container { width:100% !important; } }
    </style>
</head>
<body style=\"margin:0; padding:0; background-color:#f5f5f5; font-family:Segoe UI, Arial, sans-serif;\">
    <center style=\"width:100%; background-color:#f5f5f5;\">
        <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\"> 
            <tr>
                <td align=\"center\" style=\"padding:30px 10px;\"> 
                    <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"600\" class=\"container\" style=\"width:600px; max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;\"> 
                        <tr>
                            <td bgcolor=\"#4700FF\" style=\"background:#4700FF; background:linear-gradient(90deg,#4700FF 0%, #6a32ff 100%); padding:32px 24px; text-align:center;\">
                                <h1 class=\"force-white\" style=\"margin:0; font-size:24px; line-height:1.3; color:#ffffff; font-weight:600; font-family:Segoe UI, Arial, sans-serif; mso-line-height-rule:exactly;\"><span style=\"color:#ffffff !important;\">Redefinir Senha</span></h1>
                                <p class=\"force-light\" style=\"margin:8px 0 0; font-size:14px; color:#e5e5e5; font-family:Segoe UI, Arial, sans-serif; mso-line-height-rule:exactly;\"><span style=\"color:#e5e5e5 !important;\">Solicitação de redefinição</span></p>
                            </td>
                        </tr>
                        <tr>
                            <td style=\"padding:32px 28px 8px; font-size:15px; line-height:1.55; color:#374151; font-family:Segoe UI, Arial, sans-serif;\">
                                <p style=\"margin:0 0 16px;\">Olá <strong style=\"color:#111827;\">${name}</strong>,</p>
                                <p style=\"margin:0 0 16px;\">Recebemos uma solicitação para redefinir sua senha no TymerBook. Se foi você, continue abaixo; caso contrário, ignore este email.</p>
                            </td>
                        </tr>
                        <tr>
                            <td align=\"center\" style=\"padding:16px 28px 4px;\">
                                <!--[if mso]>
                                <v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:w=\"urn:schemas-microsoft-com:office:word\" href=\"${resetUrl}\" style=\"height:48px;v-text-anchor:middle;width:260px;\" arcsize=\"10%\" fillcolor=\"#4700FF\" stroke=\"f\"> 
                                    <w:anchorlock/>
                                    <center style=\"color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;\">Redefinir Minha Senha</center>
                                </v:roundrect>
                                <![endif]-->
                                <!--[if !mso]><!-- -->
                                <a href=\"${resetUrl}\" style=\"display:inline-block; background:#4700FF; background:linear-gradient(90deg,#4700FF 0%,#6a32ff 100%); color:#ffffff; font-family:Segoe UI, Arial, sans-serif; font-size:16px; font-weight:600; line-height:48px; text-align:center; text-decoration:none; width:260px; border-radius:6px; -webkit-text-size-adjust:none; mso-hide:all;\" class=\"force-white\"><span style=\"color:#ffffff !important;\">Redefinir Minha Senha</span></a>
                                <!--<![endif]-->
                            </td>
                        </tr>
                        <tr>
                            <td style=\"padding:28px 28px 4px; font-family:Segoe UI, Arial, sans-serif;\">
                                <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#fef5e7; border-left:4px solid #f6ad55; border-radius:4px;\"> 
                                    <tr>
                                        <td style=\"padding:14px 16px; font-size:12px; line-height:1.45; color:#8a6d3b;\">
                                            <strong style=\"display:block; margin-bottom:4px;\">Importante:</strong>
                                            O link expira em 1 hora. Caso não tenha solicitado, nenhuma ação é necessária.
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style=\"padding:24px 28px 8px; font-size:13px; font-family:Segoe UI, Arial, sans-serif; color:#374151;\">
                                <p style=\"margin:0 0 8px; font-weight:600; color:#111827;\">Link alternativo</p>
                                <p style=\"margin:0; word-break:break-all; background:#f7fafc; padding:10px 12px; border-radius:4px; font-size:12px; line-height:1.4; color:#4700FF;\">${resetUrl}</p>
                            </td>
                        </tr>
                        <tr>
                            <td style=\"background:#f7fafc; padding:24px 20px; text-align:center; font-family:Segoe UI, Arial, sans-serif;\">
                                <p style=\"margin:0 0 8px; font-size:12px; color:#6b7280;\">Este é um email automático. Não responda.</p>
                                <p style=\"margin:0 0 8px; font-size:12px; color:#6b7280;\">Suporte: <a href=\"mailto:suporte@tymerbook.com\" style=\"color:#4700FF; font-weight:500;\">suporte@tymerbook.com</a></p>
                                <p style=\"margin:12px 0 0; font-size:11px; color:#9ca3af;\">© ${new Date().getFullYear()} TymerBook. Todos os direitos reservados.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`
}

// Função para enviar email de redefinição de senha
export async function sendPasswordResetEmail(
  name: string, 
  email: string, 
  resetToken: string
): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const resetUrl = `${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/redefinir-senha?token=${resetToken}`
    
    const mailOptions = {
      from: {
        name: 'TymerBook',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'suporte@tymerbook.com'
      },
      to: email,
      subject: '🔑 Redefinir Senha - TymerBook',
      html: getPasswordResetEmailTemplate(name, resetUrl),
      text: `
Redefinir Senha - TymerBook

Olá ${name},

Você solicitou a redefinição de sua senha no TymerBook.

Para redefinir sua senha, acesse o link abaixo:
${resetUrl}

IMPORTANTE:
- Este link é válido por 1 hora
- Se você não solicitou esta redefinição, ignore este email
- Por segurança, não compartilhe este link

Atenciosamente,
Equipe TymerBook
      `
    }

    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ Email de redefinição de senha enviado:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      to: email
    })
    
    return true
    
  } catch (error) {
    console.error('❌ Erro ao enviar email de redefinição:', error)
    return false
  }
}
