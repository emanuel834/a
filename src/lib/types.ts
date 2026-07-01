export type TipoEquipamento = "chopeira" | "barril" | "cilindro" | "kit_extracao";

export type StatusEquipamento = "disponivel" | "em_manutencao" | "inativo";

export type StatusFesta =
  | "agendada"
  | "em_andamento"
  | "concluida"
  | "cancelada";

export interface Equipamento {
  id: string;
  tipo: TipoEquipamento;
  nome: string;
  descricao: string | null;
  status: StatusEquipamento;
  user_id: string;
  created_at: string;
}

export interface Festa {
  id: string;
  nome: string;
  cliente: string | null;
  local: string | null;
  data_inicio: string;
  data_fim: string;
  observacoes: string | null;
  status: StatusFesta;
  user_id: string;
  created_at: string;
}

export interface FestaEquipamento {
  id: string;
  festa_id: string;
  equipamento_id: string;
  user_id: string;
  created_at: string;
  equipamento?: Equipamento;
}

// Metadados das 4 áreas de equipamento para exibição na interface.
export const TIPOS: { valor: TipoEquipamento; rotulo: string; plural: string; emoji: string }[] = [
  { valor: "chopeira", rotulo: "Chopeira", plural: "Chopeiras", emoji: "🍺" },
  { valor: "barril", rotulo: "Barril", plural: "Barris", emoji: "🛢️" },
  { valor: "cilindro", rotulo: "Cilindro (CO₂)", plural: "Cilindros (CO₂)", emoji: "🧯" },
  { valor: "kit_extracao", rotulo: "Kit de extração", plural: "Kits de extração", emoji: "🧰" },
];

export const STATUS_EQUIP: Record<StatusEquipamento, string> = {
  disponivel: "Disponível",
  em_manutencao: "Em manutenção",
  inativo: "Inativo",
};

export const STATUS_FESTA: Record<StatusFesta, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export function rotuloTipo(tipo: TipoEquipamento): string {
  return TIPOS.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}
