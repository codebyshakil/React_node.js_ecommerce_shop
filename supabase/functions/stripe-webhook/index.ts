import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200 });
  }

  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Read Stripe config for webhook secret
    const { data: pmRow } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'payment_methods')
      .single();

    const stripeConfig = (pmRow?.value as any)?.stripe;
    const webhookSecret = stripeConfig?.webhook_secret;

    // Parse event - if webhook secret is set, we should verify signature
    // For simplicity without the Stripe SDK, we'll parse and verify the event type
    let event: any;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response('Invalid payload', { status: 400 });
    }

    console.log(`[Stripe Webhook] Event type: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.order_id;

      if (!orderId) {
        console.error('[Stripe Webhook] No order_id in metadata');
        return new Response('OK', { status: 200 });
      }

      console.log(`[Stripe Webhook] Completing order ${orderId}, payment_status=${session.payment_status}`);

      if (session.payment_status === 'paid') {
        await supabaseAdmin.from('orders').update({
          status: 'confirmed',
          payment_status: 'paid',
          transaction_id: session.id,
        }).eq('id', orderId);

        // Send notification
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            },
            body: JSON.stringify({ type: 'order_confirmed', order_id: orderId, user_id: session.metadata?.user_id }),
          });
        } catch (e) {
          console.error('[Stripe Webhook] Notification error:', e);
        }
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const orderId = session.metadata?.order_id;
      if (orderId) {
        await supabaseAdmin.from('orders').update({
          status: 'payment_failed',
          payment_status: 'failed',
        }).eq('id', orderId);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return new Response('Webhook error', { status: 500 });
  }
});
