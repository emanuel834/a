import { supabase } from "./supabase";
import type {
  Equipamento,
  Festa,
  FestaEquipamento,
  StatusEquipamento,
  StatusFesta,
  TipoEquipamento,
} from "./types";

/* ----------------------------- Equipamentos ----------------------------- */

export async function listarEquipamentos(): Promise<Equipamento[]> {
  const { data, error } = await supabase
    .from("equipamentos")
    .select("*")
    .order("tipo", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return data as Equipamento[];
}

export async function criarEquipamento(input: {
  tipo: TipoEquipamento;
  nome: string;
  descricao?: string;
  status?: StatusEquipamento;
}): Promise<Equipamento> {
  const { data, error } = await supabase
    .from("equipamentos")
    .insert({
      tipo: input.tipo,
      nome: input.nome,
      descricao: input.descricao || null,
      status: input.status ?? "disponivel",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Equipamento;
}

export async function atualizarStatusEquipamento(
  id: string,
  status: StatusEquipamento
): Promise<void> {
  const { error } = await supabase
    .from("equipamentos")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function excluirEquipamento(id: string): Promise<void> {
  const { error } = await supabase.from("equipamentos").delete().eq("id", id);
  if (error) throw error;
}

/* -------------------------------- Festas -------------------------------- */

export async function listarFestas(): Promise<Festa[]> {
  const { data, error } = await supabase
    .from("festas")
    .select("*")
    .order("data_inicio", { ascending: true });
  if (error) throw error;
  return data as Festa[];
}

export async function obterFesta(id: string): Promise<Festa | null> {
  const { data, error } = await supabase
    .from("festas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Festa) ?? null;
}

export async function criarFesta(input: {
  nome: string;
  cliente?: string;
  local?: string;
  data_inicio: string;
  data_fim: string;
  observacoes?: string;
  status?: StatusFesta;
}): Promise<Festa> {
  const { data, error } = await supabase
    .from("festas")
    .insert({
      nome: input.nome,
      cliente: input.cliente || null,
      local: input.local || null,
      data_inicio: input.data_inicio,
      data_fim: input.data_fim,
      observacoes: input.observacoes || null,
      status: input.status ?? "agendada",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Festa;
}

export async function atualizarStatusFesta(
  id: string,
  status: StatusFesta
): Promise<void> {
  const { error } = await supabase.from("festas").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function excluirFesta(id: string): Promise<void> {
  const { error } = await supabase.from("festas").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------- Alocações ---------------------------- */

// Equipamentos já alocados a uma festa (com dados do equipamento embutidos).
export async function listarAlocacoes(festaId: string): Promise<FestaEquipamento[]> {
  const { data, error } = await supabase
    .from("festa_equipamentos")
    .select("*, equipamento:equipamentos(*)")
    .eq("festa_id", festaId);
  if (error) throw error;
  return data as unknown as FestaEquipamento[];
}

// Equipamentos disponíveis para a festa (respeita status e conflito de datas).
export async function equipamentosDisponiveis(
  festaId: string
): Promise<Equipamento[]> {
  const { data, error } = await supabase.rpc("equipamentos_disponiveis", {
    p_festa_id: festaId,
  });
  if (error) throw error;
  return (data as Equipamento[]) ?? [];
}

export async function alocarEquipamento(
  festaId: string,
  equipamentoId: string
): Promise<void> {
  const { error } = await supabase
    .from("festa_equipamentos")
    .insert({ festa_id: festaId, equipamento_id: equipamentoId });
  if (error) throw error;
}

export async function desalocarEquipamento(alocacaoId: string): Promise<void> {
  const { error } = await supabase
    .from("festa_equipamentos")
    .delete()
    .eq("id", alocacaoId);
  if (error) throw error;
}
