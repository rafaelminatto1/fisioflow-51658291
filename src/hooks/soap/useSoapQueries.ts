import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { sessionsApi } from "@/api/v2";
import { soapKeys, type SoapRecord } from "./types";

export const useSoapRecords = (patientId: string, limitValue = 10) => {
	return useQuery({
		queryKey: soapKeys.list(patientId, { limit: limitValue }),
		queryFn: async () => {
			const res = await sessionsApi.list({ patientId, limit: limitValue });
			return res.data as SoapRecord[];
		},
		enabled: !!patientId,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 20,
	});
};

export const useInfiniteSoapRecords = (patientId: string, limitValue = 20) => {
	return useInfiniteQuery({
		queryKey: [...soapKeys.lists(), patientId, "infinite"],
		queryFn: async ({ pageParam = 0 }) => {
			const res = await sessionsApi.list({
				patientId,
				limit: limitValue,
				offset: (pageParam as number) * limitValue,
			});
			return res.data as SoapRecord[];
		},
		initialPageParam: 0,
		enabled: !!patientId,
		getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
			(lastPageParam as number) + 1,
		staleTime: 1000 * 60 * 5,
	});
};

export const useSoapRecord = (recordId: string) => {
	return useQuery({
		queryKey: soapKeys.detail(recordId),
		queryFn: async () => {
			const res = await sessionsApi.get(recordId);
			return res.data as SoapRecord;
		},
		enabled: !!recordId,
		staleTime: 1000 * 60 * 10,
	});
};

export const useDraftSoapRecords = (patientId: string) => {
	return useQuery({
		queryKey: soapKeys.drafts(patientId),
		queryFn: async () => {
			const res = await sessionsApi.list({ patientId, status: "draft" });
			return res.data as SoapRecord[];
		},
		enabled: !!patientId,
		staleTime: 1000 * 60 * 2,
	});
};

export const useDraftSoapRecordByAppointment = (
	patientId: string,
	appointmentId: string | undefined,
) => {
	return useQuery({
		queryKey: [...soapKeys.drafts(patientId), "byAppointment", appointmentId],
		queryFn: async () => {
			if (!appointmentId) return null;
			const res = await sessionsApi.list({
				patientId,
				appointmentId,
				status: "draft",
				limit: 1,
			});
			return (res.data[0] as SoapRecord) ?? null;
		},
		enabled: !!patientId && !!appointmentId,
		staleTime: 1000 * 60 * 2,
	});
};
