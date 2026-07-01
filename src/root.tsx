// @refresh reload
import { Suspense } from "solid-js";
import {
  Body,
  ErrorBoundary,
  FileRoutes,
  Head,
  Html,
  Meta,
  Routes,
  Scripts,
  Title,
} from "solid-start";
import Layout from "~/components/Layout";
import "./root.css";

export default function Root() {
  return (
    <Html lang="pt-BR">
      <Head>
        <Title>Choperia — Gestão de Festas</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Body>
        <Suspense>
          <ErrorBoundary>
            <Layout>
              <Routes>
                <FileRoutes />
              </Routes>
            </Layout>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  );
}
