// Idempotent HTML tag stripper. Applies the tag regex repeatedly until the
// string stops changing, so malformed nested tags like `<<script>script>` —
// which a single pass would leave as `<script>` — are fully removed.
export function stripHtml(html: string): string {
  if (!html) return "";
  let prev = "";
  let s = html;
  while (s !== prev) {
    prev = s;
    s = s.replace(/<[^>]*>/g, "");
  }
  return s.replace(/\s+/g, " ").trim();
}
