-- Script corrigido para adicionar coluna faltante na tabela leads
-- A coluna todos_advogados_infos.id é INTEGER, então a referência deve ser INTEGER também

ALTER TABLE leads ADD COLUMN IF NOT EXISTS todos_advogados_infos_id INTEGER REFERENCES todos_advogados_infos(id) ON DELETE CASCADE;
