import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./db";
import { leads, advogados, escritorios, reclamantes, processos, processoAdvogados, processoReclamantes, escritorioAdvogados } from "@shared/schema";
import { eq, ilike, inArray, sql } from "drizzle-orm";

export interface AssistantAction {
  label: string;
  url: string;
}

export interface AssistantResponse {
  message: string;
  actions: AssistantAction[];
}

async function searchCRMData(query: string) {
  const normalizedQuery = query.toLowerCase().trim();

  const cnjMatch = normalizedQuery.match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/);
  const cpfMatch = normalizedQuery.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
  const cnpjMatch = normalizedQuery.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);

  const results: {
    matchedLawyers: { id: number; nome: string }[];
    matchedLawFirms: { id: string; nome: string }[];
    matchedClaimants: { id: string; nome: string }[];
    matchedLawsuits: { id: string; cnj: string | null; tribunal: string | null; vara: string | null; autor: string | null; reu: string | null; valorCausa: string | null; status: string | null }[];
    matchedLeads: { id: string; titulo: string; tipoPipeline: string; etapa: string; valor: string | null; advogadoId: number | null; escritorioId: string | null; reclamanteId: string | null; processoId: string | null }[];
    lawyerIdsForCnj: number[];
    claimantIdsForCnj: string[];
    lawFirmIdsForCnj: string[];
  } = {
    matchedLawyers: [],
    matchedLawFirms: [],
    matchedClaimants: [],
    matchedLawsuits: [],
    matchedLeads: [],
    lawyerIdsForCnj: [],
    claimantIdsForCnj: [],
    lawFirmIdsForCnj: [],
  };

  if (cnjMatch) {
    const cnj = cnjMatch[0];
    const lawsuitResults = await db.select({
      id: processos.id,
      cnj: processos.cnj,
      tribunal: processos.tribunal,
      vara: processos.vara,
      autor: processos.autor,
      reu: processos.reu,
      valorCausa: processos.valorCausa,
      status: processos.status,
    }).from(processos).where(ilike(processos.cnj, `%${cnj}%`));
    results.matchedLawsuits = lawsuitResults;

    if (lawsuitResults.length > 0) {
      const lawsuitIds = lawsuitResults.map(l => l.id);

      const lawyerLinks = await db.select({ advogadoId: processoAdvogados.advogadoId })
        .from(processoAdvogados).where(inArray(processoAdvogados.processoId, lawsuitIds));
      const uniqueLawyerIds = Array.from(new Set(lawyerLinks.map(l => l.advogadoId)));
      results.lawyerIdsForCnj = uniqueLawyerIds;

      const claimantLinks = await db.select({ reclamanteId: processoReclamantes.reclamanteId })
        .from(processoReclamantes).where(inArray(processoReclamantes.processoId, lawsuitIds));
      results.claimantIdsForCnj = Array.from(new Set(claimantLinks.map(l => l.reclamanteId)));

      if (uniqueLawyerIds.length > 0) {
        const lawyerResults = await db.select({ id: advogados.id, nome: advogados.nome })
          .from(advogados).where(inArray(advogados.id, uniqueLawyerIds));
        results.matchedLawyers = lawyerResults;

        const firmLinks = await db.select({ escritorioId: escritorioAdvogados.escritorioId })
          .from(escritorioAdvogados).where(inArray(escritorioAdvogados.advogadoId, uniqueLawyerIds));
        results.lawFirmIdsForCnj = Array.from(new Set(firmLinks.map(l => l.escritorioId)));
      }

      if (results.claimantIdsForCnj.length > 0) {
        const claimantResults = await db.select({ id: reclamantes.id, nome: reclamantes.nome })
          .from(reclamantes).where(inArray(reclamantes.id, results.claimantIdsForCnj));
        results.matchedClaimants = claimantResults;
      }

      if (results.lawFirmIdsForCnj.length > 0) {
        const firmResults = await db.select({ id: escritorios.id, nome: escritorios.nome })
          .from(escritorios).where(inArray(escritorios.id, results.lawFirmIdsForCnj));
        results.matchedLawFirms = firmResults;
      }

      const leadResults = await db.select({
        id: leads.id, titulo: leads.titulo, tipoPipeline: leads.tipoPipeline,
        etapa: leads.etapa, valor: leads.valor, advogadoId: leads.advogadoId,
        escritorioId: leads.escritorioId, reclamanteId: leads.reclamanteId, processoId: leads.processoId,
      }).from(leads).where(inArray(leads.processoId, lawsuitIds));
      results.matchedLeads = leadResults;
    }
  }

  const nameWords = normalizedQuery
    .replace(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/g, "")
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, "")
    .replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, "")
    .replace(/advogados?|escritórios?|escritorios?|reclamantes?|leads?|processos?|pipeline|buscar|encontrar|quais?|quem|todos?|todas?|que|possui|possuem|com|para|por|favor|cnj|cpf|cnpj|mostrar|me|mostre|listar|liste|sobre|informações|informacoes|dados/gi, "")
    .trim();

  if (nameWords.length >= 3) {
    const searchTerms = nameWords.split(/\s+/).filter(w => w.length >= 3);

    if (searchTerms.length > 0) {
      const searchPattern = `%${searchTerms.join("%")}%`;

      const lawyerResults = await db.select({ id: advogados.id, nome: advogados.nome })
        .from(advogados).where(ilike(advogados.nome, searchPattern)).limit(10);
      results.matchedLawyers = [...results.matchedLawyers, ...lawyerResults];

      const firmResults = await db.select({ id: escritorios.id, nome: escritorios.nome })
        .from(escritorios).where(ilike(escritorios.nome, searchPattern)).limit(10);
      results.matchedLawFirms = [...results.matchedLawFirms, ...firmResults];

      const claimantResults = await db.select({ id: reclamantes.id, nome: reclamantes.nome })
        .from(reclamantes).where(ilike(reclamantes.nome, searchPattern)).limit(10);
      results.matchedClaimants = [...results.matchedClaimants, ...claimantResults];
    }
  }

  if (cpfMatch) {
    const cpf = cpfMatch[0];
    const lawyerResults = await db.select({ id: advogados.id, nome: advogados.nome })
      .from(advogados).where(ilike(advogados.cpf, `%${cpf}%`)).limit(10);
    results.matchedLawyers = [...results.matchedLawyers, ...lawyerResults];

    const claimantResults = await db.select({ id: reclamantes.id, nome: reclamantes.nome })
      .from(reclamantes).where(ilike(reclamantes.cpf, `%${cpf}%`)).limit(10);
    results.matchedClaimants = [...results.matchedClaimants, ...claimantResults];
  }

  if (cnpjMatch) {
    const cnpj = cnpjMatch[0];
    const firmResults = await db.select({ id: escritorios.id, nome: escritorios.nome })
      .from(escritorios).where(ilike(escritorios.cnpj, `%${cnpj}%`)).limit(10);
    results.matchedLawFirms = [...results.matchedLawFirms, ...firmResults];
  }

  if (!cnjMatch && !cpfMatch && !cnpjMatch && nameWords.length < 3) {
    const allLeads = await db.select({
      id: leads.id, titulo: leads.titulo, tipoPipeline: leads.tipoPipeline,
      etapa: leads.etapa, valor: leads.valor, advogadoId: leads.advogadoId,
      escritorioId: leads.escritorioId, reclamanteId: leads.reclamanteId, processoId: leads.processoId,
    }).from(leads).limit(20);
    results.matchedLeads = allLeads;

    const stats = {
      totalLeads: await db.select({ count: sql<number>`count(*)` }).from(leads),
      totalLawyers: await db.select({ count: sql<number>`count(*)` }).from(advogados),
      totalFirms: await db.select({ count: sql<number>`count(*)` }).from(escritorios),
      totalClaimants: await db.select({ count: sql<number>`count(*)` }).from(reclamantes),
      totalLawsuits: await db.select({ count: sql<number>`count(*)` }).from(processos),
    };

    return { ...results, stats };
  }

  return results;
}

function buildActions(data: Awaited<ReturnType<typeof searchCRMData>>): AssistantAction[] {
  const actions: AssistantAction[] = [];

  if (data.matchedLawsuits.length > 0) {
    const cnjs = data.matchedLawsuits.map(l => l.cnj).filter(Boolean).join(",");
    if (cnjs) {
      actions.push({
        label: `Gestão de Casos - CNJ ${data.matchedLawsuits[0]?.cnj || ""}`,
        url: `/pipeline?type=triagem&cnj=${encodeURIComponent(cnjs)}`,
      });

      if (data.lawyerIdsForCnj.length > 0) {
        actions.push({
          label: `Pipeline Advogados - CNJ ${data.matchedLawsuits[0]?.cnj || ""}`,
          url: `/pipeline?type=advogados&cnj=${encodeURIComponent(cnjs)}`,
        });
      }

      if (data.lawFirmIdsForCnj.length > 0) {
        actions.push({
          label: `Pipeline Escritórios - CNJ ${data.matchedLawsuits[0]?.cnj || ""}`,
          url: `/pipeline?type=escritorios&cnj=${encodeURIComponent(cnjs)}`,
        });
      }
    }
  }

  if (data.lawyerIdsForCnj && data.lawyerIdsForCnj.length > 0 && data.matchedLawsuits.length === 0) {
    for (const lawyerId of data.lawyerIdsForCnj.slice(0, 5)) {
      const lawyer = data.matchedLawyers.find(l => l.id === lawyerId);
      actions.push({
        label: `Pipeline Advogados - ${lawyer?.nome || `ID ${lawyerId}`}`,
        url: `/pipeline?type=advogados&advogadoId=${lawyerId}`,
      });
    }
  }

  if (data.matchedLawyers.length > 0 && (!data.lawyerIdsForCnj || data.lawyerIdsForCnj.length === 0)) {
    for (const lawyer of data.matchedLawyers.slice(0, 5)) {
      actions.push({
        label: `Pipeline Advogados - ${lawyer.nome}`,
        url: `/pipeline?type=advogados&advogadoId=${lawyer.id}`,
      });
    }
  }

  if (data.matchedLawFirms.length > 0 && data.matchedLawsuits.length === 0) {
    for (const firm of data.matchedLawFirms.slice(0, 5)) {
      actions.push({
        label: `Pipeline Escritórios - ${firm.nome}`,
        url: `/pipeline?type=escritorios&escritorioId=${firm.id}`,
      });
    }
  }

  return actions;
}

export async function processAssistantMessage(userMessage: string): Promise<AssistantResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      message: "O assistente não está configurado. A chave da API do Gemini não foi encontrada.",
      actions: [],
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const crmData = await searchCRMData(userMessage);
    const actions = buildActions(crmData);

    const contextParts: string[] = [];

    if (crmData.matchedLawsuits.length > 0) {
      contextParts.push(`Processos encontrados: ${JSON.stringify(crmData.matchedLawsuits.map(l => ({
        cnj: l.cnj, tribunal: l.tribunal, vara: l.vara, autor: l.autor, reu: l.reu, valor: l.valorCausa, status: l.status,
      })))}`);
    }

    if (crmData.matchedLawyers.length > 0) {
      contextParts.push(`Advogados encontrados: ${JSON.stringify(crmData.matchedLawyers.map(l => ({
        id: l.id, nome: l.nome,
      })))}`);
    }

    if (crmData.matchedLawFirms.length > 0) {
      contextParts.push(`Escritórios encontrados: ${JSON.stringify(crmData.matchedLawFirms.map(f => ({
        id: f.id, nome: f.nome,
      })))}`);
    }

    if (crmData.matchedClaimants.length > 0) {
      contextParts.push(`Reclamantes encontrados: ${JSON.stringify(crmData.matchedClaimants.map(c => ({
        id: c.id, nome: c.nome,
      })))}`);
    }

    if (crmData.matchedLeads.length > 0) {
      contextParts.push(`Leads relacionados: ${JSON.stringify(crmData.matchedLeads.map(l => ({
        titulo: l.titulo, pipeline: l.tipoPipeline, etapa: l.etapa, valor: l.valor,
      })))}`);
    }

    if ('stats' in crmData && crmData.stats) {
      const s = crmData.stats as any;
      contextParts.push(`Estatísticas gerais: ${s.totalLeads[0]?.count || 0} leads, ${s.totalLawyers[0]?.count || 0} advogados, ${s.totalFirms[0]?.count || 0} escritórios, ${s.totalClaimants[0]?.count || 0} reclamantes, ${s.totalLawsuits[0]?.count || 0} processos`);
    }

    if (actions.length > 0) {
      contextParts.push(`Ações disponíveis para o usuário: ${JSON.stringify(actions.map(a => a.label))}`);
    }

    const systemPrompt = `Você é o Hermínio, assistente inteligente do Hermes CRM - um sistema de gestão de aquisição de casos jurídicos. Responda sempre em português brasileiro de forma clara e profissional.

Seu papel:
- Ajudar os usuários a encontrar informações sobre advogados, escritórios, reclamantes, processos e leads
- Interpretar perguntas em linguagem natural e buscar nos dados do CRM
- Informar os resultados encontrados de forma resumida e objetiva
- Quando houver ações disponíveis (links para pipeline), mencionar que o usuário pode clicar nos botões abaixo para navegar diretamente

Regras:
- Seja direto e objetivo nas respostas
- Não invente dados que não estão no contexto fornecido
- Se não encontrar resultados, sugira que o usuário refine a busca
- Use formatação simples (sem markdown complexo, sem asteriscos para negrito)
- Respostas curtas, máximo 3-4 parágrafos
- Quando mencionar entidades, use os nomes encontrados nos dados
- Nunca revele CPF, CNPJ ou dados sensíveis nas respostas`;

    const userPrompt = `Pergunta do usuário: "${userMessage}"

Dados encontrados no CRM:
${contextParts.length > 0 ? contextParts.join("\n\n") : "Nenhum resultado encontrado para esta busca."}

Responda à pergunta do usuário com base nos dados acima.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
      ],
    });

    const response = result.response;
    const text = response.text();

    return {
      message: text,
      actions,
    };
  } catch (error) {
    console.error("Assistant error:", error);
    return {
      message: "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em alguns instantes.",
      actions: [],
    };
  }
}
