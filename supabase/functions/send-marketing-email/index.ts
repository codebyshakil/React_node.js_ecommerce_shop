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
  const encryption = smtpConfig.encryption || 'tls';

  if (!host || !user || !password) {
    return { sent: false, reason: 'SMTP not configured. Go to Settings → Email.' };
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
      if (msg.includes('dns') || msg.includes('resolve')) {
        return { sent: false, reason: `Cannot resolve hostname "${host}". Check SMTP host.` };
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

    // Read greeting
    const greeting = await readResponse();
    if (!greeting.startsWith('220')) {
      conn.close();
      return { sent: false, reason: `SMTP server rejected connection: ${greeting.trim()}` };
    }

    const ehloRes = await sendCommand('EHLO localhost');

    // STARTTLS upgrade for port 587
    if (!useTLS && (port === 587 || encryption === 'tls') && ehloRes.includes('STARTTLS')) {
      const starttlsRes = await sendCommand('STARTTLS');
      if (!starttlsRes.startsWith('220')) {
        conn.close();
        return { sent: false, reason: `STARTTLS failed: ${starttlsRes.trim()}` };
      }
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: host });
      await sendCommand('EHLO localhost');
    }

    // Auth
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
      `From: ${smtpConfig.from_name || 'Store'} <${fromEmail}>`,
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
    console.error('[MARKETING EMAIL] SMTP error:', err);
    return { sent: false, reason: `SMTP error: ${String(err)}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: roleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = roleData?.some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Get SMTP config (resolve auth SMTP if synced)
    const { data: smtpRow } = await supabaseAdmin.from('admin_settings').select('value').eq('key', 'smtp_config').maybeSingle();
    let smtpConfig = smtpRow?.value as any;

    if (smtpConfig?.use_auth_smtp) {
      const { data: authSmtpRow } = await supabaseAdmin.from('admin_settings').select('value').eq('key', 'auth_smtp_config').maybeSingle();
      smtpConfig = authSmtpRow?.value as any;
    }

    if (!smtpConfig?.host || !smtpConfig?.user || !smtpConfig?.password) {
      return new Response(JSON.stringify({ error: 'SMTP not configured. Go to Settings → Email to configure.', details: 'Missing host, user, or password' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === TEST SMTP CONNECTION ===
    if (action === 'test_connection') {
      const result = await sendSmtpEmail(
        body.test_email || smtpConfig.from_email || smtpConfig.user,
        'SMTP Test - Connection Successful ✓',
        '<h2>SMTP Test Successful!</h2><p>Your SMTP configuration is working correctly. Marketing emails will use this configuration.</p><p>Sent at: ' + new Date().toISOString() + '</p>',
        smtpConfig
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === TEST EMAIL ===
    if (action === 'test') {
      if (!body.test_email) {
        return new Response(JSON.stringify({ sent: false, reason: 'No test email address provided' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await sendSmtpEmail(body.test_email, body.subject || 'Test Email', body.body || '<p>This is a test marketing email.</p>', smtpConfig);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === SEND CAMPAIGN (queue-based) ===
    if (action === 'send_campaign') {
      const { campaign_id, emails, subject: emailSubject, body: emailBody, send_interval_minutes = 1 } = body;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return new Response(JSON.stringify({ error: 'No recipients' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update campaign with total/pending counts
      if (campaign_id) {
        await supabaseAdmin.from('email_campaigns').update({
          status: 'sending',
          total_count: emails.length,
          pending_count: emails.length,
          send_interval_minutes,
        }).eq('id', campaign_id);
      }

      let sentCount = 0;
      let failedCount = 0;
      const errorLog: string[] = [];

      for (let i = 0; i < emails.length; i++) {
        // Check if campaign is paused or stopped
        if (campaign_id) {
          const { data: campaignCheck } = await supabaseAdmin.from('email_campaigns').select('is_paused, status').eq('id', campaign_id).maybeSingle();
          if (campaignCheck?.is_paused) {
            // Wait and re-check in a loop
            let pauseChecks = 0;
            while (pauseChecks < 60) { // Max 60 minute pause
              await new Promise(r => setTimeout(r, 60000));
              const { data: recheck } = await supabaseAdmin.from('email_campaigns').select('is_paused, status').eq('id', campaign_id).maybeSingle();
              if (!recheck?.is_paused) break;
              if (recheck?.status === 'stopped') break;
              pauseChecks++;
            }
            // Re-check after pause
            const { data: finalCheck } = await supabaseAdmin.from('email_campaigns').select('status').eq('id', campaign_id).maybeSingle();
            if (finalCheck?.status === 'stopped') break;
          }
          if (campaignCheck?.status === 'stopped') break;
        }

        const recipient = emails[i];
        let recipientEmail = recipient.email;
        const recipientName = recipient.name || 'Customer';

        if (!recipientEmail && recipient.user_id) {
          try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(recipient.user_id);
            recipientEmail = authUser?.user?.email || '';
          } catch { recipientEmail = ''; }
        }

        if (!recipientEmail) {
          failedCount++;
          errorLog.push(`[${i + 1}] No email for user ${recipient.user_id?.slice(0, 8) || 'unknown'}`);
        } else {
          let personalizedBody = emailBody.replace(/\{\{customer_name\}\}/g, recipientName);
          personalizedBody = personalizedBody.replace(/\{\{customer_email\}\}/g, recipientEmail);

          const result = await sendSmtpEmail(recipientEmail, emailSubject, personalizedBody, smtpConfig);
          if (result.sent) {
            sentCount++;
          } else {
            failedCount++;
            errorLog.push(`[${i + 1}] ${recipientEmail}: ${result.reason}`);
          }
        }

        // Update progress in database
        if (campaign_id) {
          await supabaseAdmin.from('email_campaigns').update({
            sent_count: sentCount,
            failed_count: failedCount,
            pending_count: emails.length - (sentCount + failedCount),
            error_log: errorLog.join('\n'),
          }).eq('id', campaign_id);
        }

        // Wait interval between emails (skip after last one)
        if (i < emails.length - 1 && send_interval_minutes > 0) {
          const waitMs = Math.min(send_interval_minutes * 60 * 1000, 5 * 60 * 1000); // Max 5 min wait in edge function
          await new Promise(r => setTimeout(r, waitMs));
        }
      }

      // Final update
      if (campaign_id) {
        await supabaseAdmin.from('email_campaigns').update({
          status: failedCount === emails.length ? 'failed' : 'sent',
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
          failed_count: failedCount,
          pending_count: 0,
          error_log: errorLog.join('\n'),
        }).eq('id', campaign_id);
      }

      return new Response(JSON.stringify({ success: true, sent_count: sentCount, failed_count: failedCount, errors: errorLog }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === PAUSE / RESUME / STOP ===
    if (action === 'pause_campaign' || action === 'resume_campaign' || action === 'stop_campaign') {
      const { campaign_id } = body;
      if (!campaign_id) {
        return new Response(JSON.stringify({ error: 'campaign_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'pause_campaign') {
        await supabaseAdmin.from('email_campaigns').update({ is_paused: true }).eq('id', campaign_id);
      } else if (action === 'resume_campaign') {
        await supabaseAdmin.from('email_campaigns').update({ is_paused: false }).eq('id', campaign_id);
      } else {
        await supabaseAdmin.from('email_campaigns').update({ status: 'stopped', is_paused: false }).eq('id', campaign_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-marketing-email] Error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred', details: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
