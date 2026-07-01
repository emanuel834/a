import { For, Show, createSignal } from "solid-js";
import { Title, useNavigate, useSearchParams } from "solid-start";
import { criarEquipamento } from "~/lib/db";
import { TIPOS, type StatusEquipamento, type TipoEquipamento } from "~/lib/types";

export default function NovoEquipamento() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const tipoInicial = (): TipoEquipamento =>
    TIPOS.some((t) => t.valor === params.tipo)
      ? (params.tipo as TipoEquipamento)
      : "chopeira";

  const [tipo, setTipo] = createSignal<TipoEquipamento>(tipoInicial());
  const [nome, setNome] = createSignal("");
  const [descricao, setDescricao] = createSignal("");
  const [status, setStatus] = createSignal<StatusEquipamento>("disponivel");
  const [erro, setErro] = createSignal("");
  const [enviando, setEnviando] = createSignal(false);

  async function enviar(e: Event) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await criarEquipamento({
        tipo: tipo(),
        nome: nome().trim(),
        descricao: descricao().trim(),
        status: status(),
      });
      navigate("/equipamentos", { replace: true });
    } catch (err: any) {
      setErro(err?.message ?? "Erro ao salvar.");
      setEnviando(false);
    }
  }

  return (
    <div>
      <Title>Novo equipamento — Choperia</Title>
      <div class="cabecalho-pagina">
        <h1>Novo equipamento</h1>
      </div>

      <form class="card form" onSubmit={enviar}>
        <label>
          Tipo (área)
          <select
            value={tipo()}
            onChange={(e) => setTipo(e.currentTarget.value as TipoEquipamento)}
          >
            <For each={TIPOS}>
              {(t) => <option value={t.valor}>{t.rotulo}</option>}
            </For>
          </select>
        </label>

        <label>
          Nome / código
          <input
            required
            value={nome()}
            onInput={(e) => setNome(e.currentTarget.value)}
            placeholder="Ex.: Chopeira 2 vias #01"
          />
        </label>

        <label>
          Descrição (opcional)
          <input
            value={descricao()}
            onInput={(e) => setDescricao(e.currentTarget.value)}
            placeholder="Ex.: Barril 30L Pilsen"
          />
        </label>

        <label>
          Status
          <select
            value={status()}
            onChange={(e) =>
              setStatus(e.currentTarget.value as StatusEquipamento)
            }
          >
            <option value="disponivel">Disponível</option>
            <option value="em_manutencao">Em manutenção</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>

        <Show when={erro()}>
          <p class="erro">{erro()}</p>
        </Show>

        <div class="form-acoes">
          <button type="submit" disabled={enviando()}>
            {enviando() ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            class="btn-secundario"
            onClick={() => navigate("/equipamentos")}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
