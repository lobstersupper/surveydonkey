import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendVerificationEmailParams {
  email: string;
  name: string;
  code: string;
}

export async function sendVerificationEmail({
  email,
  name,
  code,
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string; devCode?: string }> {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Survey Donkey <onboarding@resend.dev>';
  const subject = `Your Survey Donkey Verification Code: ${code}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="display: flex; align-items: center; margin-bottom: 24px;">
            <div style="background-color: #0f172a; color: #ffffff; width: 36px; height: 36px; border-radius: 8px; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; line-height: 36px; text-align: center;">
              SD
            </div>
            <span style="font-weight: 800; font-size: 16px; letter-spacing: -0.025em; text-transform: uppercase; margin-left: 10px; color: #0f172a;">
              Survey Donkey
            </span>
          </div>

          <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">
            Verify your email address
          </h1>
          <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 24px 0;">
            Hello ${name || 'there'}, thanks for signing up for Survey Donkey! Use the verification code below to confirm your account:
          </p>

          <div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
            <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a;">
              ${code}
            </span>
            <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0;">
              This code will expire in 15 minutes.
            </p>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.4; margin: 0 0 24px 0;">
            If you didn't create an account with Survey Donkey, you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">
            © ${new Date().getFullYear()} Survey Donkey Platform. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Survey Donkey Verification Code

Hello ${name || 'there'},

Your verification code is: ${code}

This code will expire in 15 minutes. If you did not create an account, you can ignore this message.

© ${new Date().getFullYear()} Survey Donkey
  `.trim();

  // If no Resend API key or in dummy mode, log code to console in dev and return success with code
  if (!resend || !resendApiKey || resendApiKey.startsWith('re_12345')) {
    console.log(`\n========================================`);
    console.log(`[DEV MODE / RESEND SIMULATOR]`);
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Verification Code: ${code}`);
    console.log(`========================================\n`);
    return { success: true, devCode: code };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Failed to dispatch verification email via Resend:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email.',
    };
  }
}
