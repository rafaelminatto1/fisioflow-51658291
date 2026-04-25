import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { telemedicineApi, type TelemedicineRoomRecord } from "@/api/v2";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LiveKitRoom } from "@/components/telemedicine/LiveKitRoom";
import { useAuth } from "@/contexts/AuthContext";

export default function TelemedicineRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: room, isLoading } = useQuery({
    queryKey: ["telemedicine-room", roomId],
    queryFn: async () => {
      if (!roomId) return null;
      const res = await telemedicineApi.rooms.get(roomId);
      return (res?.data ?? null) as TelemedicineRoomRecord | null;
    },
    enabled: !!roomId,
  });

  return (
    <MainLayout compactPadding>
      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate("/telemedicine")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !room ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="font-medium">Sala não encontrada</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/telemedicine")}>
              Voltar para Telemedicina
            </Button>
          </div>
        ) : (
          <LiveKitRoom
            roomId={room.room_name ?? room.id}
            identity={profile?.id}
            displayName={profile?.full_name ?? "Fisioterapeuta"}
            role="therapist"
            onEnd={() => navigate("/telemedicine")}
          />
        )}
      </div>
    </MainLayout>
  );
}
