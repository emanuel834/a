import { STATUS_EQUIP, type Equipamento, type StatusEquipamento } from "~/lib/types";

// Cartão de um equipamento no estoque, com troca de status e exclusão.
export default function EquipamentoCard(props: {
  equipamento: Equipamento;
  onStatus: (status: StatusEquipamento) => void;
  onExcluir: () => void;
}) {
  return (
    <div class={`card equip status-${props.equipamento.status}`}>
      <div class="card-corpo">
        <strong>{props.equipamento.nome}</strong>
        <span class={`badge badge-${props.equipamento.status}`}>
          {STATUS_EQUIP[props.equipamento.status]}
        </span>
        {props.equipamento.descricao && (
          <p class="descricao">{props.equipamento.descricao}</p>
        )}
      </div>
      <div class="card-acoes">
        <select
          value={props.equipamento.status}
          onChange={(e) =>
            props.onStatus(e.currentTarget.value as StatusEquipamento)
          }
        >
          <option value="disponivel">Disponível</option>
          <option value="em_manutencao">Em manutenção</option>
          <option value="inativo">Inativo</option>
        </select>
        <button class="btn-perigo" onClick={props.onExcluir}>
          Excluir
        </button>
      </div>
    </div>
  );
}
