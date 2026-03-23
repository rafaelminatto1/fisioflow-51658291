/**
 * usePatientExams — Neon via Workers API
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/r2-storage";
import { examsApi, type PatientExam, type PatientExamFile } from "@/api/v2";
import { useAuth } from "@/contexts/AuthContext";

export type { PatientExam, PatientExamFile as ExamFile };

export const usePatientExams = (patientId?: string | null) => {
	const [exams, setExams] = useState<PatientExam[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const { profile } = useAuth();

	const fetchExams = useCallback(async () => {
		if (!patientId || !profile?.organization_id) {
			setIsLoading(false);
			return;
		}
		try {
			const res = await examsApi.list(patientId);
			setExams(res.data);
		} catch (e) {
			console.error("usePatientExams fetch error", e);
		} finally {
			setIsLoading(false);
		}
	}, [patientId, profile?.organization_id]);

	useEffect(() => {
		fetchExams();
	}, [fetchExams]);

	const addExam = async (
		data: { title: string; date: Date; type: string; description: string },
		files: File[],
	) => {
		if (!patientId) return false;
		try {
			const res = await examsApi.create({
				patient_id: patientId,
				title: data.title,
				exam_date: data.date.toISOString(),
				exam_type: data.type,
				description: data.description,
			});
			const examId = res.data.id;

			if (files.length > 0) {
				await Promise.all(
					files.map(async (file) => {
						const { publicUrl, key } = await uploadToR2(file, "patient-exams");
						await examsApi.addFile(examId, {
							file_path: key,
							file_name: file.name,
							file_type: file.type,
							file_size: file.size,
							storage_url: publicUrl,
						});
					}),
				);
			}

			toast.success("Exame salvo com sucesso");
			fetchExams();
			return true;
		} catch (error) {
			console.error("Error adding exam", error);
			toast.error("Erro ao salvar exame");
			return false;
		}
	};

	const deleteExam = async (examId: string) => {
		try {
			const res = await examsApi.delete(examId);
			if (res.deleted_files?.length) {
				await Promise.all(
					res.deleted_files.map((fp) => deleteFromR2(fp).catch(() => {})),
				);
			}
			toast.success("Exame removido");
			fetchExams();
		} catch (error) {
			console.error("Error deleting exam", error);
			toast.error("Erro ao remover exame");
		}
	};

	return { exams, isLoading, addExam, deleteExam };
};
