// =============================================================================
// Supabase Edge Function: send-status-email
// Sends email notifications to workspace members when a task status changes.
// Triggered by a PostgreSQL trigger via pg_net.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Types ---
interface StatusChangePayload {
  task_id: string;
  task_title: string;
  old_status: string;
  new_status: string;
  group_id: string;
  parent_id: string | null;
  changed_by: string | null;
}

// --- Constants ---
const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  stuck: "Stuck",
  waiting: "Waiting",
  test: "Test",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "#c4c4c4",
  in_progress: "#fdab3d",
  done: "#00c875",
  stuck: "#df2f4a",
  waiting: "#a25ddc",
  test: "#f39c12",
};

// --- Main Handler ---
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload: StatusChangePayload = await req.json();
    const { task_id, task_title, old_status, new_status, group_id, parent_id, changed_by } =
      payload;

    console.log(
      `[send-status-email] Task "${task_title}" status: ${old_status} → ${new_status}`
    );

    // Environment variables (auto-injected by Supabase)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not set");
      return jsonResponse({ error: "RESEND_API_KEY not configured" }, 500);
    }

    // Admin client bypasses RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── 1. Get task group → workspace ────────────────────────────────────
    const { data: group, error: groupErr } = await supabase
      .from("task_groups")
      .select("workspace_id, name")
      .eq("id", group_id)
      .single();

    if (groupErr || !group) {
      console.error("Group not found:", groupErr);
      return jsonResponse({ error: "Group not found" }, 404);
    }

    // ── 2. Get workspace info ────────────────────────────────────────────
    const { data: workspace, error: wsErr } = await supabase
      .from("workspaces")
      .select("name, owner_id")
      .eq("id", group.workspace_id)
      .single();

    if (wsErr || !workspace) {
      console.error("Workspace not found:", wsErr);
      return jsonResponse({ error: "Workspace not found" }, 404);
    }

    // ── 3. Collect all member emails (excluding the changer) ─────────────
    const emailSet = new Set<string>();

    // 3a. Get workspace member user_ids
    const { data: members, error: memberErr } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", group.workspace_id);

    if (memberErr) {
      console.error("Members fetch error:", memberErr);
      return jsonResponse({ error: "Members fetch error", details: JSON.stringify(memberErr) }, 500);
    }

    // 3b. Collect all user_ids (members + owner), excluding the changer
    const userIds = new Set<string>();
    for (const member of members || []) {
      if (member.user_id && member.user_id !== changed_by) {
        userIds.add(member.user_id);
      }
    }
    // Add workspace owner if not the changer
    if (workspace.owner_id && workspace.owner_id !== changed_by) {
      userIds.add(workspace.owner_id);
    }

    if (userIds.size === 0) {
      console.log("No recipients to notify");
      return jsonResponse({ message: "No recipients", sent: 0 });
    }

    // 3c. Fetch emails for all user_ids from profiles
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("email")
      .in("id", Array.from(userIds));

    if (profileErr) {
      console.error("Profiles fetch error:", profileErr);
      return jsonResponse({ error: "Profiles fetch error", details: JSON.stringify(profileErr) }, 500);
    }

    for (const profile of profiles || []) {
      if (profile.email) {
        emailSet.add(profile.email);
      }
    }

    const recipientEmails = Array.from(emailSet);

    if (recipientEmails.length === 0) {
      console.log("No recipients to notify (workspace may have only 1 member)");
      return jsonResponse({ message: "No recipients", sent: 0 });
    }

    // ── 4. Check if this is a subtask and get parent info ────────────────
    const isSubtask = !!parent_id;
    let parentTitle = "";
    if (isSubtask && parent_id) {
      const { data: parentTask } = await supabase
        .from("tasks")
        .select("title")
        .eq("id", parent_id)
        .single();
      parentTitle = parentTask?.title || "Unknown";
    }

    // ── 5. Build email ───────────────────────────────────────────────────
    const oldLabel = STATUS_LABELS[old_status] || old_status;
    const newLabel = STATUS_LABELS[new_status] || new_status;
    const taskType = isSubtask ? "Subtask" : "Task";

    const subject = `[${workspace.name}] ${taskType} Status Changed: ${task_title}`;
    const htmlBody = buildEmailHtml({
      workspaceName: workspace.name,
      groupName: group.name,
      taskTitle: task_title,
      taskType,
      parentTitle,
      oldStatus: oldLabel,
      newStatus: newLabel,
      oldStatusColor: STATUS_COLORS[old_status] || "#888",
      newStatusColor: STATUS_COLORS[new_status] || "#888",
    });

    // ── 6. Send via Resend API (Individually) ────────────────────────────
    let successCount = 0;
    let failCount = 0;
    const errors: any[] = [];

    const sendPromises = recipientEmails.map(async (email) => {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Finish & Click <onboarding@resend.dev>",
          to: email,
          subject,
          html: htmlBody,
        }),
      });

      if (!resendRes.ok) {
        const errBody = await resendRes.text();
        console.error(`Failed to send to ${email}:`, resendRes.status, errBody);
        errors.push({ email, error: errBody });
        failCount++;
      } else {
        successCount++;
      }
    });

    await Promise.allSettled(sendPromises);

    console.log(`Email sending complete. Success: ${successCount}, Failed: ${failCount}`);

    return jsonResponse({
      success: true,
      recipientsTotal: recipientEmails.length,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

// =============================================================================
// Helpers
// =============================================================================

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface EmailParams {
  workspaceName: string;
  groupName: string;
  taskTitle: string;
  taskType: string;
  parentTitle: string;
  oldStatus: string;
  newStatus: string;
  oldStatusColor: string;
  newStatusColor: string;
}

function buildEmailHtml(p: EmailParams): string {
  // Subtask line (only for subtasks)
  const subtaskRow = p.taskType === "Subtask"
    ? `
      <tr>
        <td style="padding:0 0 16px;">
          <span style="font-size:12px;color:#636e72;text-transform:uppercase;letter-spacing:0.5px;">Parent Task</span><br/>
          <span style="font-size:15px;color:#2d3436;font-weight:500;">${escapeHtml(p.parentTitle)}</span>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Status Changed</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f5;font-family:'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f0f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- Card -->
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c5ce7 0%,#a29bfe 100%);padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;">📋</span>
                    <span style="font-size:20px;font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px;">${p.taskType} Status Changed</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:8px;">
                    <span style="font-size:13px;color:rgba(255,255,255,0.85);">${escapeHtml(p.workspaceName)}&nbsp;&nbsp;•&nbsp;&nbsp;${escapeHtml(p.groupName)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <!-- Task type label -->
                <tr>
                  <td style="padding:0 0 4px;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#b2bec3;font-weight:600;">${p.taskType}</span>
                  </td>
                </tr>
                <!-- Task title -->
                <tr>
                  <td style="padding:0 0 20px;">
                    <span style="font-size:20px;font-weight:700;color:#2d3436;">${escapeHtml(p.taskTitle)}</span>
                  </td>
                </tr>
                <!-- Parent task (subtask only) -->
                ${subtaskRow}
                <!-- Status change -->
                <tr>
                  <td style="padding:0 0 4px;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#b2bec3;font-weight:600;">Status Change</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="display:inline-block;padding:7px 18px;border-radius:20px;font-size:13px;font-weight:700;color:#ffffff;background-color:${p.oldStatusColor};">${p.oldStatus}</span>
                        </td>
                        <td style="padding:0 14px;">
                          <span style="font-size:20px;color:#b2bec3;">→</span>
                        </td>
                        <td>
                          <span style="display:inline-block;padding:7px 18px;border-radius:20px;font-size:13px;font-weight:700;color:#ffffff;background-color:${p.newStatusColor};">${p.newStatus}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:18px 32px;background-color:#f8f9fa;border-top:1px solid #eef0f2;">
              <span style="font-size:11px;color:#b2bec3;line-height:1.5;">
                You received this notification because you are a member of the <strong>"${escapeHtml(p.workspaceName)}"</strong> workspace.<br/>
                Sent by Finish &amp; Click
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
