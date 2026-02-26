import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// IPN callback from SSLCommerz - receives POST form data
Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = String(value); });

    const { tran_id, status, val_id, bank_tran_id } = params;

    console.log(`[SSLCommerz IPN] tran_id=${tran_id}, status=${status}, val_id=${val_id}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const siteUrl = Deno.env.get('SITE_URL') || 'https://ew-shop.lovable.app';

    if (!tran_id) {
      return Response.redirect(`${siteUrl}/payment/fail`, 302);
    }

    if (status === 'VALID' || status === 'VALIDATED') {
      // Read credentials from admin_settings
      const { data: pmRow } = await supabaseAdmin
        .from('admin_settings')
        .select('value')
        .eq('key', 'payment_methods')
        .single();

      const sslConfig = (pmRow?.value as any)?.sslcommerz;
      if (!sslConfig) {
        console.error('[SSLCommerz IPN] No SSLCommerz config found in admin_settings');
        await supabaseAdmin.from('orders').update({ status: 'payment_failed' }).eq('id', tran_id);
        return Response.redirect(`${siteUrl}/payment/fail?order_id=${tran_id}`, 302);
      }

      const STORE_ID = sslConfig.store_id;
      const STORE_PASSWD = sslConfig.store_password;
      const IS_SANDBOX = sslConfig.sandbox === true;

      const validationUrl = IS_SANDBOX
        ? `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${STORE_ID}&store_passwd=${STORE_PASSWD}&format=json`
        : `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${STORE_ID}&store_passwd=${STORE_PASSWD}&format=json`;

      const valRes = await fetch(validationUrl);
      const valData = await valRes.json();

      console.log(`[SSLCommerz IPN] Validation response status=${valData.status}`);

      if (valData.status === 'VALID' || valData.status === 'VALIDATED') {
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'confirmed',
            payment_method: 'sslcommerz',
            transaction_id: bank_tran_id || val_id || tran_id,
          })
          .eq('id', tran_id);

        // Send order confirmation email (best-effort)
        try {
          const { data: order } = await supabaseAdmin.from('orders').select('total, user_id').eq('id', tran_id).single();
          const { data: items } = await supabaseAdmin.from('order_items').select('id').eq('order_id', tran_id);
          
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            },
            body: JSON.stringify({
              type: 'order_confirmation',
              data: { order_id: tran_id, total: order?.total || 0, item_count: items?.length || 0 },
            }),
          });
        } catch (_e) { /* best-effort */ }

        return Response.redirect(`${siteUrl}/payment/success?order_id=${tran_id}`, 302);
      } else {
        await supabaseAdmin.from('orders').update({ status: 'payment_failed' }).eq('id', tran_id);
        return Response.redirect(`${siteUrl}/payment/fail?order_id=${tran_id}`, 302);
      }
    } else if (status === 'FAILED') {
      await supabaseAdmin.from('orders').update({ status: 'payment_failed' }).eq('id', tran_id);
      return Response.redirect(`${siteUrl}/payment/fail?order_id=${tran_id}`, 302);
    } else if (status === 'CANCELLED') {
      await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', tran_id);
      return Response.redirect(`${siteUrl}/payment/cancel?order_id=${tran_id}`, 302);
    }

    return Response.redirect(`${siteUrl}/payment/fail`, 302);
  } catch (error) {
    console.error('[SSLCommerz IPN] error:', error);
    const siteUrl = Deno.env.get('SITE_URL') || 'https://ew-shop.lovable.app';
    return Response.redirect(`${siteUrl}/payment/fail`, 302);
  }
});
