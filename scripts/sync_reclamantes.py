#!/usr/bin/env python3
"""
Script para sincronizar reclamantes da API externa para o banco de dados.
Execute este script localmente (onde você tem acesso VPN à API).

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
import json
from datetime import datetime
import uuid
import sys

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

def fetch_processo_details(cnj):
    """Consulta a API externa para obter detalhes do processo pelo CNJ."""
    try:
        params = {"numero_cnj": cnj}
        response = requests.get(API_URL, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"  [ERRO] Falha ao consultar API para CNJ {cnj}: {e}")
        return None

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
    """Verifica se o reclamante já existe no banco."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id FROM reclamantes 
            WHERE nome = %s AND processo_numero = %s
        """, (nome, processo_numero))
        return cur.fetchone() is not None

def insert_reclamante(conn, reclamante):
    """Insere um reclamante no banco de dados."""
    if reclamante_exists(conn, reclamante["nome"], reclamante["processo_numero"]):
        return False
    
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO reclamantes (id, nome, cpf, processo_numero, valor_causa, owner_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            str(uuid.uuid4()),
            reclamante["nome"],
            reclamante["cpf"],
            reclamante["processo_numero"],
            reclamante["valor_causa"],
            reclamante["owner_id"],
            datetime.now(),
            datetime.now()
        ))
    conn.commit()
    return True

def get_default_owner_id(conn):
    """Busca um owner_id padrão (primeiro usuário do sistema)."""
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users LIMIT 1")
        result = cur.fetchone()
        if result:
            return result[0]
        return None

def main():
    print("=" * 60)
    print("SINCRONIZAÇÃO DE RECLAMANTES")
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
    total_erros = 0
    
    for i, advogado in enumerate(advogados, 1):
        cnj = advogado["cnj"]
        owner_id = advogado.get("owner_id") or default_owner_id
        print(f"[{i}/{len(advogados)}] Processando CNJ: {cnj}")
        
        data = fetch_processo_details(cnj)
        
        if not data:
            total_erros += 1
            continue
        
        reclamantes = extract_reclamantes(data, cnj, owner_id)
        
        if not reclamantes:
            print(f"  [INFO] Nenhum reclamante encontrado")
            continue
        
        for reclamante in reclamantes:
            try:
                inserted = insert_reclamante(conn, reclamante)
                if inserted:
                    print(f"  [OK] Inserido: {reclamante['nome']} - {reclamante['cpf']}")
                    total_inseridos += 1
                else:
                    print(f"  [SKIP] Reclamante já existe: {reclamante['nome']}")
                    total_existentes += 1
            except Exception as e:
                print(f"  [ERRO] Falha ao inserir {reclamante['nome']}: {e}")
                total_erros += 1
    
    conn.close()
    
    print()
    print("=" * 60)
    print("RESUMO")
    print("=" * 60)
    print(f"Total de CNJs processados: {len(advogados)}")
    print(f"Reclamantes inseridos: {total_inseridos}")
    print(f"Reclamantes já existentes: {total_existentes}")
    print(f"Erros: {total_erros}")
    print()
    print("[CONCLUÍDO] Sincronização finalizada!")

if __name__ == "__main__":
    main()
