import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller identity using getUser
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = callerUser.id;

    // Check admin role
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Only admins can delete users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user_id === callerId) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Admin ${callerId} deleting user ${user_id}`);

    const errors: string[] = [];

    // 0. Delete coupon usage
    const { error: couponErr } = await supabaseAdmin
      .from("coupon_usage")
      .delete()
      .eq("user_id", user_id);
    if (couponErr) errors.push(`coupon_usage: ${couponErr.message}`);

    // 1. Delete order_items for user's orders
    const { data: userOrders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", user_id);
    
    if (userOrders && userOrders.length > 0) {
      const orderIds = userOrders.map(o => o.id);
      const { error } = await supabaseAdmin
        .from("order_items")
        .delete()
        .in("order_id", orderIds);
      if (error) errors.push(`order_items: ${error.message}`);
    }

    // 2. Delete orders
    const { error: ordersErr } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("user_id", user_id);
    if (ordersErr) errors.push(`orders: ${ordersErr.message}`);

    // 3. Delete cart items
    const { error: cartErr } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", user_id);
    if (cartErr) errors.push(`cart_items: ${cartErr.message}`);

    // 4. Delete product reviews
    const { error: reviewsErr } = await supabaseAdmin
      .from("product_reviews")
      .delete()
      .eq("user_id", user_id);
    if (reviewsErr) errors.push(`product_reviews: ${reviewsErr.message}`);

    // 5. Delete activity logs
    const { error: logsErr } = await supabaseAdmin
      .from("activity_logs")
      .delete()
      .eq("user_id", user_id);
    if (logsErr) errors.push(`activity_logs: ${logsErr.message}`);

    // 6. Delete user roles
    const { error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);
    if (rolesErr) errors.push(`user_roles: ${rolesErr.message}`);

    // 7. Delete profile
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", user_id);
    if (profileErr) errors.push(`profiles: ${profileErr.message}`);

    // 8. Delete auth user (removes email, sessions, everything)
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (authErr) errors.push(`auth: ${authErr.message}`);

    if (errors.length > 0) {
      console.error("Deletion errors:", errors);
      return new Response(JSON.stringify({ 
        error: "Some data could not be deleted", 
        details: errors 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`User ${user_id} fully deleted`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
