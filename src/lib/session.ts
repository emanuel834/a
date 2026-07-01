import { createSignal } from "solid-js";
import { isServer } from "solid-js/web";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Sinal global com a sessão atual do Supabase.
const [session, setSession] = createSignal<Session | null>(null);
const [carregando, setCarregando] = createSignal(true);

if (!isServer) {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
    setCarregando(false);
  });
  supabase.auth.onAuthStateChange((_evento, novaSessao) => {
    setSession(novaSessao);
    setCarregando(false);
  });
}

export { session, carregando };

export async function entrar(email: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) throw error;
}

export async function cadastrar(email: string, senha: string) {
  const { error } = await supabase.auth.signUp({ email, password: senha });
  if (error) throw error;
}

export async function sair() {
  await supabase.auth.signOut();
}
