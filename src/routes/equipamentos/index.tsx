import { For, Show, createSignal, onMount } from "solid-js";
import { A, Title } from "solid-start";
import EquipamentoCard from "~/components/EquipamentoCard";
import {
  atualizarStatusEquipamento,
  excluirEquipamento,
  listarEquipamentos,
} from "~/lib/db";
import { TIPOS, type Equipamento, type StatusEquipamento } from "~/lib/types";

export default function Equipamentos() {
  const [equipamentos, setEquipamentos] = createSignal<Equipamento[]>([]);
  const [erro, setErro] = createSignal("");
  const [carregando, setCarregando] = createSignal(true);

  async function carregar() {
    setCarregando(true);
    try {
      setEquipamentos(await listarEquipamentos());
      setErro("");
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar equipamentos.");
    } finally {
      setCarregando(false);
    }
  }

  onMount(carregar);

  async function mudarStatus(id: string, status: StatusEquipamento) {
    await atualizarStatusEquipamento(id, status);
    await carregar();
  }

  async function remover(eq: Equipamento) {
    if (confirm(`Excluir "${eq.nome}"? Isso remove também suas alocações.`)) {
      await excluirEquipamento(eq.id);
      await carregar();
    }
  }

  const doTipo = (tipo: string) => equipamentos().filter((e) => e.tipo === tipo);

  return (
    <div>
      <Title>Equipamentos — Choperia</Title>
      <div class="cabecalho-pagina">
        <h1>Equipamentos</h1>
        <A class="btn" href="/equipamentos/novo">
          + Novo equipamento
        </A>
      </div>

      <Show when={erro()}>
        <p class="erro">{erro()}</p>
      </Show>

      <Show when={!carregando()} fallback={<p class="aviso">Carregando…</p>}>
        <Show
          when={equipamentos().length > 0}
          fallback={
            <p class="vazio">
              Nenhum equipamento cadastrado ainda. Comece adicionando chopeiras,
              barris, cilindros e kits de extração.
            </p>
          }
        >
          <For each={TIPOS}>
            {(t) => (
              <section class="grupo-tipo">
                <h2>
                  {t.emoji} {t.plural}{" "}
                  <span class="contagem">({doTipo(t.valor).length})</span>
                </h2>
                <Show
                  when={doTipo(t.valor).length > 0}
                  fallback={<p class="vazio">Nenhum item deste tipo.</p>}
                >
                  <div class="grade">
                    <For each={doTipo(t.valor)}>
                      {(eq) => (
                        <EquipamentoCard
                          equipamento={eq}
                          onStatus={(s) => mudarStatus(eq.id, s)}
                          onExcluir={() => remover(eq)}
                        />
                      )}
                    </For>
                  </div>
                </Show>
              </section>
            )}
          </For>
        </Show>
      </Show>
    </div>
  );
}
