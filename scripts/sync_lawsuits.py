#!/usr/bin/env python3
"""
Script para sincronizar processos (lawsuits) do banco externo
e enriquecer com dados da API de teses.
"""

import psycopg2
import requests
from requests.auth import HTTPBasicAuth
import json
import sys

# Configurações do banco externo (origem dos processos)
EXTERNAL_DB = {
    "host": "72.62.107.161",
    "port": 5433,
    "database": "postgres",
    "user": "postgres",
    "password": "NkkxEHRzrllRvfM0hRMaeR5mTVeM0gQpz8apUFb13qtow3v618zm71Uc1lGLBSqq"
}

# Configurações da API de teses
API_URL = "http://10.15.0.1:8005/api/v1/tese_advogado/tese_processos"
API_USERNAME = "technologies"
API_PASSWORD = "0WoOle0bfXRURWmApVkP"

# Configurações do banco local Hermes (destino)
import os
LOCAL_DB_URL = os.environ.get("DATABASE_URL")


def get_external_connection():
    """Conecta ao banco externo"""
    return psycopg2.connect(
        host=EXTERNAL_DB["host"],
        port=EXTERNAL_DB["port"],
        database=EXTERNAL_DB["database"],
        user=EXTERNAL_DB["user"],
        password=EXTERNAL_DB["password"]
    )


def get_local_connection():
    """Conecta ao banco local Hermes"""
    if not LOCAL_DB_URL:
        raise Exception("DATABASE_URL não configurada")
    return psycopg2.connect(LOCAL_DB_URL)


def get_lawyers_cpfs(local_conn):
    """Busca todos os CPFs dos advogados no sistema local"""
    cursor = local_conn.cursor()
    cursor.execute("SELECT id, cpf, nome FROM lawyers WHERE cpf IS NOT NULL AND cpf != ''")
    lawyers = cursor.fetchall()
    cursor.close()
    return lawyers


def fetch_lawsuits_from_api(cpf):
    """Busca processos da API externa usando o CPF"""
    try:
        response = requests.get(
            API_URL,
            params={"cpf": cpf},
            auth=HTTPBasicAuth(API_USERNAME, API_PASSWORD),
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  Erro API para CPF {cpf}: Status {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"  Erro de conexão para CPF {cpf}: {e}")
        return None


def create_lawsuits_table(local_conn):
    """Cria a tabela de processos se não existir"""
    cursor = local_conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lawsuits (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
            cnj VARCHAR(30),
            lawyer_id INTEGER REFERENCES lawyers(id) ON DELETE SET NULL,
            claimant_id VARCHAR REFERENCES claimants(id) ON DELETE SET NULL,
            law_firm_id VARCHAR REFERENCES law_firms(id) ON DELETE SET NULL,
            
            -- Dados do processo
            tribunal VARCHAR(100),
            vara VARCHAR(200),
            classe VARCHAR(200),
            assunto TEXT,
            status VARCHAR(100),
            valor_causa NUMERIC(12, 2),
            
            -- Partes
            autor TEXT,
            reu TEXT,
            
            -- Datas
            data_distribuicao TIMESTAMP,
            data_ultima_movimentacao TIMESTAMP,
            
            -- Dados da tese (API)
            tese_id VARCHAR(100),
            tese_nome TEXT,
            tese_descricao TEXT,
            probabilidade_sucesso NUMERIC(5, 2),
            valor_estimado NUMERIC(12, 2),
            
            -- Dados brutos da API
            api_data JSONB,
            
            -- Metadados
            owner_id VARCHAR NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            UNIQUE(cnj)
        )
    """)
    local_conn.commit()
    cursor.close()
    print("Tabela lawsuits criada/verificada com sucesso!")


def insert_lawsuit(local_conn, lawsuit_data, lawyer_id, owner_id):
    """Insere ou atualiza um processo no banco local"""
    cursor = local_conn.cursor()
    
    cursor.execute("""
        INSERT INTO lawsuits (
            cnj, lawyer_id, tribunal, vara, classe, assunto, status,
            valor_causa, autor, reu, data_distribuicao, data_ultima_movimentacao,
            tese_id, tese_nome, tese_descricao, probabilidade_sucesso, valor_estimado,
            api_data, owner_id
        ) VALUES (
            %(cnj)s, %(lawyer_id)s, %(tribunal)s, %(vara)s, %(classe)s, %(assunto)s, %(status)s,
            %(valor_causa)s, %(autor)s, %(reu)s, %(data_distribuicao)s, %(data_ultima_movimentacao)s,
            %(tese_id)s, %(tese_nome)s, %(tese_descricao)s, %(probabilidade_sucesso)s, %(valor_estimado)s,
            %(api_data)s, %(owner_id)s
        )
        ON CONFLICT (cnj) DO UPDATE SET
            tribunal = EXCLUDED.tribunal,
            vara = EXCLUDED.vara,
            classe = EXCLUDED.classe,
            assunto = EXCLUDED.assunto,
            status = EXCLUDED.status,
            valor_causa = EXCLUDED.valor_causa,
            autor = EXCLUDED.autor,
            reu = EXCLUDED.reu,
            data_distribuicao = EXCLUDED.data_distribuicao,
            data_ultima_movimentacao = EXCLUDED.data_ultima_movimentacao,
            tese_id = EXCLUDED.tese_id,
            tese_nome = EXCLUDED.tese_nome,
            tese_descricao = EXCLUDED.tese_descricao,
            probabilidade_sucesso = EXCLUDED.probabilidade_sucesso,
            valor_estimado = EXCLUDED.valor_estimado,
            api_data = EXCLUDED.api_data,
            updated_at = NOW()
    """, {
        "cnj": lawsuit_data.get("cnj") or lawsuit_data.get("numero_processo"),
        "lawyer_id": lawyer_id,
        "tribunal": lawsuit_data.get("tribunal"),
        "vara": lawsuit_data.get("vara"),
        "classe": lawsuit_data.get("classe"),
        "assunto": lawsuit_data.get("assunto"),
        "status": lawsuit_data.get("status"),
        "valor_causa": lawsuit_data.get("valor_causa"),
        "autor": lawsuit_data.get("autor"),
        "reu": lawsuit_data.get("reu"),
        "data_distribuicao": lawsuit_data.get("data_distribuicao"),
        "data_ultima_movimentacao": lawsuit_data.get("data_ultima_movimentacao"),
        "tese_id": lawsuit_data.get("tese_id"),
        "tese_nome": lawsuit_data.get("tese_nome") or lawsuit_data.get("tese"),
        "tese_descricao": lawsuit_data.get("tese_descricao"),
        "probabilidade_sucesso": lawsuit_data.get("probabilidade_sucesso"),
        "valor_estimado": lawsuit_data.get("valor_estimado"),
        "api_data": json.dumps(lawsuit_data),
        "owner_id": owner_id
    })
    
    local_conn.commit()
    cursor.close()


def sync_lawsuits():
    """Função principal de sincronização"""
    print("=" * 60)
    print("SINCRONIZAÇÃO DE PROCESSOS - HERMES CRM")
    print("=" * 60)
    
    # Conectar ao banco local
    print("\n1. Conectando ao banco Hermes...")
    local_conn = get_local_connection()
    print("   Conectado!")
    
    # Criar tabela se não existir
    print("\n2. Verificando tabela lawsuits...")
    create_lawsuits_table(local_conn)
    
    # Buscar advogados com CPF
    print("\n3. Buscando advogados...")
    lawyers = get_lawyers_cpfs(local_conn)
    print(f"   Encontrados {len(lawyers)} advogados com CPF")
    
    # Para cada advogado, buscar processos na API
    print("\n4. Buscando processos na API...")
    total_inserted = 0
    
    for lawyer_id, cpf, nome in lawyers:
        # Limpar CPF (remover pontos e traços)
        cpf_clean = cpf.replace(".", "").replace("-", "")
        
        print(f"\n   Advogado: {nome} (CPF: {cpf})")
        
        # Buscar processos na API
        result = fetch_lawsuits_from_api(cpf_clean)
        
        if result:
            processos = result if isinstance(result, list) else result.get("processos", [result])
            
            for processo in processos:
                try:
                    # Usar o owner_id do primeiro usuário (admin)
                    cursor = local_conn.cursor()
                    cursor.execute("SELECT id FROM users LIMIT 1")
                    owner = cursor.fetchone()
                    owner_id = owner[0] if owner else "system"
                    cursor.close()
                    
                    insert_lawsuit(local_conn, processo, lawyer_id, owner_id)
                    total_inserted += 1
                    print(f"      + Processo {processo.get('cnj') or processo.get('numero_processo', 'N/A')}")
                except Exception as e:
                    print(f"      Erro ao inserir processo: {e}")
        else:
            print("      Nenhum processo encontrado")
    
    print("\n" + "=" * 60)
    print(f"SINCRONIZAÇÃO CONCLUÍDA!")
    print(f"Total de processos inseridos/atualizados: {total_inserted}")
    print("=" * 60)
    
    local_conn.close()


if __name__ == "__main__":
    try:
        sync_lawsuits()
    except Exception as e:
        print(f"\nERRO FATAL: {e}")
        sys.exit(1)
