import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const senderEmail = process.env.RESEND_FROM_EMAIL || 'suporte@250k.com.br';

function getSupportEmails(): string[] {
  const envEmails = process.env.SUPPORT_NOTIFICATION_EMAILS;
  if (envEmails) {
    return envEmails.split(',').map(e => e.trim()).filter(Boolean);
  }
  return ['vfidelisdev@gmail.com', 'leopoldinodev@gmail.com'];
}

// 1. Notificação de Novo Chamado (Envia para o Cliente E para a Equipe de Suporte)
export async function sendTicketCreatedNotification(params: {
  toEmail: string;
  clientName: string;
  ticketId: number;
  title: string;
  category: string;
  priority: string;
}) {
  if (!resend) {
    console.log(`[Resend Mock] Novo Ticket #${params.ticketId} enviado para cliente ${params.toEmail} e suporte`);
    return { success: true, mock: true };
  }

  try {
    // E-mail para o Cliente
    await resend.emails.send({
      from: `ReportaDesk Suporte <${senderEmail}>`,
      to: [params.toEmail],
      subject: `[Ticket #${params.ticketId}] Chamado Recebido: ${params.title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px;">
          <div style="background: #0F1115; padding: 24px; border-radius: 12px; border: 1px solid #1E222A; margin-bottom: 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
              <tr>
                <td style="vertical-align: middle; padding-right: 12px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 38px; height: 38px; background-color: #2F5BFF; border-radius: 10px; text-align: center;">
                    <tr>
                      <td style="vertical-align: middle; text-align: center; width: 38px; height: 38px; line-height: 1;">
                        <span style="display: inline-block; width: 6px; height: 6px; background-color: #D9F24A; border-radius: 50%; vertical-align: middle; margin-right: 2px;"></span>
                        <span style="display: inline-block; width: 6px; height: 6px; background-color: #F7F7F4; border-radius: 50%; vertical-align: middle; margin-right: 2px;"></span>
                        <span style="display: inline-block; width: 6px; height: 6px; background-color: #7E93FF; border-radius: 50%; vertical-align: middle;"></span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align: middle;">
                  <span style="font-family: 'Space Grotesk', sans-serif; font-size: 24px; color: #F7F7F4;">Reporta<strong style="color: #F7F7F4;">Desk</strong></span>
                </td>
              </tr>
            </table>
            <p style="margin: 0; color: #A1A1AA; font-size: 13px;">Seu chamado foi registrado e nossa equipe já foi acionada.</p>
          </div>
          
          <div style="background-color: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
            <p style="margin-top: 0; font-size: 15px;">Olá, <strong>${params.clientName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
              Recebemos a sua solicitação <strong>#${params.ticketId}</strong> e nossa equipe já foi notificada.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">Título:</td>
                <td style="padding: 8px 0; font-weight: 600;">${params.title}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">Categoria:</td>
                <td style="padding: 8px 0; font-weight: 600; text-transform: capitalize;">${params.category}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Prioridade:</td>
                <td style="padding: 8px 0; font-weight: 600; text-transform: uppercase;">${params.priority}</td>
              </tr>
            </table>
          </div>
        </div>
      `,
    });

    // E-mail para a Equipe de Suporte / Devs (vfidelisdev@gmail.com e leopoldinodev@gmail.com)
    const supportEmails = getSupportEmails();
    if (supportEmails.length > 0) {
      await resend.emails.send({
        from: `ReportaDesk Alertas <${senderEmail}>`,
        to: supportEmails,
        subject: `🚨 [Novo Chamado #${params.ticketId}] ${params.title} (${params.clientName})`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc;">
            <div style="background: #0F1115; padding: 20px; border-radius: 12px; color: white;">
              <h2 style="margin: 0; font-size: 18px; color: #D9F24A;">⚡ Novo Chamado Registrado no ReportaDesk</h2>
            </div>
            <div style="background-color: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 16px;">
              <p style="margin-top: 0; font-size: 14px;"><strong>Solicitante:</strong> ${params.clientName} (${params.toEmail})</p>
              <p style="font-size: 14px;"><strong>Título:</strong> #${params.ticketId} - ${params.title}</p>
              <p style="font-size: 14px;"><strong>Prioridade:</strong> <span style="color: #ef4444; font-weight: bold;">${params.priority.toUpperCase()}</span> | <strong>Categoria:</strong> ${params.category}</p>
            </div>
          </div>
        `,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar e-mail via Resend:', error);
    return { success: false, error };
  }
}

// 2. Notificação de Comentário / Resposta (Envia para todos os participantes do chamado)
export async function sendCommentNotification(params: {
  toEmails: string[];
  ticketId: number;
  ticketTitle: string;
  commentAuthor: string;
  commentBody: string;
}) {
  if (!resend) {
    console.log(`[Resend Mock] Notificação de Resposta no Ticket #${params.ticketId} enviada para ${params.toEmails.join(', ')}`);
    return { success: true, mock: true };
  }

  if (!params.toEmails || params.toEmails.length === 0) return { success: true };

  try {
    const data = await resend.emails.send({
      from: `ReportaDesk Suporte <${senderEmail}>`,
      to: params.toEmails,
      subject: `💬 Nova resposta no Ticket #${params.ticketId}: ${params.ticketTitle}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc;">
          <div style="background: #0F1115; padding: 20px; border-radius: 12px; color: white;">
            <h3 style="margin: 0; font-size: 16px; color: #F7F7F4;">ReportaDesk • Atualização no Chamado #${params.ticketId}</h3>
          </div>
          <div style="background-color: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 16px;">
            <p style="font-size: 14px; color: #475569; margin-bottom: 16px;">
              <strong>${params.commentAuthor}</strong> adicionou uma nova resposta:
            </p>
            <div style="background-color: #f1f5f9; padding: 16px; border-left: 4px solid #2F5BFF; border-radius: 4px; font-size: 14px; color: #334155; white-space: pre-wrap; margin-bottom: 20px;">
${params.commentBody}
            </div>
          </div>
        </div>
      `,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar notificação de comentário:', error);
    return { success: false, error };
  }
}

// 3. Notificação de Nova Conta Criada
export async function sendAccountCreatedNotification(params: {
  toEmail: string;
  name: string;
  role: string;
  company?: string;
  password: string;
}) {
  if (!resend) {
    console.log(`[Resend Mock] Boas-vindas enviada para ${params.toEmail}`);
    return { success: true, mock: true };
  }

  try {
    await resend.emails.send({
      from: `ReportaDesk Suporte <${senderEmail}>`,
      to: [params.toEmail],
      subject: `🎉 Sua conta no ReportaDesk foi criada!`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc;">
          <div style="background: #0F1115; padding: 24px; border-radius: 12px; color: white;">
            <h2 style="margin: 0; font-size: 20px; color: #D9F24A;">Bem-vindo ao ReportaDesk</h2>
          </div>
          <div style="background-color: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 16px;">
            <p style="font-size: 15px;">Olá, <strong>${params.name}</strong>,</p>
            <p style="font-size: 14px; color: #475569;">Sua conta de acesso ao portal de suporte foi cadastrada com sucesso.</p>
            
            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 13px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>E-mail:</strong> ${params.toEmail}</p>
              <p style="margin: 4px 0;"><strong>Senha de Acesso:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${params.password}</code></p>
              <p style="margin: 4px 0;"><strong>Perfil:</strong> ${params.role === 'admin' ? 'Suporte / Dev' : 'Cliente'}</p>
            </div>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar e-mail de conta criada:', error);
    return { success: false, error };
  }
}

// 4. Notificação de Senha Alterada
export async function sendPasswordChangedNotification(params: {
  toEmail: string;
  name: string;
}) {
  if (!resend) {
    console.log(`[Resend Mock] Aviso de senha alterada enviado para ${params.toEmail}`);
    return { success: true, mock: true };
  }

  try {
    await resend.emails.send({
      from: `ReportaDesk Segurança <${senderEmail}>`,
      to: [params.toEmail],
      subject: `🔒 Sua senha do ReportaDesk foi alterada`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc;">
          <div style="background-color: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #0f172a;">Aviso de Segurança</h3>
            <p style="font-size: 14px; color: #475569;">Olá, <strong>${params.name}</strong>. Confirmamos que a senha da sua conta no ReportaDesk foi alterada recentemente.</p>
            <p style="font-size: 12px; color: #94a3b8;">Caso você não tenha solicitado esta alteração, entre em contato com nossa equipe imediatamente.</p>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar aviso de alteração de senha:', error);
    return { success: false, error };
  }
}
