import { For, Show, createSignal, onMount } from "solid-js";
import { A, Title } from "solid-start";
import { listarEquipamentos, listarFestas } from "~/lib/db";
import {
  STATUS_FESTA,
  TIPOS,
  type Equipamento,
  type Festa,
} from "~/lib/types";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function Painel() {
  const [festas, setFestas] = createSignal<Festa[]>([]);
  const [equipamentos, setEquipamentos] = createSignal<Equipamento[]>([]);
  const [erro, setErro] = createSignal("");
  const [carregando, setCarregando] = createSignal(true);

  onMount(async () => {
    try {
      const [f, e] = await Promise.all([listarFestas(), listarEquipamentos()]);
      setFestas(f);
      setEquipamentos(e);
    } catch (err: any) {
      setErro(err?.message ?? "Erro ao carregar o painel.");
    } finally {
      setCarregando(false);
    }
  });

  const agora = () => new Date();
  const proximas = () =>
    festas()
      .filter(
        (f) => f.status !== "cancelada" && new Date(f.data_fim) >= agora()
      )
      .slice(0, 5);

  const contarPorTipo = (tipo: string) =>
    equipamentos().filter((e) => e.tipo === tipo).length;
  const disponiveisPorTipo = (tipo: string) =>
    equipamentos().filter((e) => e.tipo === tipo && e.status === "disponivel")
      .length;

  return (
    <div>
      <Title>Painel — Choperia</Title>
      <h1>Painel</h1>

      <Show when={erro()}>
        <p class="erro">{erro()}</p>
      </Show>

      <Show when={!carregando()} fallback={<p class="aviso">Carregando…</p>}>
        <section>
          <h2>Estoque por área</h2>
          <div class="grade cards-resumo">
            <For each={TIPOS}>
              {(t) => (
                <A class="card resumo" href="/equipamentos">
                  <span class="resumo-emoji">{t.emoji}</span>
                  <strong>{t.plural}</strong>
                  <span class="resumo-num">{contarPorTipo(t.valor)}</span>
                  <span class="descricao">
                    {disponiveisPorTipo(t.valor)} disponível(is)
                  </span>
                </A>
              )}
            </For>
          </div>
        </section>

        <section>
          <div class="cabecalho-pagina">
            <h2>Próximas festas</h2>
            <A class="btn" href="/festas/nova">
              + Nova festa
            </A>
          </div>
          <Show
            when={proximas().length > 0}
            fallback={<p class="vazio">Nenhuma festa agendada.</p>}
          >
            <div class="grade">
              <For each={proximas()}>
                {(f) => (
                  <A class="card festa-card" href={`/festas/${f.id}`}>
                    <div class="festa-topo">
                      <strong>{f.nome}</strong>
                      <span class={`badge badge-festa-${f.status}`}>
                        {STATUS_FESTA[f.status]}
                      </span>
                    </div>
                    <p class="periodo">🗓️ {formatarData(f.data_inicio)}</p>
                    <Show when={f.local}>
                      <p class="descricao">📍 {f.local}</p>
                    </Show>
                  </A>
                )}
              </For>
            </div>
          </Show>
        </section>
      </Show>
    </div>
  );
}
