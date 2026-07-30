/** Remove caches locais de colaboração de notas no encerramento da sessão. */
export async function clearNotesOfflinePersistence(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const databases = typeof indexedDB.databases === "function" ? await indexedDB.databases() : [];
  await Promise.all(
    databases
      .map((database) => database.name)
      .filter((name): name is string => Boolean(name?.startsWith("notes:")))
      .map((name) => new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = request.onerror = request.onblocked = () => resolve();
      })),
  );
}
