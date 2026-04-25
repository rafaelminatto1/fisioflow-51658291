import React, { useEffect, useMemo, useState } from "react";
import { History as HistoryIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { computeLineDiff, formatTimestamp } from "@/components/wiki/wikiEditorUtils";

interface WikiPageLike {
  id: string;
  content: string;
}

interface WikiPageVersionLike {
  id: string;
  version: number;
  content: string;
  comment?: string | null;
  created_at?: unknown;
}

function getVersionContent(
  page: WikiPageLike,
  versions: WikiPageVersionLike[],
  versionValue: string,
): string {
  if (versionValue === "current") {
    return page.content;
  }

  const version = versions.find((item) => String(item.version) === versionValue);
  return version?.content || "";
}

export function WikiHistoryDiff({
  page,
  versions,
}: {
  page: WikiPageLike;
  versions: WikiPageVersionLike[];
}) {
  const [baseVersion, setBaseVersion] = useState<string>("current");
  const [compareVersion, setCompareVersion] = useState<string>("current");

  useEffect(() => {
    if (versions.length > 0) {
      setBaseVersion(String(versions[0].version));
      setCompareVersion("current");
    } else {
      setBaseVersion("current");
      setCompareVersion("current");
    }
  }, [page.id, versions]);

  const diffLines = useMemo(() => {
    const baseContent = getVersionContent(page, versions, baseVersion);
    const compareContent = getVersionContent(page, versions, compareVersion);
    return computeLineDiff(baseContent, compareContent);
  }, [page, versions, baseVersion, compareVersion]);

  return (
    <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <HistoryIcon className="h-4 w-4" /> Historico e Diff Visual
        </h3>
        <Badge variant="secondary">{versions.length} versoes</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Base</Label>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={baseVersion}
            onChange={(event) => setBaseVersion(event.target.value)}
          >
            <option value="current">Atual</option>
            {versions.map((version) => (
              <option key={`base-${version.id}`} value={String(version.version)}>
                v{version.version} - {formatTimestamp(version.created_at)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Comparar com</Label>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={compareVersion}
            onChange={(event) => setCompareVersion(event.target.value)}
          >
            <option value="current">Atual</option>
            {versions.map((version) => (
              <option key={`compare-${version.id}`} value={String(version.version)}>
                v{version.version} - {formatTimestamp(version.created_at)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded-lg border bg-background font-mono text-xs">
        {diffLines.map((line, index) => (
          <div
            key={`${line.type}-${index}`}
            className={cn(
              "flex gap-2 border-b px-2 py-1 last:border-b-0",
              line.type === "added" &&
                "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
              line.type === "removed" &&
                "bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-100",
            )}
          >
            <span className="w-4 text-center">
              {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
            </span>
            <span className="whitespace-pre-wrap break-words">{line.text || " "}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Versoes disponiveis
        </h4>
        <div className="space-y-1">
          {versions.map((version) => (
            <div key={version.id} className="rounded-md border bg-background px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">Versao {version.version}</span>
                <span className="text-muted-foreground">{formatTimestamp(version.created_at)}</span>
              </div>
              {version.comment && <p className="mt-1 text-muted-foreground">{version.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
