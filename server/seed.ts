import bcrypt from "bcryptjs";
import { db } from "./db";
import {
  usuarios,
  enderecos,
  contatos,
  advogados,
  escritorios,
  reclamantes,
  processos,
  escritorioAdvogados,
  processoAdvogados,
  processoReclamantes,
  advogadoContatos,
  escritorioContatos,
  reclamanteContatos,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export async function seedUsers() {
  const [existing] = await db.select().from(usuarios).where(eq(usuarios.email, "admin@hermes.com"));
  if (existing) return;

  const senhaHash = await bcrypt.hash("admin123", 10);

  await db.insert(usuarios).values({
    nome: "Administrador",
    email: "admin@hermes.com",
    senha: senhaHash,
    preferencias: JSON.stringify({ tema: "escuro", idioma: "pt-BR" }),
  });

  console.log("Usuário admin criado: admin@hermes.com / admin123");
}

export async function seedData() {
  const [existingAdvogado] = await db.select({ count: sql<number>`count(*)` }).from(advogados);
  if (existingAdvogado.count > 0) return;

  const [admin] = await db.select().from(usuarios).where(eq(usuarios.email, "admin@hermes.com"));
  if (!admin) return;

  const ownerId = admin.id;

  const endAdv = await db.insert(enderecos).values([
    { cep: "01310-100", estado: "SP", municipio: "São Paulo", cidade: "São Paulo", bairro: "Bela Vista", logradouro: "Av. Paulista", numero: "1578", complemento: "Sala 1201" },
    { cep: "20040-020", estado: "RJ", municipio: "Rio de Janeiro", cidade: "Rio de Janeiro", bairro: "Centro", logradouro: "Av. Rio Branco", numero: "156", complemento: "14º andar" },
    { cep: "30130-000", estado: "MG", municipio: "Belo Horizonte", cidade: "Belo Horizonte", bairro: "Funcionários", logradouro: "Rua da Bahia", numero: "1148" },
    { cep: "80010-010", estado: "PR", municipio: "Curitiba", cidade: "Curitiba", bairro: "Centro", logradouro: "Rua XV de Novembro", numero: "700", complemento: "Conj. 504" },
    { cep: "90010-280", estado: "RS", municipio: "Porto Alegre", cidade: "Porto Alegre", bairro: "Centro Histórico", logradouro: "Rua dos Andradas", numero: "1234" },
  ]).returning();

  const contAdv = await db.insert(contatos).values([
    { email: "carlos.mendes@advocacia.com.br", telefone: "(11) 3256-7890", celular: "(11) 99876-5432" },
    { email: "ana.costa@direitotrabalhista.com", telefone: "(21) 2233-4455", celular: "(21) 98765-1234" },
    { email: "roberto.silva@silvaadvogados.com", telefone: "(31) 3344-5566", celular: "(31) 97654-3210" },
    { email: "fernanda.lima@limalegal.com.br", telefone: "(41) 3456-7890", celular: "(41) 99543-2109" },
    { email: "paulo.santos@santosjuridico.com", telefone: "(51) 3210-9876", celular: "(51) 98432-1098" },
  ]).returning();

  const advs = await db.insert(advogados).values([
    { nome: "Dr. Carlos Eduardo Mendes", cpf: "123.456.789-00", observacoes: "Especialista em direito trabalhista, 15 anos de experiência", enderecoId: endAdv[0].id, proprietarioId: ownerId },
    { nome: "Dra. Ana Paula Costa", cpf: "234.567.890-11", observacoes: "Foco em reclamações trabalhistas de grande porte", enderecoId: endAdv[1].id, proprietarioId: ownerId },
    { nome: "Dr. Roberto Augusto Silva", cpf: "345.678.901-22", observacoes: "Atua em casos de indenização e danos morais", enderecoId: endAdv[2].id, proprietarioId: ownerId },
    { nome: "Dra. Fernanda Lima Oliveira", cpf: "456.789.012-33", observacoes: "Especialista em direito previdenciário e FGTS", enderecoId: endAdv[3].id, proprietarioId: ownerId },
    { nome: "Dr. Paulo Ricardo Santos", cpf: "567.890.123-44", observacoes: "Advocacia trabalhista com foco em verbas rescisórias", enderecoId: endAdv[4].id, proprietarioId: ownerId },
  ]).returning();

  await db.insert(advogadoContatos).values([
    { advogadoId: advs[0].id, contatoId: contAdv[0].id },
    { advogadoId: advs[1].id, contatoId: contAdv[1].id },
    { advogadoId: advs[2].id, contatoId: contAdv[2].id },
    { advogadoId: advs[3].id, contatoId: contAdv[3].id },
    { advogadoId: advs[4].id, contatoId: contAdv[4].id },
  ]);

  const endEsc = await db.insert(enderecos).values([
    { cep: "01311-200", estado: "SP", municipio: "São Paulo", cidade: "São Paulo", bairro: "Bela Vista", logradouro: "Rua Augusta", numero: "2345", complemento: "18º andar" },
    { cep: "20031-170", estado: "RJ", municipio: "Rio de Janeiro", cidade: "Rio de Janeiro", bairro: "Centro", logradouro: "Rua da Assembleia", numero: "10", complemento: "Sala 2501" },
    { cep: "30140-071", estado: "MG", municipio: "Belo Horizonte", cidade: "Belo Horizonte", bairro: "Savassi", logradouro: "Av. do Contorno", numero: "6061", complemento: "7º andar" },
  ]).returning();

  const contEsc = await db.insert(contatos).values([
    { email: "contato@mendescosta.adv.br", telefone: "(11) 3100-2000", celular: "(11) 99100-2000" },
    { email: "contato@silvalima.adv.br", telefone: "(21) 2100-3000", celular: "(21) 98200-3000" },
    { email: "contato@santosassociados.adv.br", telefone: "(31) 3200-4000", celular: "(31) 97300-4000" },
  ]).returning();

  const escs = await db.insert(escritorios).values([
    { nome: "Mendes & Costa Advogados Associados", cnpj: "12.345.678/0001-90", observacoes: "Escritório de médio porte, foco em trabalhista", enderecoId: endEsc[0].id, proprietarioId: ownerId },
    { nome: "Silva & Lima Advocacia", cnpj: "23.456.789/0001-01", observacoes: "Escritório boutique, casos de alta complexidade", enderecoId: endEsc[1].id, proprietarioId: ownerId },
    { nome: "Santos & Associados Jurídico", cnpj: "34.567.890/0001-12", observacoes: "Grande escritório, atuação nacional", enderecoId: endEsc[2].id, proprietarioId: ownerId },
  ]).returning();

  await db.insert(escritorioContatos).values([
    { escritorioId: escs[0].id, contatoId: contEsc[0].id },
    { escritorioId: escs[1].id, contatoId: contEsc[1].id },
    { escritorioId: escs[2].id, contatoId: contEsc[2].id },
  ]);

  await db.insert(escritorioAdvogados).values([
    { escritorioId: escs[0].id, advogadoId: advs[0].id },
    { escritorioId: escs[0].id, advogadoId: advs[1].id },
    { escritorioId: escs[1].id, advogadoId: advs[2].id },
    { escritorioId: escs[1].id, advogadoId: advs[3].id },
    { escritorioId: escs[2].id, advogadoId: advs[4].id },
    { escritorioId: escs[2].id, advogadoId: advs[2].id },
  ]);

  const endRec = await db.insert(enderecos).values([
    { cep: "04567-000", estado: "SP", municipio: "São Paulo", cidade: "São Paulo", bairro: "Vila Mariana", logradouro: "Rua Domingos de Morais", numero: "1200" },
    { cep: "21040-020", estado: "RJ", municipio: "Rio de Janeiro", cidade: "Rio de Janeiro", bairro: "Méier", logradouro: "Rua Dias da Cruz", numero: "450", complemento: "Apt 302" },
    { cep: "30430-090", estado: "MG", municipio: "Belo Horizonte", cidade: "Belo Horizonte", bairro: "Barreiro", logradouro: "Av. Afonso Vaz de Melo", numero: "640" },
    { cep: "82530-230", estado: "PR", municipio: "Curitiba", cidade: "Curitiba", bairro: "Boqueirão", logradouro: "Rua Marechal Floriano", numero: "876" },
    { cep: "91060-380", estado: "RS", municipio: "Porto Alegre", cidade: "Porto Alegre", bairro: "Jardim Botânico", logradouro: "Av. Ipiranga", numero: "3200", complemento: "Apt 1001" },
  ]).returning();

  const contRec = await db.insert(contatos).values([
    { email: "maria.oliveira@gmail.com", telefone: "(11) 2345-6789", celular: "(11) 98765-4321" },
    { email: "jose.ferreira@outlook.com", telefone: "(21) 3456-7890", celular: "(21) 97654-3210" },
    { email: "lucia.pereira@gmail.com", celular: "(31) 96543-2109" },
    { email: "antonio.souza@yahoo.com", telefone: "(41) 4567-8901", celular: "(41) 95432-1098" },
    { email: "patricia.almeida@hotmail.com", celular: "(51) 94321-0987" },
  ]).returning();

  const recs = await db.insert(reclamantes).values([
    { nome: "Maria de Fátima Oliveira", cpf: "111.222.333-44", observacoes: "Ex-funcionária da Construtora ABC, demitida sem justa causa", enderecoId: endRec[0].id, proprietarioId: ownerId },
    { nome: "José Carlos Ferreira", cpf: "222.333.444-55", observacoes: "Trabalhador rural, acidente de trabalho", enderecoId: endRec[1].id, proprietarioId: ownerId },
    { nome: "Lúcia Helena Pereira", cpf: "333.444.555-66", observacoes: "Funcionária pública, desvio de função por 8 anos", enderecoId: endRec[2].id, proprietarioId: ownerId },
    { nome: "Antônio Carlos Souza", cpf: "444.555.666-77", observacoes: "Motorista de caminhão, horas extras não pagas", enderecoId: endRec[3].id, proprietarioId: ownerId },
    { nome: "Patrícia Regina Almeida", cpf: "555.666.777-88", observacoes: "Bancária, assédio moral e acúmulo de função", enderecoId: endRec[4].id, proprietarioId: ownerId },
  ]).returning();

  await db.insert(reclamanteContatos).values([
    { reclamanteId: recs[0].id, contatoId: contRec[0].id },
    { reclamanteId: recs[1].id, contatoId: contRec[1].id },
    { reclamanteId: recs[2].id, contatoId: contRec[2].id },
    { reclamanteId: recs[3].id, contatoId: contRec[3].id },
    { reclamanteId: recs[4].id, contatoId: contRec[4].id },
  ]);

  const procs = await db.insert(processos).values([
    { cnj: "0001234-56.2024.5.02.0001", tribunal: "TRT-2", vara: "1ª Vara do Trabalho de São Paulo", classe: "Reclamação Trabalhista", assunto: "Verbas Rescisórias", status: "Em andamento", valorCausa: "185000.00", autor: "Maria de Fátima Oliveira", reu: "Construtora ABC Ltda", proprietarioId: ownerId },
    { cnj: "0002345-67.2024.5.01.0015", tribunal: "TRT-1", vara: "15ª Vara do Trabalho do Rio de Janeiro", classe: "Reclamação Trabalhista", assunto: "Acidente de Trabalho", status: "Em andamento", valorCausa: "320000.00", autor: "José Carlos Ferreira", reu: "Agropecuária Sul Ltda", proprietarioId: ownerId },
    { cnj: "0003456-78.2023.5.03.0010", tribunal: "TRT-3", vara: "10ª Vara do Trabalho de Belo Horizonte", classe: "Reclamação Trabalhista", assunto: "Desvio de Função", status: "Sentença procedente", valorCausa: "250000.00", autor: "Lúcia Helena Pereira", reu: "Estado de Minas Gerais", proprietarioId: ownerId },
    { cnj: "0004567-89.2024.5.09.0005", tribunal: "TRT-9", vara: "5ª Vara do Trabalho de Curitiba", classe: "Reclamação Trabalhista", assunto: "Horas Extras", status: "Em andamento", valorCausa: "95000.00", autor: "Antônio Carlos Souza", reu: "Transportes Rápido S.A.", proprietarioId: ownerId },
    { cnj: "0005678-90.2024.5.04.0020", tribunal: "TRT-4", vara: "20ª Vara do Trabalho de Porto Alegre", classe: "Reclamação Trabalhista", assunto: "Assédio Moral e Acúmulo de Função", status: "Em andamento", valorCausa: "410000.00", autor: "Patrícia Regina Almeida", reu: "Banco Nacional S.A.", proprietarioId: ownerId },
    { cnj: "0006789-01.2023.5.02.0045", tribunal: "TRT-2", vara: "45ª Vara do Trabalho de São Paulo", classe: "Reclamação Trabalhista", assunto: "FGTS e Multa Rescisória", status: "Recurso ordinário", valorCausa: "78000.00", autor: "Maria de Fátima Oliveira", reu: "Indústria Metalúrgica Beta Ltda", proprietarioId: ownerId },
    { cnj: "0007890-12.2024.5.01.0032", tribunal: "TRT-1", vara: "32ª Vara do Trabalho do Rio de Janeiro", classe: "Reclamação Trabalhista", assunto: "Insalubridade e Periculosidade", status: "Aguardando perícia", valorCausa: "145000.00", autor: "José Carlos Ferreira", reu: "Química Industrial Rio Ltda", proprietarioId: ownerId },
    { cnj: "0008901-23.2024.5.03.0008", tribunal: "TRT-3", vara: "8ª Vara do Trabalho de Belo Horizonte", classe: "Reclamação Trabalhista", assunto: "Danos Morais - Dispensa Discriminatória", status: "Em andamento", valorCausa: "200000.00", autor: "Lúcia Helena Pereira", reu: "Supermercados Central S.A.", proprietarioId: ownerId },
  ]).returning();

  await db.insert(processoAdvogados).values([
    { processoId: procs[0].id, advogadoId: advs[0].id },
    { processoId: procs[1].id, advogadoId: advs[1].id },
    { processoId: procs[2].id, advogadoId: advs[2].id },
    { processoId: procs[3].id, advogadoId: advs[3].id },
    { processoId: procs[4].id, advogadoId: advs[4].id },
    { processoId: procs[5].id, advogadoId: advs[0].id },
    { processoId: procs[5].id, advogadoId: advs[1].id },
    { processoId: procs[6].id, advogadoId: advs[1].id },
    { processoId: procs[7].id, advogadoId: advs[2].id },
    { processoId: procs[7].id, advogadoId: advs[3].id },
  ]);

  await db.insert(processoReclamantes).values([
    { processoId: procs[0].id, reclamanteId: recs[0].id },
    { processoId: procs[1].id, reclamanteId: recs[1].id },
    { processoId: procs[2].id, reclamanteId: recs[2].id },
    { processoId: procs[3].id, reclamanteId: recs[3].id },
    { processoId: procs[4].id, reclamanteId: recs[4].id },
    { processoId: procs[5].id, reclamanteId: recs[0].id },
    { processoId: procs[6].id, reclamanteId: recs[1].id },
    { processoId: procs[7].id, reclamanteId: recs[2].id },
  ]);

  console.log("Dados fictícios criados: 5 advogados, 3 escritórios, 5 reclamantes, 8 processos com vínculos");
}
