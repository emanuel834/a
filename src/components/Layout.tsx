import { Show, type JSX } from "solid-js";
import { A, useLocation, useNavigate } from "solid-start";
import { session, sair } from "~/lib/session";
import AuthGuard from "./AuthGuard";

// Casca do app: cabeçalho com navegação + conteúdo protegido por AuthGuard.
// Na tela de login renderiza o conteúdo cru (sem cabeçalho nem guarda).
export default function Layout(props: { children: JSX.Element }) {
  const navigate = useNavigate();
  const location = useLocation();

  async function logout() {
    await sair();
    navigate("/login", { replace: true });
  }

  return (
    <Show when={location.pathname !== "/login"} fallback={props.children}>
    <div class="app">
      <header class="topo">
        <A href="/" class="marca">
          🍺 Choperia — Gestão de Festas
        </A>
        <nav class="nav">
          <A href="/" end>
            Painel
          </A>
          <A href="/festas">Festas</A>
          <A href="/equipamentos">Equipamentos</A>
          <Show when={session()}>
            <button class="btn-link" onClick={logout}>
              Sair
            </button>
          </Show>
        </nav>
      </header>
      <main class="conteudo">
        <AuthGuard>{props.children}</AuthGuard>
      </main>
    </div>
    </Show>
  );
}
