import type { Connection, ConnectionContext, WSMessage } from "partyserver";
import { YServer } from "y-partyserver";
import * as Y from "yjs";
import { seedYDocFromHtml, yDocToHtml } from "@fisioflow/evolution-editor-schema";
import { resolveJwtCandidate } from "../lib/auth";
import { getRawSql } from "../lib/db";
import type { Env } from "../types/env";

/** Estado persistido na conexão, inclusive após hibernação do Durable Object. */
type NotesConnectionState = {
  userId: string;
  organizationId: string;
  aclVersion: number;
  roles: string[];
};

type NoteAccess = {
  organization_id: string;
  owner_id: string;
  acl_version: number;
  can_edit: boolean;
};

function textProjection(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadEditableNote(
  env: Env,
  noteId: string,
  user: { uid: string; organizationId: string; role?: string; roles?: string[] },
): Promise<NoteAccess | null> {
  const roles = [...new Set([user.role, ...(user.roles ?? [])].filter((role): role is string => Boolean(role)))];
  const sql = getRawSql(env, "read");
  const result = await sql(
    `SELECT n.organization_id, n.owner_id, n.acl_version,
        EXISTS (
          SELECT 1
          FROM note_permissions p
          WHERE p.note_id = n.id
            AND p.organization_id = n.organization_id
            AND p.revoked_at IS NULL
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
            AND p.capabilities @> ARRAY['edit_content'::note_capability]
            AND (
              (p.subject_type = 'user' AND p.subject_id = $2)
              OR (p.subject_type = 'organization' AND p.subject_id = $3)
              OR (p.subject_type = 'role' AND p.subject_id = ANY($4::text[]))
            )
        ) AS can_edit
       FROM notes n
       WHERE n.id = $1 AND n.organization_id = $3 AND n.deleted_at IS NULL
       LIMIT 1`,
    [noteId, user.uid, user.organizationId, roles],
  );
  const note = result.rows?.[0] as NoteAccess | undefined;
  if (!note || (note.owner_id !== user.uid && !note.can_edit)) return null;
  return note;
}

/**
 * Sala Yjs por nota. O Y.Doc é a fonte canônica para edição colaborativa;
 * HTML/texto são projeções usadas pela leitura, busca e exportação da API.
 */
export class NotesCollaboration extends YServer<Env> {
  static callbackOptions = { debounceWait: 1500, debounceMaxWait: 8000 };

  async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
    const token = new URL(ctx.request.url).searchParams.get("token");
    const user = token ? await resolveJwtCandidate(this.env, token).catch(() => null) : null;
    if (!user) {
      connection.close(4401, "unauthorized");
      return;
    }

    const note = await loadEditableNote(this.env, this.name, user).catch((error) => {
      console.error("[NotesCollaboration] access lookup failed", error);
      return null;
    });
    if (!note) {
      connection.close(4403, "forbidden");
      return;
    }

    connection.setState({
      userId: user.uid,
      organizationId: user.organizationId,
      aclVersion: note.acl_version,
      roles: [...new Set([user.role, ...(user.roles ?? [])].filter((role): role is string => Boolean(role)))],
    } satisfies NotesConnectionState);
    await super.onConnect(connection, ctx);
  }

  /** Revalida a ACL antes de aceitar cada update, incluindo sockets hibernados. */
  override async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    const state = connection.state as NotesConnectionState | null;
    if (!state) {
      connection.close(4401, "missing connection state");
      return;
    }
    const note = await loadEditableNote(this.env, this.name, {
      uid: state.userId,
      organizationId: state.organizationId,
      roles: state.roles,
    }).catch(() => null);
    if (!note) {
      connection.close(4403, "permission revoked");
      return;
    }
    if (note.acl_version !== state.aclVersion) {
      connection.setState({ ...state, aclVersion: note.acl_version });
    }
    await super.onMessage(connection, message);
  }

  async onLoad(): Promise<void> {
    const sql = getRawSql(this.env, "read");
    const result = await sql(
      `SELECT yjs_state, content_html, content_text
       FROM notes WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [this.name],
    );
    const row = result.rows?.[0] as
      | { yjs_state?: Uint8Array | null; content_html?: string | null; content_text?: string | null }
      | undefined;
    const snapshot = row?.yjs_state;
    if (snapshot?.byteLength) Y.applyUpdate(this.document, snapshot);

    if (this.document.getXmlFragment("default").length === 0) {
      const seed = row?.content_html?.trim() || (row?.content_text?.trim() ? `<p>${row.content_text}</p>` : "");
      if (seed) {
        try {
          seedYDocFromHtml(this.document, seed);
        } catch (error) {
          console.error("[NotesCollaboration] unable to seed Y.Doc", error);
          this.env.ANALYTICS?.writeDataPoint?.({ blobs: ["notes_collab_seed_error", this.name], doubles: [1] });
        }
      }
    }
  }

  async onSave(): Promise<void> {
    try {
      const contentYdoc = Y.encodeStateAsUpdate(this.document);
      const contentHtml = yDocToHtml(this.document);
      const contentText = textProjection(contentHtml);
      const sql = getRawSql(this.env, "write");
      await sql(
        `UPDATE notes
         SET yjs_state = $1, content_html = $2, content_text = $3,
             updated_at = NOW(), last_auto_save_at = NOW(), metadata_version = metadata_version + 1
         WHERE id = $4 AND deleted_at IS NULL`,
        [contentYdoc, contentHtml, contentText, this.name],
      );
    } catch (error) {
      console.error("[NotesCollaboration] persistence failed", error);
      this.env.ANALYTICS?.writeDataPoint?.({ blobs: ["notes_collab_save_error", this.name], doubles: [1] });
    }
  }
}
