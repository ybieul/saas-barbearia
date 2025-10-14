"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecurePassword = generateSecurePassword;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendTrialWelcomeEmail = sendTrialWelcomeEmail;
exports.sendTrialReminderEmail = sendTrialReminderEmail;
exports.sendTrialExpiredMissYouEmail = sendTrialExpiredMissYouEmail;
exports.testEmailConfiguration = testEmailConfiguration;
exports.sendSubscriptionExpiredEmail = sendSubscriptionExpiredEmail;
exports.sendGenericNoticeEmail = sendGenericNoticeEmail;
exports.sendSubscriptionPreExpireEmail = sendSubscriptionPreExpireEmail;
exports.sendSubscriptionCanceledEmail = sendSubscriptionCanceledEmail;
exports.sendEmail = sendEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Configuração do transporter de email usando variáveis de ambiente
const createTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outros
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};
// Função para gerar senha segura
function generateSecurePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    // Garantir pelo menos um caractere de cada tipo
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    password += lower[Math.floor(Math.random() * lower.length)];
    password += upper[Math.floor(Math.random() * upper.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += special[Math.floor(Math.random() * special.length)];
    // Completar com caracteres aleatórios
    for (let i = 4; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    // Embaralhar a senha
    return password.split('').sort(() => Math.random() - 0.5).join('');
}
// Utilitário para formatar nome de plano em português amigável
function formatPlanName(plan) {
    if (!plan)
        return 'Básico';
    const p = plan.toUpperCase();
    switch (p) {
        case 'PREMIUM': return 'Premium';
        case 'ULTRA': return 'Ultra';
        case 'BASIC': return 'Básico';
        case 'FREE': return 'Gratuito';
        default: return p.charAt(0) + p.slice(1).toLowerCase();
    }
}
function formatBrazilianDate(date) {
    if (!date)
        return null;
    try {
        return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
    catch (_a) {
        return date.toISOString().split('T')[0];
    }
}
// Template HTML para email de boas-vindas (agora inclui plano e expiração)
function getWelcomeEmailTemplate(name, email, temporaryPassword, plan, subscriptionEnd) {
    const planDisplay = formatPlanName(plan);
    const expiryDisplay = formatBrazilianDate(subscriptionEnd);
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
</html>`;
}
// Função para enviar email de boas-vindas
function sendWelcomeEmail(name, email, temporaryPassword, plan, subscriptionEnd) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transporter = createTransporter();
            const planDisplay = formatPlanName(plan);
            const expiryDisplay = formatBrazilianDate(subscriptionEnd);
            const mailOptions = {
                from: {
                    name: 'TymerBook',
                    address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@tymerbook.com'
                },
                to: email,
                subject: '🎉 Bem-vindo ao TymerBook - Sua conta foi criada!',
                html: getWelcomeEmailTemplate(name, email, temporaryPassword, plan, subscriptionEnd),
                text: `Bem-vindo ao TymerBook!\n\nOlá ${name},\n\nSua assinatura foi ativada e sua conta foi criada automaticamente!\n\nCredenciais de acesso:\n• Email: ${email}\n• Senha temporária: ${temporaryPassword}\n• Plano contratado: ${planDisplay}${expiryDisplay ? `\n• Expira em: ${expiryDisplay}` : ''}\nPainel: ${(process.env.NEXTAUTH_URL || 'https://tymerbook.com')}/login\n\nIMPORTANTE:\n• Altere a senha no primeiro acesso (Configurações > Alterar Senha).\n• Não compartilhe a senha temporária.\n• Abra o Manual do Usuário em Configurações para concluir a configuração.\n• Cadastre profissionais, serviços e horários antes de liberar agendamentos.\n\nAtenciosamente,\nEquipe TymerBook`
            };
            const info = yield transporter.sendMail(mailOptions);
            console.log('✅ Email de boas-vindas enviado com sucesso:', {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
                to: email
            });
            return true;
        }
        catch (error) {
            console.error('❌ Erro ao enviar email de boas-vindas:', error);
            return false;
        }
    });
}
// Função para enviar email de boas-vindas ao trial (15 dias grátis)
function sendTrialWelcomeEmail(name, email, temporaryPassword, subscriptionEnd) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transporter = createTransporter();
            const expiryDisplay = formatBrazilianDate(subscriptionEnd);
            const loginUrl = `${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/login`;
            const mailOptions = {
                from: {
                    name: 'TymerBook',
                    address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@tymerbook.com'
                },
                to: email,
                subject: '🎉 Bem-vindo ao TymerBook - 15 dias GRÁTIS de teste!',
                html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin:0; padding:0; background-color:#f5f5f5; font-family:Segoe UI, Arial, sans-serif; }
        .container { max-width:600px; margin:0 auto; background:#ffffff; }
        .header { background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:40px 20px; text-align:center; }
        .content { padding:40px 30px; }
        .badge { display:inline-block; background:#10b981; color:#ffffff; padding:8px 16px; border-radius:20px; font-weight:bold; margin:10px 0; }
        .credentials { background:#f9fafb; border-left:4px solid #667eea; padding:20px; margin:20px 0; }
        .button { display:inline-block; background:#667eea; color:#ffffff; padding:14px 30px; text-decoration:none; border-radius:6px; font-weight:bold; margin:20px 0; }
        .footer { background:#f9fafb; padding:20px; text-align:center; color:#6b7280; font-size:14px; }
        .highlight { color:#667eea; font-weight:bold; }
        .warning { background:#fef3c7; border-left:4px solid #f59e0b; padding:15px; margin:20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color:#ffffff; margin:0; font-size:32px;">🎉 Bem-vindo ao TymerBook!</h1>
            <p style="color:#e5e5e5; margin:10px 0 0 0; font-size:18px;">Sua conta trial foi criada com sucesso</p>
        </div>
        
        <div class="content">
            <p style="font-size:18px; color:#1f2937;">Olá <strong>${name}</strong>,</p>
            
            <p style="font-size:16px; color:#4b5563; line-height:1.6;">
                Parabéns! Você acaba de iniciar seu <span class="badge">TESTE GRÁTIS DE 15 DIAS</span> com acesso completo a todos os recursos do <strong>Plano Ultra</strong> do TymerBook! 🚀
            </p>

            <div class="credentials">
                <h3 style="margin-top:0; color:#1f2937;">🔑 Suas credenciais de acesso:</h3>
                <p style="margin:8px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin:8px 0;"><strong>Senha temporária:</strong> <code style="background:#e5e7eb; padding:4px 8px; border-radius:4px; font-family:monospace;">${temporaryPassword}</code></p>
                <p style="margin:8px 0;"><strong>Período de teste até:</strong> ${expiryDisplay}</p>
            </div>

            <center>
                <a href="${loginUrl}" class="button">Acessar minha conta agora</a>
            </center>

            <div class="warning">
                <strong>⚠️ IMPORTANTE:</strong>
                <ul style="margin:10px 0; padding-left:20px;">
                    <li>Altere sua senha no primeiro acesso (Configurações → Alterar Senha)</li>
                    <li>Não compartilhe sua senha temporária com ninguém</li>
                    <li>Você tem <strong>15 dias</strong> para testar TODOS os recursos gratuitamente</li>
                    <li>Sem compromisso! Não pedimos cartão de crédito</li>
                </ul>
            </div>

            <h3 style="color:#1f2937;">🎯 Próximos passos para começar:</h3>
            <ol style="color:#4b5563; line-height:1.8;">
                <li>Faça login no painel administrativo</li>
                <li>Cadastre seus profissionais e serviços</li>
                <li>Configure os horários de atendimento</li>
                <li>Personalize seu link de agendamento</li>
                <li>Comece a receber agendamentos automaticamente!</li>
            </ol>

            <p style="font-size:16px; color:#4b5563; line-height:1.6; margin-top:30px;">
                Durante o período de teste, você terá acesso a:
            </p>
            <ul style="color:#4b5563; line-height:1.8;">
                <li>✅ Profissionais ilimitados</li>
                <li>✅ Clientes ilimitados</li>
                <li>✅ Agendamentos ilimitados</li>
                <li>✅ WhatsApp integrado</li>
                <li>✅ Notificações automáticas</li>
                <li>✅ Relatórios e estatísticas</li>
                <li>✅ Suporte técnico completo</li>
            </ul>

            <p style="font-size:16px; color:#4b5563; line-height:1.6; margin-top:30px;">
                Aproveite ao máximo seu período de teste! Se tiver qualquer dúvida, estamos aqui para ajudar. 💜
            </p>
        </div>
        
        <div class="footer">
            <p style="margin:5px 0;">© 2025 TymerBook - Sistema de Agendamento Online</p>
            <p style="margin:5px 0;">Este é um email automático, não responda.</p>
        </div>
    </div>
</body>
</html>`,
                text: `🎉 Bem-vindo ao TymerBook - 15 dias GRÁTIS de teste!\n\nOlá ${name},\n\nParabéns! Você acaba de iniciar seu TESTE GRÁTIS DE 15 DIAS com acesso completo ao Plano Ultra!\n\n🔑 Suas credenciais de acesso:\n• Email: ${email}\n• Senha temporária: ${temporaryPassword}\n• Período de teste até: ${expiryDisplay}\n\nAcesse agora: ${loginUrl}\n\n⚠️ IMPORTANTE:\n• Altere sua senha no primeiro acesso (Configurações → Alterar Senha)\n• Você tem 15 dias para testar TODOS os recursos gratuitamente\n• Sem compromisso! Não pedimos cartão de crédito\n\n🎯 Próximos passos:\n1. Faça login no painel\n2. Cadastre seus profissionais e serviços\n3. Configure os horários de atendimento\n4. Personalize seu link de agendamento\n5. Comece a receber agendamentos!\n\nDurante o teste você terá:\n✅ Profissionais ilimitados\n✅ Clientes ilimitados\n✅ Agendamentos ilimitados\n✅ WhatsApp integrado\n✅ Notificações automáticas\n✅ Relatórios e estatísticas\n✅ Suporte técnico completo\n\nAproveite!\nEquipe TymerBook`
            };
            const info = yield transporter.sendMail(mailOptions);
            console.log('✅ Email de boas-vindas TRIAL enviado:', {
                messageId: info.messageId,
                to: email
            });
            return true;
        }
        catch (error) {
            console.error('❌ Erro ao enviar email de boas-vindas trial:', error);
            return false;
        }
    });
}
// Função para enviar lembretes de trial (dia 13 e dia 15)
function sendTrialReminderEmail(name, email, daysLeft) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transporter = createTransporter();
            const pricingUrl = `${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/dashboard/assinatura`;
            const isLastDay = daysLeft <= 0;
            const isTwoDays = daysLeft === 2;
            let subject = '';
            let emoji = '';
            let urgencyColor = '';
            if (isLastDay) {
                subject = '⏰ ÚLTIMO DIA do seu teste grátis no TymerBook!';
                emoji = '⏰';
                urgencyColor = '#dc2626';
            }
            else if (isTwoDays) {
                subject = '⚠️ Faltam apenas 2 dias para seu teste grátis acabar!';
                emoji = '⚠️';
                urgencyColor = '#f59e0b';
            }
            else {
                subject = `⏳ Faltam ${daysLeft} dias para seu teste grátis acabar`;
                emoji = '⏳';
                urgencyColor = '#f59e0b';
            }
            const mailOptions = {
                from: {
                    name: 'TymerBook',
                    address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@tymerbook.com'
                },
                to: email,
                subject: subject,
                html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin:0; padding:0; background-color:#f5f5f5; font-family:Segoe UI, Arial, sans-serif; }
        .container { max-width:600px; margin:0 auto; background:#ffffff; }
        .header { background:${urgencyColor}; padding:40px 20px; text-align:center; }
        .content { padding:40px 30px; }
        .countdown { background:#fef3c7; border:3px solid ${urgencyColor}; padding:20px; text-align:center; margin:30px 0; border-radius:8px; }
        .button { display:inline-block; background:#667eea; color:#ffffff; padding:16px 40px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:18px; margin:20px 0; }
        .footer { background:#f9fafb; padding:20px; text-align:center; color:#6b7280; font-size:14px; }
        .benefit { background:#f0fdf4; border-left:4px solid #10b981; padding:15px; margin:15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color:#ffffff; margin:0; font-size:36px;">${emoji} ${isLastDay ? 'ÚLTIMO DIA!' : isTwoDays ? 'Faltam 2 dias!' : `Faltam ${daysLeft} dias`}</h1>
            <p style="color:#ffffff; margin:10px 0 0 0; font-size:18px;">Seu teste grátis está acabando</p>
        </div>
        
        <div class="content">
            <p style="font-size:18px; color:#1f2937;">Olá <strong>${name}</strong>,</p>
            
            <div class="countdown">
                <h2 style="margin:0; color:${urgencyColor}; font-size:48px;">${daysLeft <= 0 ? 'HOJE' : daysLeft}</h2>
                <p style="margin:10px 0 0 0; font-size:18px; color:#1f2937;">
                    ${isLastDay ? 'Seu teste acaba HOJE!' : isTwoDays ? 'dias restantes de teste grátis' : 'dias restantes'}
                </p>
            </div>

            <p style="font-size:16px; color:#4b5563; line-height:1.6;">
                ${isLastDay
                    ? 'Hoje é o <strong>último dia</strong> do seu período de teste grátis de 15 dias! Não perca acesso a todos os recursos que você vem utilizando.'
                    : isTwoDays
                        ? 'Seu período de teste grátis de 15 dias está chegando ao fim. Faltam apenas <strong>2 dias</strong> para você perder acesso a todos os recursos!'
                        : `Seu teste grátis acaba em breve. Não perca o acesso aos recursos que você está usando!`}
            </p>

            <h3 style="color:#1f2937;">💎 Continue aproveitando:</h3>
            <div class="benefit">
                <p style="margin:5px 0; color:#1f2937;">✅ Profissionais e clientes ilimitados</p>
            </div>
            <div class="benefit">
                <p style="margin:5px 0; color:#1f2937;">✅ Agendamentos automáticos via WhatsApp</p>
            </div>
            <div class="benefit">
                <p style="margin:5px 0; color:#1f2937;">✅ Notificações automáticas e lembretes</p>
            </div>
            <div class="benefit">
                <p style="margin:5px 0; color:#1f2937;">✅ Relatórios e estatísticas completas</p>
            </div>

            <center>
                <p style="font-size:18px; color:#1f2937; margin:30px 0 10px 0;">
                    <strong>Assine agora e garanta acesso vitalício!</strong>
                </p>
                <a href="${pricingUrl}" class="button">Ver planos e assinar</a>
                <p style="font-size:14px; color:#6b7280; margin:10px 0;">
                    Planos a partir de R$ 29,90/mês
                </p>
            </center>

            <p style="font-size:16px; color:#4b5563; line-height:1.6; margin-top:40px;">
                Ainda tem dúvidas? Nossa equipe está pronta para ajudar! 💜
            </p>
        </div>
        
        <div class="footer">
            <p style="margin:5px 0;">© 2025 TymerBook - Sistema de Agendamento Online</p>
            <p style="margin:5px 0;">Este é um email automático, não responda.</p>
        </div>
    </div>
</body>
</html>`,
                text: `${emoji} ${subject}\n\nOlá ${name},\n\n${isLastDay ? 'Hoje é o ÚLTIMO DIA do seu teste grátis!' : isTwoDays ? 'Faltam apenas 2 DIAS para seu teste grátis acabar!' : `Faltam ${daysLeft} dias para seu teste acabar.`}\n\nNão perca acesso a:\n✅ Profissionais e clientes ilimitados\n✅ Agendamentos automáticos via WhatsApp\n✅ Notificações automáticas e lembretes\n✅ Relatórios e estatísticas completas\n\nAssine agora: ${pricingUrl}\nPlanos a partir de R$ 29,90/mês\n\nEquipe TymerBook`
            };
            const info = yield transporter.sendMail(mailOptions);
            console.log(`✅ Email de lembrete trial (${daysLeft} dias) enviado:`, {
                messageId: info.messageId,
                to: email
            });
            return true;
        }
        catch (error) {
            console.error('❌ Erro ao enviar email de lembrete trial:', error);
            return false;
        }
    });
}
// Função para enviar email "sentimos sua falta" 2 dias após expiração
function sendTrialExpiredMissYouEmail(name, email) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transporter = createTransporter();
            const pricingUrl = `${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/dashboard/assinatura`;
            const mailOptions = {
                from: {
                    name: 'TymerBook',
                    address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@tymerbook.com'
                },
                to: email,
                subject: '💔 Sentimos sua falta no TymerBook...',
                html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin:0; padding:0; background-color:#f5f5f5; font-family:Segoe UI, Arial, sans-serif; }
        .container { max-width:600px; margin:0 auto; background:#ffffff; }
        .header { background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:40px 20px; text-align:center; }
        .content { padding:40px 30px; }
        .special-offer { background:#fef3c7; border:3px dashed #f59e0b; padding:25px; text-align:center; margin:30px 0; border-radius:8px; }
        .button { display:inline-block; background:#10b981; color:#ffffff; padding:16px 40px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:18px; margin:20px 0; }
        .footer { background:#f9fafb; padding:20px; text-align:center; color:#6b7280; font-size:14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color:#ffffff; margin:0; font-size:32px;">💔 Sentimos sua falta!</h1>
            <p style="color:#e5e5e5; margin:10px 0 0 0; font-size:18px;">Seu teste grátis expirou</p>
        </div>
        
        <div class="content">
            <p style="font-size:18px; color:#1f2937;">Olá <strong>${name}</strong>,</p>
            
            <p style="font-size:16px; color:#4b5563; line-height:1.6;">
                Notamos que seu período de teste grátis de 15 dias expirou e você ainda não assinou o TymerBook. 😢
            </p>

            <p style="font-size:16px; color:#4b5563; line-height:1.6;">
                Sabemos o quanto é importante ter um sistema de agendamentos eficiente para seu negócio, e queremos que você volte a ter acesso a todos os recursos que estava usando!
            </p>

            <div class="special-offer">
                <h2 style="margin:0 0 15px 0; color:#1f2937;">🎁 Oferta Especial para Você!</h2>
                <p style="margin:0; font-size:18px; color:#4b5563;">
                    Assine agora e volte a ter acesso completo aos recursos que você estava aproveitando durante seu teste.
                </p>
            </div>

            <h3 style="color:#1f2937;">💎 Você vai recuperar:</h3>
            <ul style="color:#4b5563; line-height:1.8;">
                <li>✅ Todos os seus dados salvos (profissionais, clientes, serviços)</li>
                <li>✅ Agendamentos ilimitados</li>
                <li>✅ WhatsApp integrado com notificações automáticas</li>
                <li>✅ Relatórios e estatísticas em tempo real</li>
                <li>✅ Suporte técnico prioritário</li>
            </ul>

            <center>
                <a href="${pricingUrl}" class="button">Reativar minha conta agora</a>
                <p style="font-size:14px; color:#6b7280; margin:10px 0;">
                    Planos a partir de R$ 29,90/mês • Sem compromisso
                </p>
            </center>

            <p style="font-size:16px; color:#4b5563; line-height:1.6; margin-top:40px;">
                Estamos aqui para ajudar você a crescer! Se tiver alguma dúvida ou precisar de ajuda, é só responder este email. 💜
            </p>

            <p style="font-size:14px; color:#6b7280; margin-top:30px; font-style:italic;">
                P.S.: Seus dados estão seguros e salvos. Quando você assinar, tudo volta exatamente como estava!
            </p>
        </div>
        
        <div class="footer">
            <p style="margin:5px 0;">© 2025 TymerBook - Sistema de Agendamento Online</p>
            <p style="margin:5px 0;">Este é um email automático, não responda.</p>
        </div>
    </div>
</body>
</html>`,
                text: `💔 Sentimos sua falta no TymerBook!\n\nOlá ${name},\n\nNotamos que seu período de teste grátis expirou e você ainda não assinou o TymerBook.\n\nSabemos o quanto é importante ter um sistema eficiente para seu negócio!\n\n🎁 OFERTA ESPECIAL PARA VOCÊ!\nAssine agora e volte a ter acesso completo.\n\n💎 Você vai recuperar:\n✅ Todos os seus dados salvos\n✅ Agendamentos ilimitados\n✅ WhatsApp integrado\n✅ Relatórios em tempo real\n✅ Suporte prioritário\n\nReativar agora: ${pricingUrl}\n\nPlanos a partir de R$ 29,90/mês\n\nP.S.: Seus dados estão seguros! Quando assinar, tudo volta como estava.\n\nEquipe TymerBook`
            };
            const info = yield transporter.sendMail(mailOptions);
            console.log('✅ Email "sentimos sua falta" enviado:', {
                messageId: info.messageId,
                to: email
            });
            return true;
        }
        catch (error) {
            console.error('❌ Erro ao enviar email "sentimos sua falta":', error);
            return false;
        }
    });
}
// Função para testar configuração de email
function testEmailConfiguration() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transporter = createTransporter();
            yield transporter.verify();
            console.log('✅ Configuração de email testada com sucesso');
            return true;
        }
        catch (error) {
            console.error('❌ Erro na configuração de email:', error);
            return false;
        }
    });
}
// Template para aviso de assinatura expirada (1 dia após)
function getSubscriptionExpiredEmailTemplate(name, plan, expiredOn) {
    const expiredDisplay = expiredOn ? formatBrazilianDate(expiredOn) : 'data anterior';
    const planDisplay = formatPlanName(plan);
    const portalUrl = `${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/dashboard/assinatura`;
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Assinatura Expirada - TymerBook</title><style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}table{border-collapse:collapse!important}body{margin:0;padding:0;width:100%!important;background-color:#f5f5f5;font-family:Segoe UI,Arial,sans-serif}a{text-decoration:none}.force-white{color:#ffffff!important}@media screen and (max-width:600px){.container{width:100%!important}}</style></head><body><center style="width:100%;background:#f5f5f5;padding:30px 10px"><table role="presentation" width="600" class="container" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden" cellpadding="0" cellspacing="0"><tr><td style="background:#4700FF;background:linear-gradient(90deg,#4700FF 0%,#6a32ff 100%);padding:30px 24px;text-align:center"><h1 style="margin:0;font-size:22px;color:#fff;font-weight:600">Assinatura Expirada</h1><p style="margin:8px 0 0;font-size:14px;color:#e5e5e5">Precisamos da sua atenção</p></td></tr><tr><td style="padding:28px 28px 8px;font-size:15px;line-height:1.55;color:#374151"><p style="margin:0 0 16px;">Olá <strong style="color:#111827">${name}</strong>,</p><p style="margin:0 0 16px;">Sua assinatura <strong>${planDisplay}</strong> expirou em <strong>${expiredDisplay}</strong> e já passou o período de tolerância de 1 dia.</p><p style="margin:0 0 16px;">Para voltar a ter acesso completo à plataforma, finalize a renovação agora mesmo.</p></td></tr><tr><td align="center" style="padding:12px 28px 4px"><a href="${portalUrl}" style="display:inline-block;background:#4700FF;background:linear-gradient(90deg,#4700FF 0%,#6a32ff 100%);color:#ffffff;font-size:16px;font-weight:600;line-height:46px;text-align:center;width:260px;border-radius:6px">Renovar Assinatura</a></td></tr><tr><td style="padding:24px 28px 8px;font-size:13px;color:#374151"><p style="margin:0 0 6px;font-weight:600;color:#111827">O que acontece enquanto não renovar?</p><ul style="margin:6px 0 0;padding:0 0 0 18px;font-size:13px;line-height:1.5;color:#374151"><li>Acesso ao painel restrito à página de assinatura</li><li>Automação e recursos ficam suspensos</li><li>Profissionais não conseguem operar agendas</li></ul></td></tr><tr><td style="background:#f7fafc;padding:22px 20px;text-align:center"><p style="margin:0 0 8px;font-size:12px;color:#6b7280">Este é um email automático. Não responda.</p><p style="margin:0 0 8px;font-size:12px;color:#6b7280">Suporte: <a href="mailto:suporte@tymerbook.com" style="color:#4700FF;font-weight:500">suporte@tymerbook.com</a></p><p style="margin:12px 0 0;font-size:11px;color:#9ca3af">© ${new Date().getFullYear()} TymerBook.</p></td></tr></table></center></body></html>`;
}
function sendSubscriptionExpiredEmail(name, email, plan, expiredOn) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transporter = createTransporter();
            const html = getSubscriptionExpiredEmailTemplate(name, plan, expiredOn);
            if (process.env.NODE_ENV === 'development') {
                console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'email', type: 'expired_prepare', to: email, plan, expiredOn: expiredOn === null || expiredOn === void 0 ? void 0 : expiredOn.toISOString() }));
            }
            const mailOptions = {
                from: { name: 'TymerBook', address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@tymerbook.com' },
                to: email,
                subject: '⚠️ Sua assinatura expirou - ação necessária',
                html,
                text: `Sua assinatura expirou em ${expiredOn === null || expiredOn === void 0 ? void 0 : expiredOn.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Acesse o painel para renová-la.`
            };
            const info = yield transporter.sendMail(mailOptions);
            if (process.env.NODE_ENV === 'development') {
                console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'email', type: 'expired_sent', to: email, messageId: info.messageId }));
            }
            else {
                console.log('📧 Email de assinatura expirada enviado:', { to: email, messageId: info.messageId });
            }
            return true;
        }
        catch (e) {
            console.error('❌ Erro ao enviar email de assinatura expirada:', e);
            if (process.env.NODE_ENV === 'development') {
                console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'email', type: 'expired_error', to: email, error: e.message }));
            }
            return false;
        }
    });
}
function buildSimpleNoticeTemplate({ title, subtitle, bodyHtml, ctaText, ctaUrl }) {
    return `<!DOCTYPE html><html lang=pt-BR><head><meta charset=UTF-8 /><meta name=viewport content="width=device-width,initial-scale=1"/><title>${title}</title><style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}table{border-collapse:collapse!important}body{margin:0;padding:0;width:100%!important;background-color:#f5f5f5;font-family:Segoe UI,Arial,sans-serif}a{text-decoration:none}@media screen and (max-width:600px){.container{width:100%!important}}</style></head><body style="background:#f5f5f5;margin:0;padding:26px 10px"><center style="width:100%"><table role=presentation width=600 class=container style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden" cellpadding=0 cellspacing=0><tr><td style="background:#4700FF;background:linear-gradient(90deg,#4700FF 0%,#6a32ff 100%);padding:28px 22px;text-align:center"><h1 style="margin:0;font-size:22px;color:#fff;font-weight:600">${title}</h1><p style="margin:6px 0 0;font-size:14px;color:#e5e5e5">${subtitle}</p></td></tr><tr><td style="padding:26px 28px 10px;font-size:15px;line-height:1.55;color:#374151">${bodyHtml}</td></tr><tr><td align=center style="padding:10px 28px 6px"><a href="${ctaUrl}" style="display:inline-block;background:#4700FF;background:linear-gradient(90deg,#4700FF 0%,#6a32ff 100%);color:#ffffff;font-size:16px;font-weight:600;line-height:46px;text-align:center;width:240px;border-radius:6px">${ctaText}</a></td></tr><tr><td style="background:#f7fafc;padding:20px 18px;text-align:center"><p style="margin:0 0 6px;font-size:12px;color:#6b7280">Este é um email automático. Não responda.</p><p style="margin:0 0 6px;font-size:12px;color:#6b7280">Suporte: <a href="mailto:suporte@tymerbook.com" style="color:#4700FF;font-weight:500">suporte@tymerbook.com</a></p><p style="margin:10px 0 0;font-size:11px;color:#9ca3af">© ${new Date().getFullYear()} TymerBook.</p></td></tr></table></center></body></html>`;
}
function sendGenericNoticeEmail(_a) {
    return __awaiter(this, arguments, void 0, function* ({ email, name, plan, subject, title, subtitle, body, ctaText, ctaUrl }) {
        try {
            const transporter = createTransporter();
            const html = buildSimpleNoticeTemplate({ title, subtitle, bodyHtml: body, ctaText, ctaUrl });
            const info = yield transporter.sendMail({
                from: { name: 'TymerBook', address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'suporte@tymerbook.com' },
                to: email,
                subject,
                html,
                text: body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
            });
            console.log('📧 Email disparado:', { type: subject, to: email, id: info.messageId });
            return true;
        }
        catch (e) {
            console.error('❌ Erro ao enviar email genérico:', e);
            return false;
        }
    });
}
function sendSubscriptionPreExpireEmail(name, email, plan, daysLeft) {
    return __awaiter(this, void 0, void 0, function* () {
        const portalUrl = `${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/dashboard/assinatura`;
        const planDisplay = formatPlanName(plan);
        const subject = daysLeft === 1 ? '⏰ Sua assinatura expira amanhã' : '⚠️ Sua assinatura expira em 3 dias';
        const title = daysLeft === 1 ? 'Expira Amanhã' : 'Expira em Breve';
        const subtitle = daysLeft === 1 ? 'Último dia antes de bloquear' : 'Hora de renovar';
        const body = `<p>Olá <strong>${name}</strong>,</p><p>Sua assinatura <strong>${planDisplay}</strong> expira em <strong>${daysLeft} dia${daysLeft === 1 ? '' : 's'}</strong>.</p><p>Renove agora para evitar qualquer interrupção no acesso.</p>`;
        if (process.env.NODE_ENV === 'development') {
            console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'email', type: 'preexpire_prepare', to: email, plan, daysLeft }));
        }
        const result = yield sendGenericNoticeEmail({ email, name, plan, subject, title, subtitle, body, ctaText: 'Renovar agora', ctaUrl: portalUrl });
        if (process.env.NODE_ENV === 'development') {
            console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'email', type: 'preexpire_result', to: email, success: result, daysLeft }));
        }
        return result;
    });
}
function sendSubscriptionCanceledEmail(name, email, plan) {
    return __awaiter(this, void 0, void 0, function* () {
        const portalUrl = `${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/dashboard/assinatura`;
        const planDisplay = formatPlanName(plan);
        const body = `<p>Olá <strong>${name}</strong>,</p><p>Recebemos a informação de cancelamento da sua assinatura <strong>${planDisplay}</strong>.</p><p>Enquanto não renovar, o acesso ficará restrito. Se foi engano, você pode reativar a qualquer momento.</p>`;
        return sendGenericNoticeEmail({ email, name, plan, subject: '🔔 Assinatura cancelada', title: 'Assinatura Cancelada', subtitle: 'Acesso restrito', body, ctaText: 'Reativar assinatura', ctaUrl: portalUrl });
    });
}
function sendEmail(_a) {
    return __awaiter(this, arguments, void 0, function* ({ to, subject, html, text, fromName, fromEmail }) {
        try {
            const transporter = createTransporter();
            yield transporter.sendMail({
                from: {
                    name: fromName || 'TymerBook',
                    address: fromEmail || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@tymerbook.com'
                },
                to,
                subject,
                html,
                text
            });
        }
        catch (error) {
            console.error('❌ Erro ao enviar e-mail:', error);
            throw new Error('Falha ao enviar o e-mail de notificação.');
        }
    });
}
// Template HTML para email de redefinição de senha
function getPasswordResetEmailTemplate(name, resetUrl) {
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
</html>`;
}
// Função para enviar email de redefinição de senha
function sendPasswordResetEmail(name, email, resetToken) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transporter = createTransporter();
            const resetUrl = `${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/redefinir-senha?token=${resetToken}`;
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
            };
            const info = yield transporter.sendMail(mailOptions);
            console.log('✅ Email de redefinição de senha enviado:', {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
                to: email
            });
            return true;
        }
        catch (error) {
            console.error('❌ Erro ao enviar email de redefinição:', error);
            return false;
        }
    });
}
