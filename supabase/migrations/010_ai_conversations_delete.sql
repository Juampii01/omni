-- ============================================================
-- Omni — Migration 010 — Allow users to delete own AI conversations
-- ============================================================

create policy "Users can delete own conversations"
  on public.ai_conversations for delete
  using (user_id = auth.uid());
