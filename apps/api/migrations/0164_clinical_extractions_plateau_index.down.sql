-- Reverte 0164. Índice é aditivo: remover só devolve o Seq Scan e o sort em
-- disco, sem perda de dado.

DROP INDEX IF EXISTS idx_clinical_extractions_plateau;
DROP INDEX IF EXISTS idx_clinical_extractions_metricas;
