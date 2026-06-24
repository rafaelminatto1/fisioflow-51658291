-- whatsapp_contacts.wa_id era VARCHAR(30), pequeno demais para o canal webchat,
-- cujo identificador é `web:` + UUID (36 chars) = 40 chars, estourando o limite e
-- causando 500 em todo visitante do widget do site. Também acomoda IGSIDs longos
-- do Instagram. Alargar para 64 (aumento de tamanho é não-destrutivo no Postgres).
ALTER TABLE whatsapp_contacts ALTER COLUMN wa_id TYPE varchar(64);
