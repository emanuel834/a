import { For, Show, createSignal, onMount } from "solid-js";
import { A, Title } from "solid-start";
import { listarFestas } from "~/lib/db";
import { STATUS_FESTA, type Festa } from "~/lib/types";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function Festas() {
  const [festas, setFestas] = createSignal<Festa[]>([]);
  const [erro, setErro] = createSignal("");
  const [carregando, setCarregando] = createSignal(true);

  async function carregar() {
    setCarregando(true);
    try {
      setFestas(await listarFestas());
      setErro("");
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar festas.");
    } finally {
      setCarregando(false);
    }
  }

  onMount(carregar);

  return (
    <div>
      <Title>Festas — Choperia</Title>
      <div class="cabecalho-pagina">
        <h1>Festas</h1>
        <A class="btn" href="/festas/nova">
          + Nova festa
        </A>
      </div>

      <Show when={erro()}>
        <p class="erro">{erro()}</p>
      </Show>

      <Show when={!carregando()} fallback={<p class="aviso">Carregando…</p>}>
        <Show
          when={festas().length > 0}
          fallback={
            <p class="vazio">
              Nenhuma festa cadastrada. Clique em "Nova festa" para começar.
            </p>
          }
        >
          <div class="grade">
            <For each={festas()}>
              {(f) => (
                <A class="card festa-card" href={`/festas/${f.id}`}>
                  <div class="festa-topo">
                    <strong>{f.nome}</strong>
                    <span class={`badge badge-festa-${f.status}`}>
                      {STATUS_FESTA[f.status]}
                    </span>
                  </div>
                  <Show when={f.cliente}>
                    <p class="descricao">👤 {f.cliente}</p>
                  </Show>
                  <Show when={f.local}>
                    <p class="descricao">📍 {f.local}</p>
                  </Show>
                  <p class="periodo">
                    🗓️ {formatarData(f.data_inicio)} → {formatarData(f.data_fim)}
                  </p>
                </A>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
