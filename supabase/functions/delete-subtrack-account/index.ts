import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

/**
 * Deletes only the authenticated caller's optional SubTrack account and backup.
 * The service-role credential is supplied by the Edge runtime and is never sent to the app.
 */
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response(405, { error: "Method not allowed" });

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return response(401, { error: "Sign in before deleting an account." });

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !anonKey || !serviceRoleKey) return response(500, { error: "Account deletion is not configured." });

  const caller = createClient(projectUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return response(401, { error: "Your session could not be verified." });

  const admin = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: backupError } = await admin.from("subtrack_sync_state").delete().eq("user_id", user.id);
  if (backupError) return response(500, { error: "Your cloud backup could not be removed. The account was not deleted." });

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return response(500, { error: "Your cloud account could not be deleted. Please try again." });
  return response(200, { deleted: true });
});
