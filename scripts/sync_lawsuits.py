#!/usr/bin/env python3
"""
Script para sincronizar processos (lawsuits) da API de teses.
Busca por CPF de cada advogado cadastrado no sistema.
"""

import psycopg2
import requests
from requests.auth import HTTPBasicAuth
import json
import sys
import os
import re

# Configurações da API de teses
API_URL = "http://10.15.0.1:8005/api/v1/tese_advogado/tese_processos"
API_USERNAME = "technologies"
API_PASSWORD = "0WoOle0bfXRURWmApVkP"

# Configurações do banco local Hermes (destino)
LOCAL_DB_URL = os.environ.get("DATABASE_URL")


def normalize_cpf(cpf):
    """Remove pontos, traços e espaços do CPF para comparação"""
    if not cpf:
        return ""
    return re.sub(r'[.\-\s]', '', cpf)


def get_local_connection():
    """Conecta ao banco local Hermes"""
    if not LOCAL_DB_URL:
        raise Exception("DATABASE_URL não configurada")
    return psycopg2.connect(LOCAL_DB_URL)


def get_lawyers_map(local_conn):
    """Busca todos os advogados e cria um mapa por CPF normalizado"""
    cursor = local_conn.cursor()
    cursor.execute("SELECT id, cpf, nome FROM lawyers WHERE cpf IS NOT NULL AND cpf != ''")
    lawyers = cursor.fetchall()
    cursor.close()
    
    # Criar mapa: cpf_normalizado -> (id, cpf_original, nome)
    lawyers_map = {}
    for lawyer_id, cpf, nome in lawyers:
        cpf_norm = normalize_cpf(cpf)
        if cpf_norm:
            lawyers_map[cpf_norm] = (lawyer_id, cpf, nome)
    
    return lawyers_map


def get_default_owner_id(local_conn):
    """Busca o owner_id padrão (primeiro usuário)"""
    cursor = local_conn.cursor()
    cursor.execute("SELECT id FROM users LIMIT 1")
    owner = cursor.fetchone()
    cursor.close()
    return owner[0] if owner else "system"


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
            print(f"      Erro API: Status {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"      Erro de conexão: {e}")
        return None


def find_lawyer_id_from_processo(processo, lawyers_map):
    """Encontra o lawyer_id correto baseado nos advogados do processo"""
    advogados = processo.get("advogados", [])
    
    for adv in advogados:
        cpf_api = adv.get("cpf", "")
        cpf_norm = normalize_cpf(cpf_api)
        
        if cpf_norm in lawyers_map:
            return lawyers_map[cpf_norm][0]  # Retorna o lawyer_id
    
    return None


def insert_lawsuit(local_conn, processo, lawyer_id, owner_id):
    """Insere ou atualiza um processo no banco local"""
    cursor = local_conn.cursor()
    
    # Extrair dados dos reclamantes para autor
    reclamantes = processo.get("reclamantes", [])
    autor = ", ".join([r.get("nome", "") for r in reclamantes]) if reclamantes else None
    
    cursor.execute("""
        INSERT INTO lawsuits (
            cnj, lawyer_id, valor_causa, tese_id, autor, api_data, owner_id
        ) VALUES (
            %(cnj)s, %(lawyer_id)s, %(valor_causa)s, %(tese_id)s, %(autor)s, %(api_data)s, %(owner_id)s
        )
        ON CONFLICT (cnj) DO UPDATE SET
            lawyer_id = COALESCE(EXCLUDED.lawyer_id, lawsuits.lawyer_id),
            valor_causa = EXCLUDED.valor_causa,
            tese_id = EXCLUDED.tese_id,
            autor = EXCLUDED.autor,
            api_data = EXCLUDED.api_data,
            updated_at = NOW()
        RETURNING id
    """, {
        "cnj": processo.get("cnj"),
        "lawyer_id": lawyer_id,
        "valor_causa": processo.get("valor_causa"),
        "tese_id": str(processo.get("tese_id")) if processo.get("tese_id") else None,
        "autor": autor,
        "api_data": json.dumps(processo, ensure_ascii=False),
        "owner_id": owner_id
    })
    
    result = cursor.fetchone()
    local_conn.commit()
    cursor.close()
    return result[0] if result else None


def sync_lawsuits():
    """Função principal de sincronização"""
    print("=" * 60)
    print("SINCRONIZAÇÃO DE PROCESSOS - HERMES CRM")
    print("=" * 60)
    
    # Conectar ao banco local
    print("\n1. Conectando ao banco Hermes...")
    local_conn = get_local_connection()
    print("   Conectado!")
    
    # Buscar owner_id padrão
    owner_id = get_default_owner_id(local_conn)
    print(f"   Owner ID: {owner_id}")
    
    # Buscar advogados e criar mapa por CPF
    print("\n2. Buscando advogados...")
    lawyers_map = get_lawyers_map(local_conn)
    print(f"   Encontrados {len(lawyers_map)} advogados com CPF único")
    
    # Lista para armazenar CPFs únicos já consultados
    consulted_cpfs = set()
    all_processos = []
    
    # Para cada advogado, buscar processos na API
    print("\n3. Buscando processos na API...")
    
    for cpf_norm, (lawyer_id, cpf_original, nome) in lawyers_map.items():
        if cpf_norm in consulted_cpfs:
            continue
        consulted_cpfs.add(cpf_norm)
        
        print(f"\n   Consultando: {nome} (CPF: {cpf_original})")
        
        # Tentar com CPF original (formatado)
        result = fetch_lawsuits_from_api(cpf_original)
        
        # Se não encontrou, tentar sem formatação
        if not result or "data" not in result or len(result.get("data", [])) == 0:
            result = fetch_lawsuits_from_api(cpf_norm)
        
        if result and "data" in result:
            processos = result["data"]
            print(f"      Encontrados {len(processos)} processos")
            
            for processo in processos:
                all_processos.append(processo)
        else:
            print("      Nenhum processo encontrado")
    
    # Remover duplicatas por CNJ
    print(f"\n4. Processando {len(all_processos)} processos encontrados...")
    cnjs_inseridos = set()
    total_inserted = 0
    total_errors = 0
    total_no_lawyer = 0
    
    for processo in all_processos:
        cnj = processo.get("cnj")
        if not cnj:
            continue
        
        if cnj in cnjs_inseridos:
            continue
        
        try:
            # Encontrar o lawyer_id correto baseado no CPF do advogado no processo
            lawyer_id = find_lawyer_id_from_processo(processo, lawyers_map)
            
            if not lawyer_id:
                total_no_lawyer += 1
                # Ainda insere, mas sem lawyer_id
                print(f"   ? CNJ: {cnj} - Advogado não encontrado no sistema")
            
            lawsuit_id = insert_lawsuit(local_conn, processo, lawyer_id, owner_id)
            cnjs_inseridos.add(cnj)
            total_inserted += 1
            
            valor = processo.get("valor_causa", 0) or 0
            advogados = processo.get("advogados", [])
            adv_nomes = ", ".join([a.get("nome", "") for a in advogados[:2]])
            
            if lawyer_id:
                print(f"   + CNJ: {cnj} | Valor: R$ {valor:,.2f} | Advogado ID: {lawyer_id}")
            
        except Exception as e:
            total_errors += 1
            print(f"   X Erro ao inserir {cnj}: {e}")
    
    print("\n" + "=" * 60)
    print("SINCRONIZAÇÃO CONCLUÍDA!")
    print(f"Total de processos inseridos/atualizados: {total_inserted}")
    print(f"Processos sem advogado vinculado: {total_no_lawyer}")
    print(f"Total de erros: {total_errors}")
    print("=" * 60)
    
    local_conn.close()


if __name__ == "__main__":
    try:
        sync_lawsuits()
    except Exception as e:
        print(f"\nERRO FATAL: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
