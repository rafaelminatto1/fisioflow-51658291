export interface StatusItem {
  status: string;
  key?: string;
}

export function aggregateStatus(items: StatusItem[]): {
  errors: number;
  pending: number;
  errorKeys: string[];
} {
  let errors = 0;
  let pending = 0;
  const errorKeys: string[] = [];
  for (const it of items) {
    if (it.status === "error") {
      errors++;
      if (it.key) errorKeys.push(it.key);
    } else if (it.status === "running" || it.status === "queued") {
      pending++;
    }
  }
  return { errors, pending, errorKeys };
}
