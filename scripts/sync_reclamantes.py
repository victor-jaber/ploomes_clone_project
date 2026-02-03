#!/usr/bin/env python3
"""
Script para sincronizar reclamantes da API externa para o banco de dados.
Execute este script localmente (onde você tem acesso VPN à API).

Este script:
1. Busca CNJs dos advogados cadastrados
2. Consulta a API externa para obter detalhes do processo
3. Extrai os reclamantes (AUTOR) e insere na tabela reclamantes
4. Cria leads no pipeline de Reclamantes (com flag para evitar duplicação)

Requisitos:
pip install psycopg2-binary requests

Uso:
python sync_reclamantes.py

Configuração:
Defina a variável de ambiente DATABASE_URL ou edite a URL abaixo.
"""

import os
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import uuid
import sys
import time

DATABASE_URL = os.getenv("DATABASE_URL", "postgres://postgres:NkkxEHRzrllRvfM0hRMaeR5mTVeM0gQpz8apUFb13qtow3v618zm71Uc1lGLBSqq@72.62.107.161:5433/postgres")
API_URL = os.getenv("API_URL", "http://10.15.0.1:8001/api/v1/processo/details")

def get_connection():
    """Conecta ao banco de dados PostgreSQL."""
    return psycopg2.connect(DATABASE_URL)

def get_advogados_cnjs(conn):
    """Busca todos os CNJs únicos dos advogados cadastrados."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT DISTINCT cnj, id as advogado_id, owner_id
            FROM todos_advogados_infos 
            WHERE cnj IS NOT NULL AND cnj != ''
        """)
        return cur.fetchall()

def fetch_processo_details(cnj, max_retries=3):
    """Consulta a API externa para obter detalhes do processo pelo CNJ."""
    for attempt in range(max_retries):
        try:
            params = {"cnj": cnj}
            response = requests.get(API_URL, params=params, timeout=60)
            
            if response.status_code == 422:
                return {"status": "not_found", "data": None}
            
            if response.status_code == 404:
                return {"status": "not_found", "data": None}
            
            response.raise_for_status()
            return {"status": "ok", "data": response.json()}
            
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                print(f"  [RETRY] Timeout, tentando novamente ({attempt + 2}/{max_retries})...")
                time.sleep(2)
                continue
            return {"status": "timeout", "data": None}
            
        except requests.exceptions.ConnectionError:
            if attempt < max_retries - 1:
                print(f"  [RETRY] Erro de conexão, tentando novamente ({attempt + 2}/{max_retries})...")
                time.sleep(3)
                continue
            return {"status": "connection_error", "data": None}
            
        except requests.exceptions.RequestException as e:
            return {"status": "error", "data": None, "error": str(e)}
    
    return {"status": "error", "data": None}

def extract_documento(documentos):
    """Extrai o documento principal (CPF prioritário, depois RG ou CNPJ)."""
    if not documentos:
        return None
    
    cpf = None
    rg = None
    cnpj = None
    
    for doc in documentos:
        tipo = doc.get("tipo", "").upper()
        valor = doc.get("valor", "")
        
        if tipo == "CPF" and valor:
            cpf = valor
        elif tipo == "RG" and valor:
            rg = valor
        elif tipo == "CNPJ" and valor:
            cnpj = valor
    
    return cpf or rg or cnpj

def extract_reclamantes(data, cnj, owner_id):
    """Extrai os reclamantes (AUTOR) do JSON de resposta da API."""
    reclamantes = []
    
    try:
        processo = data.get("data", {}).get("processo", {})
        numero_cnj = processo.get("numero_cnj", cnj)
        valor_causa = processo.get("valor_causa")
        
        instancias = processo.get("instancias", [])
        
        for instancia in instancias:
            envolvidos = instancia.get("envolvidos", [])
            
            for envolvido in envolvidos:
                tipo = envolvido.get("tipo", "").upper()
                
                if tipo == "AUTOR":
                    parte = envolvido.get("parte", {})
                    nome = parte.get("nome", "")
                    documentos = parte.get("documentos", [])
                    documento = extract_documento(documentos)
                    
                    if nome:
                        reclamantes.append({
                            "nome": nome,
                            "cpf": documento,
                            "processo_numero": numero_cnj,
                            "valor_causa": valor_causa,
                            "owner_id": owner_id
                        })
    except Exception as e:
        print(f"  [ERRO] Falha ao extrair reclamantes: {e}")
    
    return reclamantes

def reclamante_exists(conn, nome, processo_numero):
    """Verifica se o reclamante já existe no banco e retorna o id se existir."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT id, enviado_para_pipeline FROM reclamantes 
            WHERE nome = %s AND processo_numero = %s
        """, (nome, processo_numero))
        return cur.fetchone()

def insert_reclamante(conn, reclamante):
    """Insere um reclamante no banco de dados e retorna o id."""
    existing = reclamante_exists(conn, reclamante["nome"], reclamante["processo_numero"])
    if existing:
        return {"inserted": False, "id": existing["id"], "enviado_para_pipeline": existing["enviado_para_pipeline"]}
    
    reclamante_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO reclamantes (id, nome, cpf, processo_numero, valor_causa, owner_id, enviado_para_pipeline, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            reclamante_id,
            reclamante["nome"],
            reclamante["cpf"],
            reclamante["processo_numero"],
            reclamante["valor_causa"],
            reclamante["owner_id"],
            False,
            datetime.now(),
            datetime.now()
        ))
    conn.commit()
    return {"inserted": True, "id": reclamante_id, "enviado_para_pipeline": False}

def create_lead_for_reclamante(conn, reclamante_id, reclamante_nome, valor_causa, owner_id):
    """Cria um lead no pipeline de reclamantes."""
    lead_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO leads (id, titulo, pipeline_type, stage, position, reclamante_id, valor, owner_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            lead_id,
            reclamante_nome,
            "reclamantes",
            "novo_lead",
            0,
            reclamante_id,
            valor_causa,
            owner_id,
            datetime.now(),
            datetime.now()
        ))
    conn.commit()
    return lead_id

def mark_as_sent_to_pipeline(conn, reclamante_id):
    """Marca o reclamante como enviado para o pipeline."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE reclamantes SET enviado_para_pipeline = true, updated_at = %s
            WHERE id = %s
        """, (datetime.now(), reclamante_id))
    conn.commit()

def get_default_owner_id(conn):
    """Busca um owner_id padrão (primeiro usuário do sistema)."""
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users LIMIT 1")
        result = cur.fetchone()
        if result:
            return result[0]
        return None

def print_summary(total_cnjs, total_inseridos, total_existentes, total_leads_criados, total_nao_encontrados, total_erros, interrupted=False):
    """Exibe o resumo da sincronização."""
    print()
    print("=" * 60)
    if interrupted:
        print("RESUMO (INTERROMPIDO)")
    else:
        print("RESUMO")
    print("=" * 60)
    print(f"Total de CNJs processados: {total_cnjs}")
    print(f"Reclamantes inseridos: {total_inseridos}")
    print(f"Reclamantes já existentes: {total_existentes}")
    print(f"Leads criados no pipeline: {total_leads_criados}")
    print(f"Processos não encontrados na API: {total_nao_encontrados}")
    print(f"Erros de conexão/API: {total_erros}")
    print()
    if interrupted:
        print("[INTERROMPIDO] Sincronização interrompida pelo usuário.")
    else:
        print("[CONCLUÍDO] Sincronização finalizada!")

def main():
    print("=" * 60)
    print("SINCRONIZAÇÃO DE RECLAMANTES + PIPELINE")
    print("=" * 60)
    print()
    
    print("[INFO] Conectando ao banco de dados...")
    try:
        conn = get_connection()
    except Exception as e:
        print(f"[ERRO] Falha ao conectar ao banco: {e}")
        sys.exit(1)
    print("[OK] Conectado!")
    print()
    
    default_owner_id = get_default_owner_id(conn)
    if not default_owner_id:
        print("[ERRO] Nenhum usuário encontrado no sistema. Crie um usuário primeiro.")
        conn.close()
        sys.exit(1)
    print(f"[INFO] Owner ID padrão: {default_owner_id}")
    print()
    
    print("[INFO] Buscando CNJs dos advogados...")
    advogados = get_advogados_cnjs(conn)
    if not advogados:
        print("[AVISO] Nenhum advogado com CNJ encontrado.")
        conn.close()
        return
    print(f"[OK] Encontrados {len(advogados)} CNJs para processar")
    print()
    
    total_inseridos = 0
    total_existentes = 0
    total_leads_criados = 0
    total_nao_encontrados = 0
    total_erros = 0
    processados = 0
    
    try:
        for i, advogado in enumerate(advogados, 1):
            cnj = advogado["cnj"]
            owner_id = advogado.get("owner_id") or default_owner_id
            print(f"[{i}/{len(advogados)}] Processando CNJ: {cnj}")
            processados = i
            
            result = fetch_processo_details(cnj)
            
            if result["status"] == "not_found":
                print(f"  [--] Processo não encontrado na API")
                total_nao_encontrados += 1
                continue
            
            if result["status"] in ("timeout", "connection_error", "error"):
                print(f"  [ERRO] {result.get('error', result['status'])}")
                total_erros += 1
                continue
            
            data = result["data"]
            if not data:
                total_erros += 1
                continue
            
            reclamantes = extract_reclamantes(data, cnj, owner_id)
            
            if not reclamantes:
                print(f"  [INFO] Nenhum reclamante encontrado")
                continue
            
            for reclamante in reclamantes:
                try:
                    result = insert_reclamante(conn, reclamante)
                    reclamante_id = result["id"]
                    
                    if result["inserted"]:
                        print(f"  [OK] Inserido: {reclamante['nome']} - {reclamante['cpf']}")
                        total_inseridos += 1
                    else:
                        print(f"  [SKIP] Já existe: {reclamante['nome']}")
                        total_existentes += 1
                    
                    if not result["enviado_para_pipeline"]:
                        try:
                            create_lead_for_reclamante(
                                conn, 
                                reclamante_id, 
                                reclamante["nome"], 
                                reclamante["valor_causa"], 
                                reclamante["owner_id"]
                            )
                            mark_as_sent_to_pipeline(conn, reclamante_id)
                            print(f"  [PIPELINE] Lead criado: {reclamante['nome']}")
                            total_leads_criados += 1
                        except Exception as e:
                            print(f"  [ERRO] Falha ao criar lead: {e}")
                            total_erros += 1
                    else:
                        print(f"  [PIPELINE] Já enviado anteriormente")
                        
                except Exception as e:
                    print(f"  [ERRO] Falha ao processar {reclamante['nome']}: {e}")
                    total_erros += 1
    
    except KeyboardInterrupt:
        print("\n\n[!] Interrupção detectada (Ctrl+C)")
        conn.close()
        print_summary(processados, total_inseridos, total_existentes, total_leads_criados, total_nao_encontrados, total_erros, interrupted=True)
        sys.exit(0)
    
    conn.close()
    print_summary(len(advogados), total_inseridos, total_existentes, total_leads_criados, total_nao_encontrados, total_erros)

if __name__ == "__main__":
    main()
