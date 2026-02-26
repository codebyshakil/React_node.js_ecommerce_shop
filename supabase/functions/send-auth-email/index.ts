import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendSmtpEmail(to: string, subject: string, body: string, smtpConfig: any): Promise<{ sent: boolean; reason?: string }> {
  const host = smtpConfig.host;
  const port = parseInt(smtpConfig.port || '587');
  const user = smtpConfig.user;
  const password = smtpConfig.password;
  const fromEmail = smtpConfig.from_email || user;
  const fromName = smtpConfig.from_name || 'No Reply';
  const encryption = smtpConfig.encryption || 'tls';

  if (!host || !user || !password) {
    return { sent: false, reason: 'SMTP not configured. Go to Settings → Auth Email.' };
  }

  try {
    const useTLS = port === 465 || encryption === 'ssl';
    let conn: Deno.Conn;

    try {
      if (useTLS) {
        conn = await Deno.connectTls({ hostname: host, port });
      } else {
        conn = await Deno.connect({ hostname: host, port });
      }
    } catch (connErr) {
      const msg = String(connErr);
      if (msg.includes('ConnectionRefused') || msg.includes('connection refused')) {
        return { sent: false, reason: `Connection refused on port ${port}. Check host and port.` };
      }
      return { sent: false, reason: `Connection failed: ${msg}` };
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(): Promise<string> {
      const buf = new Uint8Array(4096);
      const n = await conn.read(buf);
      return decoder.decode(buf.subarray(0, n || 0));
    }

    async function sendCommand(cmd: string): Promise<string> {
      await conn.write(encoder.encode(cmd + '\r\n'));
      return await readResponse();
    }

    const greeting = await readResponse();
    if (!greeting.startsWith('220')) {
      conn.close();
      return { sent: false, reason: `SMTP server rejected connection: ${greeting.trim()}` };
    }

    const ehloRes = await sendCommand('EHLO localhost');

    if (!useTLS && (port === 587 || encryption === 'tls') && ehloRes.includes('STARTTLS')) {
      const starttlsRes = await sendCommand('STARTTLS');
      if (!starttlsRes.startsWith('220')) {
        conn.close();
        return { sent: false, reason: `STARTTLS failed: ${starttlsRes.trim()}` };
      }
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: host });
      await sendCommand('EHLO localhost');
    }

    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(user));
    const authRes = await sendCommand(btoa(password));

    if (!authRes.startsWith('235')) {
      conn.close();
      return { sent: false, reason: `Authentication failed. Check username/password. Server: ${authRes.trim()}` };
    }

    const mailFromRes = await sendCommand(`MAIL FROM:<${fromEmail}>`);
    if (!mailFromRes.startsWith('250')) {
      conn.close();
      return { sent: false, reason: `MAIL FROM rejected: ${mailFromRes.trim()}` };
    }

    const rcptRes = await sendCommand(`RCPT TO:<${to}>`);
    if (!rcptRes.startsWith('250')) {
      conn.close();
      return { sent: false, reason: `Recipient rejected: ${rcptRes.trim()}` };
    }

    await sendCommand('DATA');

    const emailContent = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      body,
      `.`,
    ].join('\r\n');

    const dataRes = await sendCommand(emailContent);
    await sendCommand('QUIT');
    conn.close();

    if (dataRes.startsWith('250') || dataRes.startsWith('2')) {
      return { sent: true };
    }
    return { sent: false, reason: `Server response: ${dataRes.trim()}` };
  } catch (err) {
    console.error('[AUTH EMAIL] SMTP error:', err);
    return { sent: false, reason: `SMTP error: ${String(err)}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get auth SMTP config (or fallback to marketing smtp_config if use_marketing_smtp is true)
    const { data: authSmtpRow } = await supabaseAdmin.from('admin_settings').select('value').eq('key', 'auth_smtp_config').maybeSingle();
    const authSmtpConfig = authSmtpRow?.value as any;

    let smtpConfig: any;

    if (authSmtpConfig?.use_marketing_smtp) {
      // Use marketing SMTP
      const { data: marketingSmtpRow } = await supabaseAdmin.from('admin_settings').select('value').eq('key', 'smtp_config').maybeSingle();
      smtpConfig = marketingSmtpRow?.value as any;
    } else {
      smtpConfig = authSmtpConfig;
    }

    if (!smtpConfig?.host || !smtpConfig?.user || !smtpConfig?.password) {
      return new Response(JSON.stringify({ error: 'Auth SMTP not configured. Go to Settings → Auth Email.', details: 'Missing host, user, or password' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get auth email config for feature toggles
    const { data: authConfigRow } = await supabaseAdmin.from('admin_settings').select('value').eq('key', 'auth_email_config').maybeSingle();
    const authConfig = (authConfigRow?.value as any) || {};

    // Get site name for email branding
    const { data: siteNameRow } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'site_title').maybeSingle();
    const siteName = (typeof siteNameRow?.value === 'string' ? siteNameRow.value : 'Our Store') as string;

    // === TEST SMTP CONNECTION ===
    if (action === 'test_connection') {
      const testEmail = body.test_email || smtpConfig.from_email || smtpConfig.user;
      const result = await sendSmtpEmail(
        testEmail,
        `Auth SMTP Test - Connection Successful ✓`,
        `<h2>Auth SMTP Test Successful!</h2><p>Your authentication email SMTP is working correctly.</p><p>Verification, welcome, and password reset emails will use this configuration.</p><p>Sent at: ${new Date().toISOString()}</p>`,
        smtpConfig
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === SEND VERIFICATION EMAIL ===
    if (action === 'send_verification') {
      if (authConfig.verification_enabled === false) {
        return new Response(JSON.stringify({ sent: false, reason: 'Email verification is disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { email, user_id } = body;
      if (!email) {
        return new Response(JSON.stringify({ sent: false, reason: 'No email provided' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate verification link using admin API
      const redirectTo = body.redirect_to || `${Deno.env.get('SITE_URL') || ''}/verify-email`;
      
      // Try signup link first, fall back to magiclink if user already exists
      let linkData: any = null;
      let linkError: any = null;
      
      const signupResult = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        options: { redirectTo },
      });
      
      if (signupResult.error && signupResult.error.message?.includes('already been registered')) {
        console.log('[AUTH EMAIL] User exists, using magiclink for verification');
        const magicResult = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo },
        });
        linkData = magicResult.data;
        linkError = magicResult.error;
      } else {
        linkData = signupResult.data;
        linkError = signupResult.error;
      }

      if (linkError) {
        console.error('[AUTH EMAIL] Generate link error:', linkError);
        return new Response(JSON.stringify({ sent: false, reason: `Failed to generate verification link: ${linkError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const verificationUrl = linkData?.properties?.action_link || '';

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to ${siteName}!</h2>
          <p style="color: #555; font-size: 16px;">Thank you for creating an account. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">Verify Email Address</a>
          </div>
          <p style="color: #888; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #aaa; font-size: 12px;">${siteName}</p>
        </div>
      `;

      const result = await sendSmtpEmail(email, `Verify your email - ${siteName}`, htmlBody, smtpConfig);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === SEND PASSWORD RESET EMAIL ===
    if (action === 'send_reset') {
      if (authConfig.reset_email_enabled === false) {
        return new Response(JSON.stringify({ sent: false, reason: 'Password reset email is disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { email } = body;
      if (!email) {
        return new Response(JSON.stringify({ sent: false, reason: 'No email provided' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const redirectTo = body.redirect_to || `${Deno.env.get('SITE_URL') || ''}/reset-password`;

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      });

      if (linkError) {
        console.error('[AUTH EMAIL] Generate reset link error:', linkError);
        return new Response(JSON.stringify({ sent: false, reason: `Failed to generate reset link: ${linkError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const resetUrl = linkData?.properties?.action_link || '';

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p style="color: #555; font-size: 16px;">We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #888; font-size: 14px;">If you didn't request this, you can safely ignore this email. The link will expire in 24 hours.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #aaa; font-size: 12px;">${siteName}</p>
        </div>
      `;

      const result = await sendSmtpEmail(email, `Reset your password - ${siteName}`, htmlBody, smtpConfig);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === SEND WELCOME EMAIL ===
    if (action === 'send_welcome') {
      if (authConfig.welcome_email_enabled === false) {
        return new Response(JSON.stringify({ sent: false, reason: 'Welcome email is disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { email, name } = body;
      if (!email) {
        return new Response(JSON.stringify({ sent: false, reason: 'No email provided' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const siteUrl = Deno.env.get('SITE_URL') || '';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to ${siteName}!</h2>
          <p style="color: #555; font-size: 16px;">Hi ${name || 'there'},</p>
          <p style="color: #555; font-size: 16px;">Thank you for joining ${siteName}. We're excited to have you!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">Start Shopping</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #aaa; font-size: 12px;">${siteName}</p>
        </div>
      `;

      const result = await sendSmtpEmail(email, `Welcome to ${siteName}!`, htmlBody, smtpConfig);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-auth-email] Error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred', details: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
