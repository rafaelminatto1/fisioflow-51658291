import { fetchApi } from "./client";
import type { ApiResponse } from "@/types/api";

export interface ApiTelemedicineRoom {
  id: string;
  organization_id?: string;
  patient_id: string;
  patient_name?: string | null;
  room_name: string;
  livekit_token?: string | null;
  status: "waiting" | "active" | "ended";
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
  [key: string]: unknown;
}

export async function getTelemedicineRooms(): Promise<ApiTelemedicineRoom[]> {
  const response = await fetchApi<ApiResponse<ApiTelemedicineRoom[]>>("/api/telemedicine/rooms");
  return response.data || [];
}

export async function createTelemedicineRoom(patientId: string): Promise<ApiTelemedicineRoom> {
  const response = await fetchApi<ApiResponse<ApiTelemedicineRoom>>("/api/telemedicine/rooms", {
    method: "POST",
    data: { patient_id: patientId },
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function startTelemedicineRoom(id: string): Promise<ApiTelemedicineRoom> {
  const response = await fetchApi<ApiResponse<ApiTelemedicineRoom>>(
    `/api/telemedicine/rooms/${encodeURIComponent(id)}/start`,
    {
      method: "POST",
    },
  );
  if (response.error) throw new Error(response.error);
  return response.data;
}
