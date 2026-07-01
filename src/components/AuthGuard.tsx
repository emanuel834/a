import { Show, createEffect, type JSX } from "solid-js";
import { useNavigate } from "solid-start";
import { session, carregando } from "~/lib/session";

// Protege rotas: enquanto carrega mostra um aviso; sem sessão redireciona p/ /login.
export default function AuthGuard(props: { children: JSX.Element }) {
  const navigate = useNavigate();

  createEffect(() => {
    if (!carregando() && !session()) {
      navigate("/login", { replace: true });
    }
  });

  return (
    <Show
      when={!carregando() && session()}
      fallback={<p class="aviso">Carregando…</p>}
    >
      {props.children}
    </Show>
  );
}
