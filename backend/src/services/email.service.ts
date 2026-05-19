import { Resend } from 'resend';
import { getFromEmail, getResendApiKey } from '../config/env';
import { logger } from '../lib/logger';

const apiKey = getResendApiKey();
const resend = apiKey ? new Resend(apiKey) : null;
const fromEmail = getFromEmail();

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    logger.warn('Resend API key not configured — email send skipped');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
    });

    if (error) {
      logger.error({ err: error }, 'Resend API error');
      return { success: false, error: error.message };
    }

    logger.info({ to: options.to, id: data?.id }, 'Email sent successfully');
    return { success: true };
  } catch (err) {
    logger.error({ err }, 'Unexpected email error');
    return { success: false, error: 'Unexpected error sending email' };
  }
}

export function getPasswordResetEmailHtml(resetUrl: string, userName?: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">EliCash</h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.6); font-size: 13px;">Gestión de Préstamos y Cobros</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px; color: #18181b; font-size: 18px; font-weight: 600;">Restablecer tu contraseña</h2>
              <p style="margin: 0 0 24px; color: #52525b; font-size: 14px; line-height: 1.6;">
                Hola${userName ? ' ' + userName : ''},<br><br>
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si fuiste tú, haz clic en el siguiente botón para crear una nueva contraseña. El enlace expira en 15 minutos.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3b82f6, #10b981); color: #ffffff; text-decoration: none; border-radius: 9999px; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #71717a; font-size: 12px; line-height: 1.5;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0; color: #3b82f6; font-size: 12px; word-break: break-all;">
                ${resetUrl}
              </p>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.5;">
                Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual seguirá siendo válida.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #fafafa; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 11px;">EliCash &copy; ${new Date().getFullYear()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function getPasswordResetEmailText(resetUrl: string, userName?: string): string {
  return `Hola${userName ? ' ' + userName : ''},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en EliCash.

Para crear una nueva contraseña, visita el siguiente enlace (válido por 15 minutos):
${resetUrl}

Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá siendo válida.

EliCash - ${new Date().getFullYear()}
`;
}
