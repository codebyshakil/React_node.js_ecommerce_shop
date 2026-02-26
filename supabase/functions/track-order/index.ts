import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id, phone, email } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Track by order ID
    if (order_id && order_id.trim()) {
      const trimmedId = order_id.trim().toLowerCase();
      
      // Try exact UUID match first
      let order = null;
      const { data: exactMatch } = await supabase
        .from("orders")
        .select("id, status, payment_status, created_at, total, payment_method")
        .eq("id", trimmedId)
        .maybeSingle();
      
      order = exactMatch;

      // If no exact match, try partial ID match (first 8 chars shown in UI)
      if (!order && trimmedId.length >= 6) {
        const { data: partialMatches } = await supabase
          .rpc("find_order_by_partial_id", { partial_id: trimmedId });
        
        if (partialMatches && partialMatches.length > 0) {
          order = {
            id: partialMatches[0].id,
            status: partialMatches[0].status,
            payment_status: partialMatches[0].payment_status,
            created_at: partialMatches[0].created_at,
            total: partialMatches[0].total,
            payment_method: partialMatches[0].payment_method,
          };
        }
      }

      if (!order) {
        return new Response(JSON.stringify({ orders: [], message: "Order not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get order items with product info
      const { data: items } = await supabase
        .from("order_items")
        .select("product_name, quantity, price, variation, product_id")
        .eq("order_id", order.id);

      // Get product images
      const productIds = (items || []).map((i: any) => i.product_id).filter(Boolean);
      let productImages: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, image_url")
          .in("id", productIds);
        if (products) {
          for (const p of products) {
            productImages[p.id] = p.image_url || "";
          }
        }
      }

      const enrichedItems = (items || []).map((item: any) => ({
        ...item,
        image_url: item.product_id ? productImages[item.product_id] || "" : "",
      }));

      return new Response(
        JSON.stringify({
          orders: [{ ...order, items: enrichedItems }],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Track by phone or email
    if (phone || email) {
      let userIds: string[] = [];

      if (phone) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("phone", phone.trim());
        userIds = (profiles || []).map((p: any) => p.user_id);
      } else if (email) {
        // Look up by email in auth - use admin API
        const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const matched = (authUsers?.users || []).filter(
          (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()
        );
        userIds = matched.map((u: any) => u.id);
      }

      if (userIds.length === 0) {
        return new Response(JSON.stringify({ orders: [], message: "No orders found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get non-delivered orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, payment_status, created_at, total, payment_method")
        .in("user_id", userIds)
        .neq("status", "delivered")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!orders || orders.length === 0) {
        return new Response(JSON.stringify({ orders: [], message: "No active orders found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get items for all orders
      const orderIds = orders.map((o: any) => o.id);
      const { data: allItems } = await supabase
        .from("order_items")
        .select("order_id, product_name, quantity, price, variation, product_id")
        .in("order_id", orderIds);

      // Get product images
      const productIds = [...new Set((allItems || []).map((i: any) => i.product_id).filter(Boolean))];
      let productImages: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, image_url")
          .in("id", productIds);
        if (products) {
          for (const p of products) {
            productImages[p.id] = p.image_url || "";
          }
        }
      }

      const enrichedOrders = orders.map((order: any) => ({
        ...order,
        items: (allItems || [])
          .filter((i: any) => i.order_id === order.id)
          .map((item: any) => ({
            ...item,
            image_url: item.product_id ? productImages[item.product_id] || "" : "",
          })),
      }));

      return new Response(JSON.stringify({ orders: enrichedOrders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ orders: [], message: "Please provide order ID, phone, or email" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
