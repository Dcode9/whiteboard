# WebBoard D'Verse Migration Notes

WebBoard should use the shared D'Verse Supabase project for cloud boards and identity.

## Shared Project

- URL: `https://gmwieijbrrztukqpfwkg.supabase.co`
- Publishable key: `sb_publishable_KX3MYtV84QJJdy9bPDuMEA_V99sLKSE`
- Primary tables: `webboard_boards`, `webboard_collaborators`, `webboard_snapshots`
- Asset bucket: `webboard-assets`

## Migration Direction

1. Keep local board fallback for offline mode.
2. Replace app-specific user ids with Supabase Auth user ids from the common D'Verse session.
3. Store board JSON in `webboard_boards.board_data`.
4. Store large previews/exports in `webboard-assets/<user-id>/...` instead of Postgres rows.
5. Use `webboard_collaborators` for shared boards.

All shared tables have RLS enabled in `dverse-production`.