// Exportações de autenticação
export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type LoginData,
  type RegisterData,
  type ForgotPasswordData,
  type ResetPasswordData,
  type ChangePasswordData
} from './auth';

// Exportações de pacientes
export {
  createPatientSchema,
  updatePatientSchema,
  searchPatientSchema,
  patientFiltersSchema,
  type CreatePatientData,
  type UpdatePatientData,
  type SearchPatientData,
  type PatientFiltersData
} from './patient';

// Exportações de exercícios
export {
  exerciseCategorySchema,
  exerciseSchema,
  createExerciseSchema,
  updateExerciseSchema,
  exerciseParameterSchema,
  planExerciseSchema,
  exerciseSessionSchema,
  treatmentPlanSchema,
  createTreatmentPlanSchema,
  updateTreatmentPlanSchema,
  exerciseSearchSchema,
  exerciseExecutionSchema,
  type ExerciseCategoryData,
  type ExerciseData,
  type CreateExerciseData,
  type UpdateExerciseData,
  type ExerciseParameterData,
  type PlanExerciseData,
  type ExerciseSessionData,
  type TreatmentPlanData,
  type CreateTreatmentPlanData,
  type UpdateTreatmentPlanData,
  type ExerciseSearchData,
  type ExerciseExecutionData
} from './exercise';

// Exportações de sessões
export {
  sessionScheduleSchema,
  updateSessionScheduleSchema,
  soapSubjectiveSchema,
  soapObjectiveSchema,
  soapAssessmentSchema,
  soapPlanSchema,
  soapRecordSchema,
  updateSoapRecordSchema,
  treatmentSessionSchema,
  searchSessionSchema,
  type SessionScheduleData,
  type UpdateSessionScheduleData,
  type SoapSubjectiveData,
  type SoapObjectiveData,
  type SoapAssessmentData,
  type SoapPlanData,
  type SoapRecordData,
  type UpdateSoapRecordData,
  type TreatmentSessionData,
  type SearchSessionData
} from './session';

// Exportações financeiras
export {
  pricingPlanSchema,
  invoiceSchema,
  paymentSchema,
  refundSchema,
  financialReportSchema,
  paymentSettingsSchema,
  searchTransactionSchema,
  type PricingPlanData,
  type InvoiceData,
  type PaymentData,
  type RefundData,
  type FinancialReportData,
  type PaymentSettingsData,
  type SearchTransactionData
} from './financial';

// Exportações comuns
export {
  paginationSchema,
  sortingSchema,
  dateRangeSchema,
  fileUploadSchema,
  userPreferencesSchema,
  addressSchema,
  contactSchema,
  searchSchema,
  clinicSettingsSchema,
  notificationSchema,
  validateCPF,
  validateCNPJ,
  formatCurrency,
  formatDate,
  type PaginationData,
  type SortingData,
  type DateRangeData,
  type FileUploadData,
  type UserPreferencesData,
  type AddressData,
  type ContactData,
  type SearchData,
  type ClinicSettingsData,
  type NotificationData
} from './common';

// Utilitários de validação
export const validationUtils = {
  // Validação de CPF
  isValidCPF: (cpf: string): boolean => {
    const numbers = cpf.replace(/[^\d]/g, '');
    if (numbers.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(numbers)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return parseInt(numbers[9]) === digit1 && parseInt(numbers[10]) === digit2;
  },

  // Validação de CNPJ
  isValidCNPJ: (cnpj: string): boolean => {
    const numbers = cnpj.replace(/[^\d]/g, '');
    if (numbers.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(numbers)) return false;
    
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(numbers[i]) * weights1[i];
    }
    let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(numbers[i]) * weights2[i];
    }
    let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return parseInt(numbers[12]) === digit1 && parseInt(numbers[13]) === digit2;
  },

  // Validação de email
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validação de telefone brasileiro
  isValidPhone: (phone: string): boolean => {
    const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/;
    return phoneRegex.test(phone);
  },

  // Validação de CEP
  isValidZipCode: (zipCode: string): boolean => {
    const zipRegex = /^\d{5}-\d{3}$/;
    return zipRegex.test(zipCode);
  },

  // Validação de senha forte
  isStrongPassword: (password: string): boolean => {
    // Pelo menos 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  },

  // Formatação de CPF
  formatCPF: (cpf: string): string => {
    const numbers = cpf.replace(/[^\d]/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },

  // Formatação de CNPJ
  formatCNPJ: (cnpj: string): string => {
    const numbers = cnpj.replace(/[^\d]/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  },

  // Formatação de telefone
  formatPhone: (phone: string): string => {
    const numbers = phone.replace(/[^\d]/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  },

  // Formatação de CEP
  formatZipCode: (zipCode: string): string => {
    const numbers = zipCode.replace(/[^\d]/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  },

  // Sanitização de string
  sanitizeString: (str: string): string => {
    return str.trim().replace(/\s+/g, ' ');
  },

  // Validação de idade mínima
  isMinimumAge: (birthDate: string, minimumAge: number): boolean => {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= minimumAge;
    }
    
    return age >= minimumAge;
  },

  // Validação de data futura
  isFutureDate: (date: string): boolean => {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate > today;
  },

  // Validação de data passada
  isPastDate: (date: string): boolean => {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return inputDate < today;
  },

  // Validação de horário comercial
  isBusinessHour: (time: string): boolean => {
    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startTime = 8 * 60; // 08:00
    const endTime = 18 * 60; // 18:00
    return timeInMinutes >= startTime && timeInMinutes <= endTime;
  }
};

// Mensagens de erro personalizadas
export const errorMessages = {
  required: 'Este campo é obrigatório',
  invalid: 'Valor inválido',
  tooShort: 'Muito curto',
  tooLong: 'Muito longo',
  invalidEmail: 'Email inválido',
  invalidPhone: 'Telefone inválido',
  invalidCPF: 'CPF inválido',
  invalidCNPJ: 'CNPJ inválido',
  invalidZipCode: 'CEP inválido',
  weakPassword: 'Senha muito fraca',
  passwordMismatch: 'Senhas não coincidem',
  invalidDate: 'Data inválida',
  futureDate: 'Data deve ser futura',
  pastDate: 'Data deve ser passada',
  minimumAge: 'Idade mínima não atendida',
  invalidTime: 'Horário inválido',
  businessHours: 'Fora do horário comercial',
  invalidUrl: 'URL inválida',
  invalidNumber: 'Número inválido',
  invalidRange: 'Valor fora do intervalo permitido'
};

// Configurações de validação
export const validationConfig = {
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  file: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      videos: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv']
    }
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },
  search: {
    minQueryLength: 1,
    maxQueryLength: 100
  }
};