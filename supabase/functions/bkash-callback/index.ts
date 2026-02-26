import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// bKash callback handler - receives GET redirect after payment
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const paymentID = url.searchParams.get('paymentID');
    const status = url.searchParams.get('status');

    console.log(`[bKash Callback] paymentID=${paymentID}, status=${status}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const siteUrl = Deno.env.get('SITE_URL') || 'https://ew-shop.lovable.app';

    if (!paymentID) {
      return Response.redirect(`${siteUrl}/payment/fail`, 302);
    }

    // Find order by transaction_id (paymentID)
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, total, user_id')
      .eq('transaction_id', paymentID)
      .single();

    if (!order) {
      console.error('[bKash Callback] Order not found for paymentID:', paymentID);
      return Response.redirect(`${siteUrl}/payment/fail`, 302);
    }

    if (status === 'success') {
      // Read bKash credentials from admin_settings
      const { data: pmRow } = await supabaseAdmin
        .from('admin_settings')
        .select('value')
        .eq('key', 'payment_methods')
        .single();

      const bkashConfig = (pmRow?.value as any)?.bkash;
      if (!bkashConfig) {
        console.error('[bKash Callback] No bKash config found');
        return Response.redirect(`${siteUrl}/payment/fail?order_id=${order.id}`, 302);
      }

      const IS_SANDBOX = bkashConfig.sandbox === true;
      const baseUrl = IS_SANDBOX
        ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
        : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

      // Get token
      const tokenRes = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'username': bkashConfig.username,
          'password': bkashConfig.password,
        },
        body: JSON.stringify({
          app_key: bkashConfig.app_key,
          app_secret: bkashConfig.app_secret,
        }),
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.id_token) {
        console.error('[bKash Callback] Token grant failed');
        await supabaseAdmin.from('orders').update({ status: 'payment_failed' }).eq('id', order.id);
        return Response.redirect(`${siteUrl}/payment/fail?order_id=${order.id}`, 302);
      }

      // Execute payment
      const execRes = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': tokenData.id_token,
          'X-APP-Key': bkashConfig.app_key,
        },
        body: JSON.stringify({ paymentID }),
      });
      const execData = await execRes.json();
      console.log(`[bKash Callback] Execute response: statusCode=${execData.statusCode}, trxID=${execData.trxID}`);

      if (execData.statusCode === '0000' && execData.transactionStatus === 'Completed') {
        await supabaseAdmin.from('orders').update({
          status: 'confirmed',
          payment_method: 'bkash',
          transaction_id: execData.trxID || paymentID,
        }).eq('id', order.id);

        // Send order confirmation (best-effort)
        try {
          const { data: items } = await supabaseAdmin.from('order_items').select('id').eq('order_id', order.id);
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            },
            body: JSON.stringify({
              type: 'order_confirmation',
              data: { order_id: order.id, total: order.total, item_count: items?.length || 0 },
            }),
          });
        } catch (_e) { /* best-effort */ }

        return Response.redirect(`${siteUrl}/payment/success?order_id=${order.id}`, 302);
      } else {
        console.error('[bKash Callback] Execute failed:', JSON.stringify(execData));
        await supabaseAdmin.from('orders').update({ status: 'payment_failed' }).eq('id', order.id);
        return Response.redirect(`${siteUrl}/payment/fail?order_id=${order.id}`, 302);
      }
    } else if (status === 'cancel') {
      await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
      return Response.redirect(`${siteUrl}/payment/cancel?order_id=${order.id}`, 302);
    } else {
      await supabaseAdmin.from('orders').update({ status: 'payment_failed' }).eq('id', order.id);
      return Response.redirect(`${siteUrl}/payment/fail?order_id=${order.id}`, 302);
    }
  } catch (error) {
    console.error('[bKash Callback] Error:', error);
    const siteUrl = Deno.env.get('SITE_URL') || 'https://ew-shop.lovable.app';
    return Response.redirect(`${siteUrl}/payment/fail`, 302);
  }
});
