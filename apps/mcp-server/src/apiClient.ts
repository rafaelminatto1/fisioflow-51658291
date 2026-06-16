export async function fetchApi<T = unknown>(
  apiUrl: string,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!token) throw new Error("Não autenticado: token Bearer ausente.");
  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      detail = "";
    }
    throw new Error(`API ${path} falhou: ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  return (await res.json()) as T;
}
