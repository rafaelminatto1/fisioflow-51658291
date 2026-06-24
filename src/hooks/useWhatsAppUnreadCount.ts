import { useQuery } from "@tanstack/react-query";
import { fetchUnreadCount } from "@/services/whatsapp-api";

/**
 * Total de mensagens não lidas do CRM·WhatsApp (conversas abertas/pendentes).
 * Usado para o badge no Sidebar. Faz polling leve a cada 30s.
 */
export function useWhatsAppUnreadCount() {
  const { data } = useQuery({
    queryKey: ["whatsapp", "unread-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    retry: false,
  });

  return data ?? 0;
}
