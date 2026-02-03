# Scripts de Sincronização

## sync_reclamantes.py

Script para sincronizar reclamantes da API externa para o banco de dados.

### Pré-requisitos

1. Python 3.7+
2. Acesso VPN à rede interna (para acessar a API)
3. Instalar dependências:

```bash
pip install psycopg2-binary requests
```

### Como executar

1. Certifique-se de estar conectado à VPN
2. Execute o script:

```bash
cd scripts
python sync_reclamantes.py
```

### O que o script faz

1. Conecta ao banco de dados PostgreSQL
2. Busca todos os CNJs dos advogados cadastrados na tabela `todos_advogados_infos`
3. Para cada CNJ, consulta a API `http://10.15.0.1:8001/api/v1/processo/details`
4. Extrai os envolvidos do tipo "AUTOR" (reclamantes) com nome e documento (CPF/RG/CNPJ)
5. Insere os reclamantes na tabela `reclamantes` vinculando pelo número do processo (CNJ)

### Configurações

As configurações estão no início do arquivo:

- `DATABASE_URL`: URL de conexão com o PostgreSQL
- `API_URL`: Endpoint da API de processos

### Logs

O script exibe logs detalhados durante a execução:
- Quantos CNJs foram encontrados
- Progresso de cada CNJ processado
- Reclamantes inseridos ou já existentes
- Resumo final com totais
