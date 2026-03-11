export function httpsCallable(_functions: unknown, name: string) {
  return async (_payload: unknown) => {
    throw new Error(`Callable '${name}' ainda não possui endpoint Cloudflare equivalente no app profissional.`);
  };
}
