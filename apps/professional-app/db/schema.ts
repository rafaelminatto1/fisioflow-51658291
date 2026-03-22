import { pgTable, sql } from "drizzle-orm/pg-core";

export const patients = pgTable("patients", {
  id: pgCore.text("id").primaryKey().defaultRandom(),
  professionalId: pgCore.text("professional_id").notNull(),
  name: pgCore.text("name").notNull(),
  email: pgCore.text("email"),
  phone: pgCore.text("phone"),
  birthDate: pgCore.text("birth_date"),
  mainCondition: pgCore.text("main_condition"),
  observations: pgCore.text("observations"),
  diagnosis: pgCore.text("diagnosis"),
  status: pgCore.text("status").notNull().default("active"),
  isActive: pgCore.boolean("is_active").notNull().default(true),
  createdAt: pgCore.text("created_at").notNull().defaultNow(),
  updatedAt: pgCore.text("updated_at").notNull().defaultNow(),
});

export const checkPatientNameDuplicate = sql("SELECT EXISTS (SELECT 1 FROM patients WHERE name = '" + pgCore.placeholder(1) + "' AND professional_id = '" + pgCore.placeholder(2) + "' AND is_active = true)");
