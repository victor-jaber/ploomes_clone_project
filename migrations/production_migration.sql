-- Migration Script para Produção - Hermes CRM
-- Execute este script no banco de dados de produção

-- 1. Criar tabela todos_advogados_infos (se não existir)
CREATE TABLE IF NOT EXISTS todos_advogados_infos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf VARCHAR(14),
  nome TEXT NOT NULL,
  cnj VARCHAR(30),
  valor_causa NUMERIC(12, 2),
  email TEXT,
  telefone VARCHAR(20),
  celular VARCHAR(20),
  cep VARCHAR(10),
  estado VARCHAR(2),
  municipio TEXT,
  bairro TEXT,
  logradouro TEXT,
  numero VARCHAR(20),
  complemento TEXT,
  observacoes TEXT,
  owner_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Adicionar coluna todos_advogados_infos_id na tabela leads (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'todos_advogados_infos_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN todos_advogados_infos_id VARCHAR REFERENCES todos_advogados_infos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Verificar e adicionar colunas que podem estar faltando na tabela todos_advogados_infos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'todos_advogados_infos' AND column_name = 'observacoes') THEN
    ALTER TABLE todos_advogados_infos ADD COLUMN observacoes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'todos_advogados_infos' AND column_name = 'complemento') THEN
    ALTER TABLE todos_advogados_infos ADD COLUMN complemento TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'todos_advogados_infos' AND column_name = 'numero') THEN
    ALTER TABLE todos_advogados_infos ADD COLUMN numero VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'todos_advogados_infos' AND column_name = 'logradouro') THEN
    ALTER TABLE todos_advogados_infos ADD COLUMN logradouro TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'todos_advogados_infos' AND column_name = 'bairro') THEN
    ALTER TABLE todos_advogados_infos ADD COLUMN bairro TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'todos_advogados_infos' AND column_name = 'municipio') THEN
    ALTER TABLE todos_advogados_infos ADD COLUMN municipio TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'todos_advogados_infos' AND column_name = 'cep') THEN
    ALTER TABLE todos_advogados_infos ADD COLUMN cep VARCHAR(10);
  END IF;
END $$;

-- Verificação: Listar estrutura das tabelas atualizadas
SELECT 'todos_advogados_infos columns:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'todos_advogados_infos' ORDER BY ordinal_position;

SELECT 'leads todos_advogados_infos_id column:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'todos_advogados_infos_id';
