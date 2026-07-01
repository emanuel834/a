import { Show, createEffect, createSignal } from "solid-js";
import { Title, useNavigate } from "solid-start";
import { cadastrar, entrar, session } from "~/lib/session";

export default function Login() {
  const navigate = useNavigate();
  const [modo, setModo] = createSignal<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = createSignal("");
  const [senha, setSenha] = createSignal("");
  const [erro, setErro] = createSignal("");
  const [aviso, setAviso] = createSignal("");
  const [enviando, setEnviando] = createSignal(false);

  // Se já estiver logado, vai direto para o painel.
  createEffect(() => {
    if (session()) navigate("/", { replace: true });
  });

  async function enviar(e: Event) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setEnviando(true);
    try {
      if (modo() === "entrar") {
        await entrar(email(), senha());
        navigate("/", { replace: true });
      } else {
        await cadastrar(email(), senha());
        setAviso(
          "Conta criada! Se a confirmação por e-mail estiver ativa, verifique sua caixa de entrada antes de entrar."
        );
        setModo("entrar");
      }
    } catch (err: any) {
      setErro(err?.message ?? "Falha na autenticação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div class="login-tela">
      <Title>Entrar — Choperia</Title>
      <form class="card login-card" onSubmit={enviar}>
        <h1>🍺 Choperia</h1>
        <p class="subtitulo">Gestão de festas e equipamentos</p>

        <label>
          E-mail
          <input
            type="email"
            required
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            placeholder="voce@exemplo.com"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            required
            minLength={6}
            value={senha()}
            onInput={(e) => setSenha(e.currentTarget.value)}
            placeholder="mínimo 6 caracteres"
          />
        </label>

        <Show when={erro()}>
          <p class="erro">{erro()}</p>
        </Show>
        <Show when={aviso()}>
          <p class="ok">{aviso()}</p>
        </Show>

        <button type="submit" disabled={enviando()}>
          {enviando()
            ? "Aguarde…"
            : modo() === "entrar"
            ? "Entrar"
            : "Criar conta"}
        </button>

        <button
          type="button"
          class="btn-link"
          onClick={() => {
            setErro("");
            setAviso("");
            setModo(modo() === "entrar" ? "cadastrar" : "entrar");
          }}
        >
          {modo() === "entrar"
            ? "Não tem conta? Cadastre-se"
            : "Já tem conta? Entrar"}
        </button>
      </form>
    </div>
  );
}
