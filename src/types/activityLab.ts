export interface ActivityLabPatient {
  id: string;
  full_name: string;
  name?: string; // alias
  birth_date: string;
  gender: 'masculino' | 'feminino';
  phone: string;
  email: string;
  cpf: string;
  status: 'active' | 'inactive';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  main_condition: string;
  notes?: string; // alias
  organization_id: string;
  incomplete_registration: boolean;
  source: 'activity_lab';
}

export interface RawForceDataPoint {
  value: number; // kg
  timestamp: number; // ms since start
}

export interface ActivityLabSession {
  id: string;
  patient_id: string;
  patientId?: string; // alias
  protocol_name: string;
  protocolName?: string; // alias
  exercise_name?: string; // alias
  body_part: string;
  bodyPart?: string; // alias
  muscle_group?: string; // alias
  side: 'LEFT' | 'RIGHT';
  test_type: 'isometric';
  created_at: string;
  createdAt?: string; // alias
  updated_at: string;
  peak_force: number;
  peakForce?: number; // alias
  max_force?: number; // alias
  avg_force: number;
  avgForce?: number; // alias
  mean_force?: number; // alias
  duration: number; // seconds
  rfd: number; // kg/s
  rateOfForceDevelopment?: number; // alias
  rate_of_force_development?: number; // alias
  sensitivity: number; // 1 to 5
  raw_force_data: RawForceDataPoint[];
  rawForceData?: RawForceDataPoint[]; // alias
  sample_rate: number; // Hz
  sampleRate?: number; // alias
  device_model: string;
  deviceModel?: string; // alias
  device_firmware: string;
  deviceFirmware?: string; // alias
  device_battery: number; // 0-100
  deviceBattery?: number; // alias
  measurement_mode: 'isometric';
  measurementMode?: string; // alias
  is_simulated: boolean;
  isSimulated?: boolean; // alias
  notes: string;
  organization_id: string;
  source: 'activity_lab';
}

export interface ActivityLabClinic {
  id: 'profile';
  clinic_name: string;
  name?: string; // alias
  professional_name: string;
  physioName?: string; // alias
  registration_number: string;
  crefito?: string; // alias
  updated_at: string;
  source: 'activity_lab';
}
