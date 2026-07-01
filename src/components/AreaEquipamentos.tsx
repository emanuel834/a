import { For, Show, createSignal } from "solid-js";
import {
  STATUS_EQUIP,
  type Equipamento,
  type FestaEquipamento,
  type TipoEquipamento,
  TIPOS,
} from "~/lib/types";

// Uma das 4 áreas do detalhe da festa (chopeira / barril / cilindro / kit).
// Lista os itens alocados e permite adicionar os disponíveis daquele tipo.
export default function AreaEquipamentos(props: {
  tipo: TipoEquipamento;
  alocados: FestaEquipamento[];
  disponiveis: Equipamento[];
  onAlocar: (equipamentoId: string) => void;
  onDesalocar: (alocacaoId: string) => void;
}) {
  const meta = () => TIPOS.find((t) => t.valor === props.tipo)!;
  const [selecionado, setSelecionado] = createSignal("");

  function adicionar() {
    const id = selecionado();
    if (id) {
      props.onAlocar(id);
      setSelecionado("");
    }
  }

  return (
    <section class="area">
      <h3>
        {meta().emoji} {meta().plural}
      </h3>

      <Show
        when={props.alocados.length > 0}
        fallback={<p class="vazio">Nenhum item alocado.</p>}
      >
        <ul class="lista-alocados">
          <For each={props.alocados}>
            {(fe) => (
              <li>
                <span>
                  <strong>{fe.equipamento?.nome}</strong>
                  {fe.equipamento?.descricao && (
                    <span class="descricao"> — {fe.equipamento.descricao}</span>
                  )}
                  <Show when={fe.equipamento && fe.equipamento.status !== "disponivel"}>
                    <span class="badge badge-aviso">
                      {STATUS_EQUIP[fe.equipamento!.status]}
                    </span>
                  </Show>
                </span>
                <button class="btn-perigo" onClick={() => props.onDesalocar(fe.id)}>
                  Remover
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <div class="area-add">
        <select
          value={selecionado()}
          onChange={(e) => setSelecionado(e.currentTarget.value)}
        >
          <option value="">
            {props.disponiveis.length > 0
              ? "Selecionar item disponível…"
              : "Nenhum item disponível"}
          </option>
          <For each={props.disponiveis}>
            {(eq) => (
              <option value={eq.id}>
                {eq.nome}
                {eq.descricao ? ` — ${eq.descricao}` : ""}
              </option>
            )}
          </For>
        </select>
        <button onClick={adicionar} disabled={!selecionado()}>
          Adicionar
        </button>
      </div>
    </section>
  );
}
