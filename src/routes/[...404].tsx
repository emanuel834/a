import { A, Title } from "solid-start";
import { HttpStatusCode } from "solid-start/server";

export default function NotFound() {
  return (
    <div>
      <Title>Página não encontrada — Choperia</Title>
      <HttpStatusCode code={404} />
      <h1>Página não encontrada</h1>
      <p class="descricao">A página que você procura não existe.</p>
      <A class="btn" href="/">
        Voltar ao painel
      </A>
    </div>
  );
}
