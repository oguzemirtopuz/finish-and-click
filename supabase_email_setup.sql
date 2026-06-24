-- ==============================================================================
-- TASK STATUS CHANGE → EMAIL NOTIFICATION SETUP
-- ==============================================================================
-- This script creates a PostgreSQL trigger that fires whenever a task's status
-- changes. It calls a Supabase Edge Function via pg_net to send email
-- notifications to all workspace members (excluding the person who made the change).
--
-- PREREQUISITES:
--   1. Enable the "pg_net" extension in Supabase Dashboard → Database → Extensions
--   2. Deploy the Edge Function: supabase/functions/send-status-email
--   3. Set the RESEND_API_KEY secret in Supabase Edge Function settings
--   4. Replace <YOUR_SUPABASE_URL> and <YOUR_SERVICE_ROLE_KEY> below
-- ==============================================================================


-- ─── Step 1: Enable pg_net extension ─────────────────────────────────────────
-- (You can also do this from Dashboard → Database → Extensions → pg_net → Enable)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- ─── Step 2: Create the trigger function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID;
  v_supabase_url TEXT := 'https://bbdyrhuluflyuvzzshny.supabase.co';           -- e.g. https://xxxx.supabase.co
  v_service_role_key TEXT := '<YOUR_SUPABASE_SERVICE_ROLE_KEY>';    -- Supabase service_role key
BEGIN
  -- Only fire when status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- Get the authenticated user who made the change (available via Supabase RLS context)
    v_changed_by := auth.uid();

    -- Send async HTTP POST to the Edge Function via pg_net
    PERFORM net.http_post(
      url     := v_supabase_url || '/functions/v1/send-status-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body    := jsonb_build_object(
        'task_id',     NEW.id,
        'task_title',  NEW.title,
        'old_status',  OLD.status,
        'new_status',  NEW.status,
        'group_id',    NEW.group_id,
        'parent_id',   NEW.parent_id,
        'changed_by',  v_changed_by
      )
    );

    RAISE LOG '[notify_task_status_change] Task "%" status: % → % (by %)',
      NEW.title, OLD.status, NEW.status, v_changed_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── Step 3: Create the trigger on the tasks table ───────────────────────────
-- Drop first if it already exists (safe to re-run)
DROP TRIGGER IF EXISTS on_task_status_change ON public.tasks;

CREATE TRIGGER on_task_status_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_status_change();


-- ─── Done! ───────────────────────────────────────────────────────────────────
-- Now whenever a task's status column changes, the trigger will fire and
-- call the Edge Function to send email notifications.
-- ==============================================================================
