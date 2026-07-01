import { For, Show, createSignal, onMount } from "solid-js";
import { Title, useNavigate, useParams } from "solid-start";
import AreaEquipamentos from "~/components/AreaEquipamentos";
import {
  alocarEquipamento,
  atualizarStatusFesta,
  desalocarEquipamento,
  equipamentosDisponiveis,
  excluirFesta,
  listarAlocacoes,
  obterFesta,
} from "~/lib/db";
import {
  STATUS_FESTA,
  TIPOS,
  type Equipamento,
  type Festa,
  type FestaEquipamento,
  type StatusFesta,
} from "~/lib/types";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function DetalheFesta() {
  const params = useParams();
  const navigate = useNavigate();

  const [festa, setFesta] = createSignal<Festa | null>(null);
  const [alocados, setAlocados] = createSignal<FestaEquipamento[]>([]);
  const [disponiveis, setDisponiveis] = createSignal<Equipamento[]>([]);
  const [erro, setErro] = createSignal("");
  const [carregando, setCarregando] = createSignal(true);

  async function carregar() {
    setCarregando(true);
    try {
      const f = await obterFesta(params.id);
      setFesta(f);
      if (f) {
        const [al, disp] = await Promise.all([
          listarAlocacoes(params.id),
          equipamentosDisponiveis(params.id),
        ]);
        setAlocados(al);
        setDisponiveis(disp);
      }
      setErro("");
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar a festa.");
    } finally {
      setCarregando(false);
    }
  }

  onMount(carregar);

  const alocadosDoTipo = (tipo: string) =>
    alocados().filter((a) => a.equipamento?.tipo === tipo);
  const disponiveisDoTipo = (tipo: string) =>
    disponiveis().filter((e) => e.tipo === tipo);

  async function alocar(equipamentoId: string) {
    try {
      await alocarEquipamento(params.id, equipamentoId);
      await carregar();
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível alocar o equipamento.");
    }
  }

  async function desalocar(alocacaoId: string) {
    await desalocarEquipamento(alocacaoId);
    await carregar();
  }

  async function mudarStatus(status: StatusFesta) {
    await atualizarStatusFesta(params.id, status);
    await carregar();
  }

  async function remover() {
    if (confirm("Excluir esta festa? As alocações serão removidas.")) {
      await excluirFesta(params.id);
      navigate("/festas", { replace: true });
    }
  }

  return (
    <div>
      <Title>Festa — Choperia</Title>

      <Show when={erro()}>
        <p class="erro">{erro()}</p>
      </Show>

      <Show when={!carregando()} fallback={<p class="aviso">Carregando…</p>}>
        <Show
          when={festa()}
          fallback={<p class="vazio">Festa não encontrada.</p>}
        >
          {(f) => (
            <>
              <div class="cabecalho-pagina">
                <div>
                  <h1>{f().nome}</h1>
                  <p class="periodo">
                    🗓️ {formatarData(f().data_inicio)} →{" "}
                    {formatarData(f().data_fim)}
                  </p>
                  <Show when={f().cliente}>
                    <p class="descricao">👤 {f().cliente}</p>
                  </Show>
                  <Show when={f().local}>
                    <p class="descricao">📍 {f().local}</p>
                  </Show>
                  <Show when={f().observacoes}>
                    <p class="descricao">📝 {f().observacoes}</p>
                  </Show>
                </div>
                <div class="festa-controles">
                  <label class="inline">
                    Status
                    <select
                      value={f().status}
                      onChange={(e) =>
                        mudarStatus(e.currentTarget.value as StatusFesta)
                      }
                    >
                      <For each={Object.keys(STATUS_FESTA) as StatusFesta[]}>
                        {(s) => <option value={s}>{STATUS_FESTA[s]}</option>}
                      </For>
                    </select>
                  </label>
                  <button class="btn-perigo" onClick={remover}>
                    Excluir festa
                  </button>
                </div>
              </div>

              <p class="dica">
                Aloque os equipamentos para esta festa. Só aparecem itens
                disponíveis e sem conflito de data com outras festas.
              </p>

              <div class="areas">
                <For each={TIPOS}>
                  {(t) => (
                    <AreaEquipamentos
                      tipo={t.valor}
                      alocados={alocadosDoTipo(t.valor)}
                      disponiveis={disponiveisDoTipo(t.valor)}
                      onAlocar={alocar}
                      onDesalocar={desalocar}
                    />
                  )}
                </For>
              </div>
            </>
          )}
        </Show>
      </Show>
    </div>
  );
}
