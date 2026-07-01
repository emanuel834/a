import { Show, createSignal } from "solid-js";
import { Title, useNavigate } from "solid-start";
import { criarFesta } from "~/lib/db";

export default function NovaFesta() {
  const navigate = useNavigate();
  const [nome, setNome] = createSignal("");
  const [cliente, setCliente] = createSignal("");
  const [local, setLocal] = createSignal("");
  const [inicio, setInicio] = createSignal("");
  const [fim, setFim] = createSignal("");
  const [observacoes, setObservacoes] = createSignal("");
  const [erro, setErro] = createSignal("");
  const [enviando, setEnviando] = createSignal(false);

  async function enviar(e: Event) {
    e.preventDefault();
    setErro("");
    if (new Date(fim()) < new Date(inicio())) {
      setErro("A data de término não pode ser anterior à de início.");
      return;
    }
    setEnviando(true);
    try {
      const festa = await criarFesta({
        nome: nome().trim(),
        cliente: cliente().trim(),
        local: local().trim(),
        data_inicio: new Date(inicio()).toISOString(),
        data_fim: new Date(fim()).toISOString(),
        observacoes: observacoes().trim(),
      });
      // Vai direto ao detalhe para já alocar os equipamentos.
      navigate(`/festas/${festa.id}`, { replace: true });
    } catch (err: any) {
      setErro(err?.message ?? "Erro ao salvar.");
      setEnviando(false);
    }
  }

  return (
    <div>
      <Title>Nova festa — Choperia</Title>
      <div class="cabecalho-pagina">
        <h1>Nova festa</h1>
      </div>

      <form class="card form" onSubmit={enviar}>
        <label>
          Nome do evento
          <input
            required
            value={nome()}
            onInput={(e) => setNome(e.currentTarget.value)}
            placeholder="Ex.: Casamento Ana & João"
          />
        </label>

        <label>
          Cliente (opcional)
          <input
            value={cliente()}
            onInput={(e) => setCliente(e.currentTarget.value)}
            placeholder="Nome do contratante"
          />
        </label>

        <label>
          Local (opcional)
          <input
            value={local()}
            onInput={(e) => setLocal(e.currentTarget.value)}
            placeholder="Endereço / salão"
          />
        </label>

        <div class="form-linha">
          <label>
            Início
            <input
              type="datetime-local"
              required
              value={inicio()}
              onInput={(e) => setInicio(e.currentTarget.value)}
            />
          </label>
          <label>
            Término
            <input
              type="datetime-local"
              required
              value={fim()}
              onInput={(e) => setFim(e.currentTarget.value)}
            />
          </label>
        </div>

        <label>
          Observações (opcional)
          <textarea
            rows={3}
            value={observacoes()}
            onInput={(e) => setObservacoes(e.currentTarget.value)}
            placeholder="Detalhes de entrega, contato, etc."
          />
        </label>

        <Show when={erro()}>
          <p class="erro">{erro()}</p>
        </Show>

        <div class="form-acoes">
          <button type="submit" disabled={enviando()}>
            {enviando() ? "Salvando…" : "Salvar e alocar equipamentos"}
          </button>
          <button
            type="button"
            class="btn-secundario"
            onClick={() => navigate("/festas")}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
