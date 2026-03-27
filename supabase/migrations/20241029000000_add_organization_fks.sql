-- Adicionar chaves estrangeiras que faltavam para garantir a integridade de dados (Organizations -> Patients/Appointments)
ALTER TABLE appointments ADD CONSTRAINT appointments_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE patients ADD CONSTRAINT patients_organization_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
