import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patientsApi } from "@/api/v2/patients";
import { PatientService } from "@/services/patientService";
import { toast } from "@/hooks/use-toast";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { invalidatePatientCache } from "./usePatientCache";
import {
	sanitizeString,
	sanitizeEmail,
	cleanCPF,
	cleanPhone,
} from "@/lib/validations";
import type { PatientRow } from "@/types/workers";
import type { Patient, PatientCreateInput, PatientUpdateInput } from "./types";

/**
 * Create a new patient
 */
export const useCreatePatient = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: PatientCreateInput): Promise<Patient> => {
			// Sanitize data
			const sanitizedData = {
				name: sanitizeString(input.full_name, 200),
				full_name: sanitizeString(input.full_name, 200),
				email: input.email ? sanitizeEmail(input.email) : null,
				phone: input.phone ? cleanPhone(input.phone) : null,
				cpf: input.cpf ? cleanCPF(input.cpf) : null,
				birth_date: input.birth_date,
				gender: input.gender,
				address: input.address ? sanitizeString(input.address, 500) : null,
				city: input.city ? sanitizeString(input.city, 100) : null,
				state: input.state ? sanitizeString(input.state, 2) : null,
				zip_code: input.zip_code ? sanitizeString(input.zip_code, 10) : null,
				emergency_contact: input.emergency_contact
					? sanitizeString(input.emergency_contact, 200)
					: null,
				emergency_contact_relationship: input.emergency_contact_relationship
					? sanitizeString(input.emergency_contact_relationship, 100)
					: null,
				emergency_phone: input.emergency_phone
					? cleanPhone(input.emergency_phone)
					: null,
				medical_history: input.medical_history
					? sanitizeString(input.medical_history, 5000)
					: null,
				main_condition: sanitizeString(input.main_condition, 500),
				health_insurance: input.health_insurance
					? sanitizeString(input.health_insurance, 200)
					: null,
				insurance_number: input.insurance_number
					? sanitizeString(input.insurance_number, 100)
					: null,
				allergies: input.allergies
					? sanitizeString(input.allergies, 500)
					: null,
				medications: input.medications
					? sanitizeString(input.medications, 500)
					: null,
				weight_kg: input.weight_kg || null,
				height_cm: input.height_cm || null,
				blood_type: input.blood_type || null,
				marital_status: input.marital_status || null,
				profession: input.profession
					? sanitizeString(input.profession, 200)
					: null,
				education_level: input.education_level || null,
				observations: input.observations
					? sanitizeString(input.observations, 5000)
					: null,
				status: "active",
				progress: 0,
				organization_id: input.organization_id,
			};

			// Use Workers API backed by Neon/Postgres
			const response = await patientsApi.create(
				sanitizedData as Partial<PatientRow>,
			);
			return PatientService.mapToApp(response.data) as unknown as Patient;
		},
		onSuccess: async (data) => {
			// Dado sensível removido: nome completo mascarado para logs (LGPD)
			const firstName = data.full_name ? data.full_name.split(" ")[0] : "***";
			logger.info(
				"Paciente criado com sucesso",
				{ id: data.id, name: firstName },
				"useCreatePatient",
			);
			await invalidatePatientCache(queryClient, data.id);
			toast({
				title: "Paciente cadastrado!",
				description: `${data.full_name} foi adicionado com sucesso.`,
			});
		},
		onError: (error: Error) => {
			logger.error("Erro ao criar paciente", error, "useCreatePatient");
			let errorMessage = "Não foi possível cadastrar o paciente.";

			if (
				error.message.includes("duplicate key") ||
				error.message.includes("unique")
			) {
				errorMessage = "Já existe um paciente com este CPF ou email.";
			}

			toast({
				title: "Erro ao cadastrar",
				description: errorMessage,
				variant: "destructive",
			});
		},
	});
};

/**
 * Update an existing patient
 */
export const useUpdatePatient = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data: inputData,
		}: {
			id: string;
			data: PatientUpdateInput;
		}): Promise<Patient> => {
			// Sanitize data
			const sanitizedData: Record<string, any> = {
				updated_at: new Date().toISOString(),
			};

			if (inputData.full_name !== undefined)
				sanitizedData.full_name = sanitizeString(inputData.full_name, 200);
			if (inputData.email !== undefined)
				sanitizedData.email = inputData.email
					? sanitizeEmail(inputData.email)
					: null;
			if (inputData.phone !== undefined)
				sanitizedData.phone = inputData.phone
					? cleanPhone(inputData.phone)
					: null;
			if (inputData.cpf !== undefined)
				sanitizedData.cpf = inputData.cpf ? cleanCPF(inputData.cpf) : null;
			if (inputData.birth_date !== undefined)
				sanitizedData.birth_date = inputData.birth_date;
			if (inputData.gender !== undefined)
				sanitizedData.gender = inputData.gender;
			if (inputData.address !== undefined)
				sanitizedData.address = inputData.address
					? sanitizeString(inputData.address, 500)
					: null;
			if (inputData.city !== undefined)
				sanitizedData.city = inputData.city
					? sanitizeString(inputData.city, 100)
					: null;
			if (inputData.state !== undefined)
				sanitizedData.state = inputData.state
					? sanitizeString(inputData.state, 2)
					: null;
			if (inputData.zip_code !== undefined)
				sanitizedData.zip_code = inputData.zip_code
					? sanitizeString(inputData.zip_code, 10)
					: null;
			if (inputData.emergency_contact !== undefined)
				sanitizedData.emergency_contact = inputData.emergency_contact
					? sanitizeString(inputData.emergency_contact, 200)
					: null;
			if (inputData.emergency_contact_relationship !== undefined)
				sanitizedData.emergency_contact_relationship =
					inputData.emergency_contact_relationship
						? sanitizeString(inputData.emergency_contact_relationship, 100)
						: null;
			if (inputData.emergency_phone !== undefined)
				sanitizedData.emergency_phone = inputData.emergency_phone
					? cleanPhone(inputData.emergency_phone)
					: null;
			if (inputData.medical_history !== undefined)
				sanitizedData.medical_history = inputData.medical_history
					? sanitizeString(inputData.medical_history, 5000)
					: null;
			if (inputData.main_condition !== undefined)
				sanitizedData.main_condition = sanitizeString(
					inputData.main_condition,
					500,
				);
			if (inputData.health_insurance !== undefined)
				sanitizedData.health_insurance = inputData.health_insurance
					? sanitizeString(inputData.health_insurance, 200)
					: null;
			if (inputData.insurance_number !== undefined)
				sanitizedData.insurance_number = inputData.insurance_number
					? sanitizeString(inputData.insurance_number, 100)
					: null;
			if (inputData.allergies !== undefined)
				sanitizedData.allergies = inputData.allergies
					? sanitizeString(inputData.allergies, 500)
					: null;
			if (inputData.medications !== undefined)
				sanitizedData.medications = inputData.medications
					? sanitizeString(inputData.medications, 500)
					: null;
			if (inputData.weight_kg !== undefined)
				sanitizedData.weight_kg = inputData.weight_kg || null;
			if (inputData.height_cm !== undefined)
				sanitizedData.height_cm = inputData.height_cm || null;
			if (inputData.blood_type !== undefined)
				sanitizedData.blood_type = inputData.blood_type || null;
			if (inputData.marital_status !== undefined)
				sanitizedData.marital_status = inputData.marital_status || null;
			if (inputData.profession !== undefined)
				sanitizedData.profession = inputData.profession
					? sanitizeString(inputData.profession, 200)
					: null;
			if (inputData.education_level !== undefined)
				sanitizedData.education_level = inputData.education_level || null;
			if (inputData.observations !== undefined)
				sanitizedData.observations = inputData.observations
					? sanitizeString(inputData.observations, 5000)
					: null;
			if (inputData.status !== undefined)
				sanitizedData.status = inputData.status;
			if (inputData.progress !== undefined)
				sanitizedData.progress = inputData.progress;

			// Use Workers API backed by Neon/Postgres
			const response = await patientsApi.update(
				id,
				sanitizedData as Partial<PatientRow>,
			);
			return PatientService.mapToApp(response.data) as unknown as Patient;
		},
		onSuccess: async (data) => {
			logger.info(
				"Paciente atualizado com sucesso",
				{ id: data.id },
				"useUpdatePatient",
			);
			await invalidatePatientCache(queryClient, data.id);
			toast({
				title: "Paciente atualizado!",
				description: `As informações de ${data.full_name} foram atualizadas.`,
			});
		},
		onError: (error: Error) => {
			logger.error("Erro ao atualizar paciente", error, "useUpdatePatient");
			toast({
				title: "Erro ao atualizar",
				description: error.message || "Não foi possível atualizar o paciente.",
				variant: "destructive",
			});
		},
	});
};

/**
 * Delete a patient
 */
export const useDeletePatient = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await patientsApi.delete(id);
		},
		onSuccess: async (_, id) => {
			logger.info("Paciente arquivado com sucesso", { id }, "useDeletePatient");
			await invalidatePatientCache(queryClient, id);
			toast.success("Paciente arquivado", {
				description: "O paciente foi arquivado. Todos os dados foram preservados.",
			});
		},
		onError: (error: Error) => {
			logger.error("Erro ao arquivar paciente", error, "useDeletePatient");
			toast({
				title: "Erro ao arquivar",
				description: error.message || "Não foi possível arquivar o paciente.",
				variant: "destructive",
			});
		},
	});
};

/**
 * Update patient status
 */
export const useUpdatePatientStatus = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			status,
		}: {
			id: string;
			status: "Inicial" | "Em Tratamento" | "Recuperação" | "Concluído";
		}): Promise<Patient> => {
			const response = await patientsApi.update(id, {
				status,
			} as Partial<PatientRow>);
			return PatientService.mapToApp(response.data) as unknown as Patient;
		},
		onSuccess: async (data) => {
			await invalidatePatientCache(queryClient, data.id);
			toast({
				title: "Status atualizado",
				description: `O status do paciente foi alterado para ${data.status}.`,
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao atualizar status",
				description: error.message,
				variant: "destructive",
			});
		},
	});
};
