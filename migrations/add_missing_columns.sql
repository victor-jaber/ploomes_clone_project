-- Script para adicionar colunas faltantes - Hermes CRM
-- Execute no banco de dados de produção

-- Adicionar colunas faltantes na tabela todos_advogados_infos
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS estado VARCHAR(2);
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS celular VARCHAR(20);
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS valor_causa NUMERIC(12, 2);
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS cnj VARCHAR(30);
ALTER TABLE todos_advogados_infos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Adicionar coluna todos_advogados_infos_id na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS todos_advogados_infos_id VARCHAR REFERENCES todos_advogados_infos(id) ON DELETE CASCADE;
