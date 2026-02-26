import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // For actions that modify user data, verify caller is admin
    const requiresAdmin = ["reset_password", "update_email"].includes(action) || !action;
    if (requiresAdmin) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: callerUser }, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (userErr || !callerUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: adminRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", callerUser.id).eq("role", "admin").maybeSingle();
      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Action: get_users_info - get email and verified status for users
    if (action === "get_users_info") {
      const { user_ids } = body;
      if (!user_ids || !Array.isArray(user_ids)) {
        return new Response(JSON.stringify({ error: "Missing user_ids array" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result: Record<string, { email: string; email_confirmed_at: string | null }> = {};
      for (const uid of user_ids.slice(0, 100)) {
        try {
          const { data: { user: u } } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (u) {
            result[uid] = { email: u.email || '', email_confirmed_at: u.email_confirmed_at || null };
          }
        } catch {}
      }
      return new Response(JSON.stringify({ users: result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: reset_password - change a user's password
    if (action === "reset_password") {
      const { user_id, new_password } = body;
      if (!user_id || !new_password) {
        return new Response(JSON.stringify({ error: "Missing user_id or new_password" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: new_password });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: update_email - change a user's email and/or verified status
    if (action === "update_email") {
      const { user_id, new_email, email_confirm } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const updateData: any = {};
      if (new_email) updateData.email = new_email;
      if (typeof email_confirm === "boolean") updateData.email_confirm = email_confirm;
      
      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: "Nothing to update" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, updateData);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Legacy: recreate admin user
    const { email, password } = body;
    console.log("Recreating admin user:", email);

    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = listData?.users?.find(u => u.email === email);
    
    if (existingUser) {
      const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (delError) {
        return new Response(JSON.stringify({ error: delError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: "Admin" },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newUser.user) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: newUser.user.id, role: "admin" }, { onConflict: "user_id,role" });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
