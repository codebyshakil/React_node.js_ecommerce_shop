import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-internal-secret',
};

async function sendEmail(to: string, subject: string, body: string) {
  const SMTP_HOST = Deno.env.get('SMTP_HOST');
  const SMTP_PORT = Deno.env.get('SMTP_PORT') || '587';
  const SMTP_USER = Deno.env.get('SMTP_USER');
  const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD');
  const SMTP_FROM = Deno.env.get('SMTP_FROM_EMAIL') || SMTP_USER;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    console.log('[EMAIL] SMTP not configured, logging only');
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL BODY]\n${body}`);
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    const port = parseInt(SMTP_PORT);
    const useTLS = port === 465;

    let conn: Deno.Conn;
    if (useTLS) {
      conn = await Deno.connectTls({ hostname: SMTP_HOST, port });
    } else {
      conn = await Deno.connect({ hostname: SMTP_HOST, port });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(): Promise<string> {
      const buf = new Uint8Array(1024);
      const n = await conn.read(buf);
      return decoder.decode(buf.subarray(0, n || 0));
    }

    async function sendCommand(cmd: string): Promise<string> {
      await conn.write(encoder.encode(cmd + '\r\n'));
      return await readResponse();
    }

    await readResponse();
    const ehloRes = await sendCommand(`EHLO localhost`);

    if (!useTLS && port === 587 && ehloRes.includes('STARTTLS')) {
      await sendCommand('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: SMTP_HOST });
      await sendCommand('EHLO localhost');
    }

    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(SMTP_USER));
    const authRes = await sendCommand(btoa(SMTP_PASSWORD));

    if (!authRes.startsWith('235')) {
      console.error('[EMAIL] Auth failed:', authRes);
      conn.close();
      return { sent: false, reason: 'SMTP auth failed' };
    }

    await sendCommand(`MAIL FROM:<${SMTP_FROM}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand('DATA');

    const emailContent = [
      `From: CommerceX <${SMTP_FROM}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body,
      `.`,
    ].join('\r\n');

    const dataRes = await sendCommand(emailContent);
    await sendCommand('QUIT');
    conn.close();

    console.log(`[EMAIL] Sent to ${to}: ${subject}`);
    return { sent: true };
  } catch (err) {
    console.error('[EMAIL] SMTP error:', err);
    return { sent: false, reason: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication: Allow either authenticated admin users or internal service calls
    const internalSecret = req.headers.get('x-internal-secret');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const isInternalCall = internalSecret && serviceRoleKey && internalSecret === serviceRoleKey;

    if (!isInternalCall) {
      // Require user authentication for external calls
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { type, data } = await req.json();

    let subject = '';
    let body = '';
    let recipientEmail = '';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    switch (type) {
      case 'order_confirmation': {
        subject = `Order Confirmation #${data.order_id?.slice(0, 8)}`;
        body = `Dear Customer,\n\nYour order #${data.order_id?.slice(0, 8)} has been confirmed.\n\nTotal: ৳${Number(data.total).toFixed(2)}\nItems: ${data.item_count}\n\nWe will process your order shortly.\n\nThank you for shopping with CommerceX!`;
        
        if (data.order_id) {
          const { data: order } = await supabaseAdmin.from('orders').select('user_id').eq('id', data.order_id).single();
          if (order?.user_id) {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
            recipientEmail = authUser?.user?.email || '';
          }
        }
        break;
      }
      default:
        return new Response(JSON.stringify({ error: 'Unknown notification type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let emailResult = { sent: false, reason: 'No recipient' };
    if (recipientEmail) {
      emailResult = await sendEmail(recipientEmail, subject, body);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification processed',
      email_sent: emailResult.sent,
      subject,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-notification] Error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
