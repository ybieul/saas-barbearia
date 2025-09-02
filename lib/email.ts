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

// Template HTML para email de boas-vindas
function getWelcomeEmailTemplate(name: string, email: string, temporaryPassword: string) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao TymerBook</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
            line-height: 1.6;
        }
        .welcome-message {
            font-size: 18px;
            color: #4a5568;
            margin-bottom: 20px;
        }
        .credentials-box {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .credential-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .credential-row:last-child {
            border-bottom: none;
        }
        .credential-label {
            font-weight: 600;
            color: #2d3748;
        }
        .credential-value {
            color: #4a5568;
            font-family: monospace;
            background-color: #edf2f7;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .warning-box {
            background-color: #fef5e7;
            border-left: 4px solid #f6ad55;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .footer {
            background-color: #f7fafc;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #718096;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bem-vindo ao TymerBook!</h1>
            <p>Sua conta foi criada com sucesso</p>
        </div>
        
        <div class="content">
            <div class="welcome-message">
                <p>Olá <strong>${name}</strong>,</p>
                <p>Sua assinatura foi ativada e sua conta no TymerBook foi criada automaticamente! Agora você pode começar a usar nossa plataforma para gerenciar seus agendamentos.</p>
            </div>
            
            <div class="credentials-box">
                <h3 style="margin-top: 0; color: #2d3748;">Suas credenciais de acesso:</h3>
                <div class="credential-row">
                    <span class="credential-label">Email:</span>
                    <span class="credential-value">${email}</span>
                </div>
                <div class="credential-row">
                    <span class="credential-label">Senha temporária:</span>
                    <span class="credential-value">${temporaryPassword}</span>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/login" class="cta-button">
                    Fazer Login Agora
                </a>
            </div>
            
            <div class="warning-box">
                <strong>⚠️ Importante:</strong> Por motivos de segurança, recomendamos que você faça login e altere sua senha assim que possível. Vá em Configurações → Alterar Senha após o primeiro acesso.
            </div>
            
            <h3>🚀 Próximos passos:</h3>
            <ul style="color: #4a5568;">
                <li><strong>Faça login</strong> com as credenciais acima</li>
                <li><strong>Altere sua senha</strong> para uma de sua preferência</li>
                <li><strong>Configure seu negócio</strong> nas configurações</li>
                <li><strong>Adicione seus serviços</strong> e profissionais</li>
                <li><strong>Comece a receber agendamentos</strong>!</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Este é um email automático. Não responda diretamente.</p>
            <p>
                Precisa de ajuda? Entre em contato: 
                <a href="mailto:suporte@tymerbook.com">suporte@tymerbook.com</a>
            </p>
            <p style="margin-top: 15px;">
                © ${new Date().getFullYear()} TymerBook. Todos os direitos reservados.
            </p>
        </div>
    </div>
</body>
</html>
  `
}

// Função para enviar email de boas-vindas
export async function sendWelcomeEmail(
  name: string, 
  email: string, 
  temporaryPassword: string
): Promise<boolean> {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: {
        name: 'TymerBook',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@tymerbook.com'
      },
      to: email,
      subject: '🎉 Bem-vindo ao TymerBook - Sua conta foi criada!',
      html: getWelcomeEmailTemplate(name, email, temporaryPassword),
      text: `
Bem-vindo ao TymerBook!

Olá ${name},

Sua assinatura foi ativada e sua conta foi criada automaticamente!

Credenciais de acesso:
- Email: ${email}
- Senha temporária: ${temporaryPassword}

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
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinir Senha - TymerBook</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
            line-height: 1.6;
        }
        .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 20px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .warning-box {
            background-color: #fef5e7;
            border-left: 4px solid #f6ad55;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .footer {
            background-color: #f7fafc;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #718096;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔑 Redefinir Senha</h1>
            <p>Solicitação de redefinição de senha</p>
        </div>
        
        <div class="content">
            <div class="message">
                <p>Olá <strong>${name}</strong>,</p>
                <p>Você solicitou a redefinição de sua senha no TymerBook. Clique no botão abaixo para criar uma nova senha:</p>
            </div>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="cta-button">
                    Redefinir Minha Senha
                </a>
            </div>
            
            <div class="warning-box">
                <strong>⚠️ Importante:</strong>
                <ul style="margin: 10px 0;">
                    <li>Este link é válido por <strong>1 hora</strong> após o envio</li>
                    <li>Se você não solicitou esta redefinição, ignore este email</li>
                    <li>Por segurança, não compartilhe este link com ninguém</li>
                </ul>
            </div>
            
            <div class="message">
                <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
                <p style="word-break: break-all; color: #667eea; background-color: #f7fafc; padding: 10px; border-radius: 4px;">
                    ${resetUrl}
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p>Este é um email automático. Não responda diretamente.</p>
            <p>
                Precisa de ajuda? Entre em contato: 
                <a href="mailto:suporte@tymerbook.com">suporte@tymerbook.com</a>
            </p>
            <p style="margin-top: 15px;">
                © ${new Date().getFullYear()} TymerBook. Todos os direitos reservados.
            </p>
        </div>
    </div>
</body>
</html>
  `
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
