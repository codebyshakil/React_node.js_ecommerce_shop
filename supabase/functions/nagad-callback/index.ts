import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Nagad callback handler - receives GET redirect after payment
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    // Nagad sends various params; key ones are payment_ref_id, status, order_id
    const paymentRefId = url.searchParams.get('payment_ref_id') || url.searchParams.get('paymentRefId');
    const status = url.searchParams.get('status') || url.searchParams.get('status_code');
    const orderId = url.searchParams.get('order_id') || url.searchParams.get('orderId');

    console.log(`[Nagad Callback] paymentRefId=${paymentRefId}, status=${status}, orderId=${orderId}, fullUrl=${req.url}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const siteUrl = Deno.env.get('SITE_URL') || 'https://ew-shop.lovable.app';

    // Try to find the order - by payment ref in notes or by order_id param
    let order: any = null;

    if (orderId) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('id, total, user_id, notes')
        .eq('id', orderId)
        .single();
      order = data;
    }

    if (!order && paymentRefId) {
      // Search in notes for nagad_payment_ref
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id, total, user_id, notes, transaction_id')
        .order('created_at', { ascending: false })
        .limit(50);

      if (orders) {
        order = orders.find((o: any) => {
          try {
            const notes = typeof o.notes === 'string' ? JSON.parse(o.notes) : o.notes;
            return notes?.nagad_payment_ref === paymentRefId || notes?.nagad_trx_id === paymentRefId;
          } catch {
            return o.transaction_id === paymentRefId;
          }
        });
      }
    }

    if (!order) {
      console.error('[Nagad Callback] Order not found');
      return Response.redirect(`${siteUrl}/payment/fail`, 302);
    }

    const isSuccess = status === 'Success' || status === 'success' || status === '000';

    if (isSuccess) {
      // Verify payment with Nagad
      const { data: pmRow } = await supabaseAdmin
        .from('admin_settings')
        .select('value')
        .eq('key', 'payment_methods')
        .single();

      const nagadConfig = (pmRow?.value as any)?.nagad;

      if (nagadConfig) {
        const IS_SANDBOX = nagadConfig.sandbox === true;
        const baseUrl = IS_SANDBOX
          ? 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
          : 'https://api.mynagad.com/api/dfs';

        // Verify the payment
        try {
          const verifyUrl = `${baseUrl}/verify/payment/${paymentRefId}`;
          console.log(`[Nagad Callback] Verifying at: ${verifyUrl}`);

          const verifyRes = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-KM-Api-Version': 'v-0.2.0',
              'X-KM-IP-V4': '127.0.0.1',
              'X-KM-Client-Type': 'PC_WEB',
            },
          });

          const verifyData = await verifyRes.json();
          console.log(`[Nagad Callback] Verify response: status=${verifyData.status}, issuerPaymentRefNo=${verifyData.issuerPaymentRefNo}`);

          if (verifyData.status === 'Success') {
            await supabaseAdmin.from('orders').update({
              status: 'confirmed',
              payment_method: 'nagad',
              transaction_id: verifyData.issuerPaymentRefNo || paymentRefId,
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
            console.error('[Nagad Callback] Verify failed:', JSON.stringify(verifyData));
            await supabaseAdmin.from('orders').update({ status: 'payment_failed' }).eq('id', order.id);
            return Response.redirect(`${siteUrl}/payment/fail?order_id=${order.id}`, 302);
          }
        } catch (verifyErr) {
          console.error('[Nagad Callback] Verify error:', verifyErr);
          // Still mark as confirmed if status was success from callback
          await supabaseAdmin.from('orders').update({
            status: 'confirmed',
            payment_method: 'nagad',
            transaction_id: paymentRefId || '',
          }).eq('id', order.id);
          return Response.redirect(`${siteUrl}/payment/success?order_id=${order.id}`, 302);
        }
      } else {
        // No config but payment succeeded, mark confirmed
        await supabaseAdmin.from('orders').update({
          status: 'confirmed',
          payment_method: 'nagad',
          transaction_id: paymentRefId || '',
        }).eq('id', order.id);
        return Response.redirect(`${siteUrl}/payment/success?order_id=${order.id}`, 302);
      }
    } else if (status === 'Aborted' || status === 'cancel') {
      await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
      return Response.redirect(`${siteUrl}/payment/cancel?order_id=${order.id}`, 302);
    } else {
      await supabaseAdmin.from('orders').update({ status: 'payment_failed' }).eq('id', order.id);
      return Response.redirect(`${siteUrl}/payment/fail?order_id=${order.id}`, 302);
    }
  } catch (error) {
    console.error('[Nagad Callback] Error:', error);
    const siteUrl = Deno.env.get('SITE_URL') || 'https://ew-shop.lovable.app';
    return Response.redirect(`${siteUrl}/payment/fail`, 302);
  }
});
