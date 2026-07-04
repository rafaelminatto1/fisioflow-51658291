-- Anexo do pedido médico no retorno
ALTER TABLE patient_medical_returns
  ADD COLUMN IF NOT EXISTS request_attachment_url TEXT;
