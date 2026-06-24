-- Reverter para VARCHAR(30) (pode falhar se já houver wa_id > 30 chars, ex: webchat).
ALTER TABLE whatsapp_contacts ALTER COLUMN wa_id TYPE varchar(30);
