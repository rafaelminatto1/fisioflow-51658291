import type { Meta, StoryObj } from "@storybook/react";
import { PatientCard } from "./PatientCard";
import type { Patient } from "@/schemas/patient";

const BASE_PATIENT: Patient = {
  id: "patient-001",
  name: "Ana Beatriz Silva",
  full_name: "Ana Beatriz Silva",
  email: "ana@example.com",
  phone: "(11) 99999-0001",
  birth_date: "1990-05-15",
  gender: "F",
  status: "active",
  main_condition: "Lombalgia crônica",
  organization_id: "org-001",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as unknown as Patient;

const BASE_STATS = {
  totalAppointments: 12,
  sessionsCompleted: 10,
  daysSinceLastAppointment: 3,
  firstEvaluationDate: new Date("2024-01-10"),
  classification: "regular" as const,
};

const meta = {
  title: "Patients/PatientCard",
  component: PatientCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PatientCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    patient: BASE_PATIENT,
    index: 0,
    onClick: () => alert("Paciente clicado!"),
    stats: BASE_STATS,
  },
};

export const WithoutStats: Story = {
  args: {
    patient: BASE_PATIENT,
    index: 0,
    onClick: () => {},
  },
};

export const NewPatient: Story = {
  args: {
    patient: {
      ...BASE_PATIENT,
      id: "patient-002",
      name: "Carlos Eduardo Ferreira",
      full_name: "Carlos Eduardo Ferreira",
      main_condition: "Pós-cirúrgico joelho",
    } as unknown as Patient,
    index: 1,
    onClick: () => {},
    stats: {
      ...BASE_STATS,
      totalAppointments: 2,
      sessionsCompleted: 1,
      daysSinceLastAppointment: 0,
      classification: "new" as const,
    },
  },
};

export const InactivePatient: Story = {
  args: {
    patient: {
      ...BASE_PATIENT,
      status: "inactive",
    } as unknown as Patient,
    index: 2,
    onClick: () => {},
    stats: {
      ...BASE_STATS,
      daysSinceLastAppointment: 95,
      classification: "inactive" as const,
    },
  },
};
