"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { autenticarUsuario, obterUsuarioAutenticado, useAutenticacaoUsuario } from "@/lib/autenticacao";
import { solicitarApi } from "@/lib/api";
import {
  CalendarDays,
  Check,
  Clock3,
  LogIn,
  MessageSquare,
  Star,
  X,
} from "lucide-react";
import { AlternadorTema } from "@/components/AlternadorTema";

type Refeicao = {
  id: number;
  periodo: "manha" | "almoco" | "tarde";
  horarioServico: string;
  nome: string;
  descricao: string;
};

type Cardapio = { data: string; ehDiaLetivo: boolean; refeicoes: Refeicao[] };

function rotuloPeriodo(periodo: Refeicao["periodo"]) {
  return { manha: "Lanche da manhã", almoco: "Almoço", tarde: "Lanche da tarde" }[periodo];
}

function obterDisponibilidadeRefeicoes(horario: Date) {
  const minutos = horario.getHours() * 60 + horario.getMinutes();

  return {
    manha: minutos >= 10 * 60,
    almoco: minutos >= 12 * 60,
    tarde: minutos >= 15 * 60,
  };
}

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(data);
}

function formatarDataIso(data: string) {
  if (!data) return "Próximo dia letivo";
  return formatarData(new Date(`${data}T12:00:00`));
}

function formatarCpf(valor: string) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function PaginaInicial() {
  const router = useRouter();
  const [agora, definirAgora] = useState<Date | null>(null);
  const [formularioAcessoAberto, definirFormularioAcessoAberto] = useState(false);
  const [abaCardapio, definirAbaCardapio] = useState<"hoje" | "proximo">("hoje");
  const [proximoCardapio, definirProximoCardapio] = useState<Cardapio | null>(null);
  const [refeicaoEmAvaliacao, definirRefeicaoEmAvaliacao] = useState<Refeicao | null>(null);
  const [cardapio, definirCardapio] = useState<Cardapio | null>(null);
  const estaAutenticado = useAutenticacaoUsuario();
  const usuarioAtual = typeof window === "undefined" ? null : obterUsuarioAutenticado();
  const podeAvaliar = estaAutenticado === true && usuarioAtual?.tipo === "aluno";
  const [erroAcesso, definirErroAcesso] = useState("");
  const [enviandoAcesso, definirEnviandoAcesso] = useState(false);
  const [nota, definirNota] = useState(0);
  const [avaliacaoEnviada, definirAvaliacaoEnviada] = useState(false);
  const [enviandoAvaliacao, definirEnviandoAvaliacao] = useState(false);
  const [erroAvaliacao, definirErroAvaliacao] = useState("");

  useEffect(() => {
    const atualizarHorario = () => definirAgora(new Date());
    atualizarHorario();
    const intervalo = window.setInterval(atualizarHorario, 60_000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    solicitarApi<Cardapio>("/api/cardapios/hoje")
      .then(definirCardapio)
      .catch(() => definirCardapio({ data: "", ehDiaLetivo: false, refeicoes: [] }));
    solicitarApi<Cardapio>("/api/cardapios/proximo")
      .then(definirProximoCardapio)
      .catch(() => definirProximoCardapio({ data: "", ehDiaLetivo: false, refeicoes: [] }));
  }, []);

  const disponibilidade = agora
    ? obterDisponibilidadeRefeicoes(agora)
    : { manha: true, almoco: true, tarde: true };
  function mostrarProximoCardapio() {
    definirAbaCardapio("proximo");
    window.requestAnimationFrame(() => {
      document.getElementById("cardapios")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function abrirAvaliacao(refeicao: Refeicao) {
    definirRefeicaoEmAvaliacao(refeicao);
    definirAvaliacaoEnviada(false);
    definirNota(0);
    definirErroAvaliacao("");
  }

  async function enviarAcesso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dadosFormulario = new FormData(event.currentTarget);
    const cpf = String(dadosFormulario.get("cpf") ?? "").trim();
    const senha = String(dadosFormulario.get("senha") ?? "");

    definirEnviandoAcesso(true);
    definirErroAcesso("");

    try {
      const resultado = await solicitarApi<{ token: string; usuario: { id: string; nome: string; tipo: "administrador" | "cozinha" | "aluno" } }>("/api/autenticacao/entrar", {
        method: "POST",
        body: JSON.stringify({ cpf, senha }),
      });
      autenticarUsuario(resultado.token, resultado.usuario);
      definirErroAcesso("");
      definirFormularioAcessoAberto(false);
      router.push("/painel");
    } catch (erro) {
      definirErroAcesso(erro instanceof Error ? erro.message : "Não foi possível entrar.");
    } finally {
      definirEnviandoAcesso(false);
    }
  }

  function aplicarMascaraCpf(event: FormEvent<HTMLInputElement>) {
    event.currentTarget.value = formatarCpf(event.currentTarget.value);
  }

  async function enviarAvaliacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nota === 0 || !refeicaoEmAvaliacao || !cardapio?.data) return;
    const dados = new FormData(event.currentTarget);
    definirEnviandoAvaliacao(true);
    definirErroAvaliacao("");
    try {
      await solicitarApi("/api/avaliacoes", {
        method: "POST",
        autenticado: true,
        body: JSON.stringify({
          refeicaoId: refeicaoEmAvaliacao.id,
          servidoEm: cardapio.data,
          nota,
          comentario: String(dados.get("comentario") ?? "").trim(),
        }),
      });
      definirAvaliacaoEnviada(true);
    } catch (erro) {
      definirErroAvaliacao(erro instanceof Error ? erro.message : "Não foi possível registrar a avaliação.");
    } finally {
      definirEnviandoAvaliacao(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-fundo text-texto-principal">
      <header className="border-b border-borda bg-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="" className="flex min-w-0 items-center gap-3" aria-label="Sabor Sync, início">
            <Image src="/logo.jpg" alt="Logomarca Sabor Sync" width={64} height={64} priority className="size-14 shrink-0 border border-borda object-cover" />
            <span className="min-w-0 leading-tight">
              <strong className="block text-sm tracking-wide text-texto-principal">SABOR SYNC</strong>
              <span className="block truncate text-xs text-secundaria font-medium">Cardápio ETE</span>
            </span>
          </a>

          <nav className="flex items-center gap-2" aria-label="Navegação principal">

            <button
              type="button"
              onClick={mostrarProximoCardapio}
              className="inline-flex items-center gap-2 bg-primaria px-3 py-2 text-xs font-bold text-primaria-texto shadow-md shadow-black/10 transition hover:bg-primaria-hover sm:px-4 sm:text-sm"
            >
              <CalendarDays size={17} aria-hidden="true" />
              <span className="hidden sm:inline">Ver próximo cardápio</span>
              <span className="sm:hidden">Próximo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (estaAutenticado) {
                  router.push("/painel");
                  return;
                }

                definirFormularioAcessoAberto(true);
              }}
              className="inline-flex items-center gap-2 border border-borda bg-superficie px-3 py-2 text-xs font-bold text-texto-principal transition hover:bg-borda/30 sm:text-sm"
              aria-label={estaAutenticado ? "Usuário identificado" : "Identificar usuário"}
              title={estaAutenticado ? "Usuário identificado" : "Identificar usuário"}
            >
              {estaAutenticado ? <Check size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
              <span>{estaAutenticado ? "Painel" : "Entrar"}</span>
            </button>
            <AlternadorTema />
          </nav>
        </div>
      </header>

      <section id="inicio" className="border-b border-borda bg-superficie">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-end md:py-14">
          <div>
            <p className="mb-3 text-xs font-bold tracking-[0.18em] text-secundaria">REFEIÇÕES DE HOJE</p>
            <h1 className="max-w-2xl text-3xl font-semibold text-texto-principal sm:text-4xl">Cardápio simples e sempre à vista.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-texto-secundario">Acompanhe as refeições servidas na ETE e conte como foi sua experiência.</p>
          </div>
          <div className="border-l-2 border-primaria pl-4 text-sm text-texto-secundario">
            <p className="font-semibold capitalize text-texto-principal">{agora ? formatarData(agora) : "Carregando data"}</p>
            <p className="mt-1 text-xs text-texto-secundario">As refeições encerram conforme o horário indicado.</p>
          </div>
        </div>
      </section>

      <section id="cardapios" className="mx-auto w-full max-w-7xl scroll-mt-4 px-5 py-8 sm:px-8 sm:py-12" aria-labelledby="refeicoes-title">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-secundaria">PROGRAMAÇÃO</p>
            <h2 id="refeicoes-title" className="mt-2 text-2xl font-semibold text-texto-principal">Cardápios</h2>
          </div>
          <div className="flex border border-borda bg-superficie p-1" role="tablist" aria-label="Escolher cardápio">
            <button type="button" role="tab" aria-selected={abaCardapio === "hoje"} onClick={() => definirAbaCardapio("hoje")} className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${abaCardapio === "hoje" ? "bg-primaria text-primaria-texto" : "text-texto-secundario hover:bg-borda/30 hover:text-texto-principal"}`}>Cardápio do dia</button>
            <button type="button" role="tab" aria-selected={abaCardapio === "proximo"} onClick={() => definirAbaCardapio("proximo")} className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${abaCardapio === "proximo" ? "bg-primaria text-primaria-texto" : "text-texto-secundario hover:bg-borda/30 hover:text-texto-principal"}`}>Próximo</button>
          </div>
        </div>

        <div role="tabpanel" className="animate-in fade-in duration-300">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold capitalize text-sky-400">  ➡️ {abaCardapio === "hoje" ? (agora ? formatarData(agora) : "Cardápio de hoje") : (proximoCardapio ? formatarDataIso(proximoCardapio.data) : "Carregando próxima data...")}</h3>
            <p className="text-xs text-texto-secundario">{abaCardapio === "hoje" ? "Atualizado automaticamente pelo horário local" : "Próxima data com refeições cadastradas"}</p>
          </div>
          <div className="grid gap-px overflow-hidden border border-borda bg-borda md:grid-cols-3">
            {(abaCardapio === "hoje" ? cardapio : proximoCardapio)?.refeicoes.map((refeicao) => {
              const estaDisponivel = abaCardapio === "proximo" || disponibilidade[refeicao.periodo];
              return <article key={refeicao.id} className={`flex min-h-72 flex-col bg-superficie p-6 transition-opacity duration-300 ${!estaDisponivel ? "opacity-45" : ""}`}>
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.15em] text-secundaria">{refeicao.horarioServico.replace(":", "h")}</p><h4 className="mt-2 text-xl font-semibold text-texto-principal">{refeicao.nome}</h4><p className="mt-1 text-xs text-texto-secundario">{rotuloPeriodo(refeicao.periodo)}</p></div><Clock3 size={20} className="text-texto-secundario" aria-hidden="true" /></div>
                <p className="mt-4 text-sm leading-6 text-texto-secundario">{refeicao.descricao}</p>
                {abaCardapio === "hoje" && <div className="mt-auto pt-7">{estaDisponivel ? <button type="button" onClick={() => abrirAvaliacao(refeicao)} className="inline-flex items-center gap-2 text-sm font-semibold text-secundaria transition hover:underline"><MessageSquare size={17} aria-hidden="true" />Avaliar refeição</button> : <span className="text-xs font-semibold tracking-wide text-texto-secundario">AVALIAÇÃO DISPONÍVEL APÓS {refeicao.horarioServico.replace(":", "H")}</span>}</div>}
              </article>;
            })}
            {abaCardapio === "hoje" && cardapio && cardapio.refeicoes.length === 0 && <p className="bg-superficie p-6 text-sm text-texto-secundario md:col-span-3">Nenhuma refeição cadastrada para hoje.</p>}
            {abaCardapio === "proximo" && proximoCardapio && proximoCardapio.refeicoes.length === 0 && <p className="bg-superficie p-6 text-sm text-texto-secundario md:col-span-3">Nenhuma refeição futura cadastrada.</p>}
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-borda bg-superficie">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-texto-principal">Sua opinião ajuda a melhorar o cardápio.</p>
            <p className="mt-1 text-sm text-texto-secundario">Use o menu no cabeçalho para se identificar antes de avaliar uma refeição.</p>
          </div>
        </div>
      </footer>

      {formularioAcessoAberto && (
        <div onClick={() => definirFormularioAcessoAberto(false)} className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-5" role="dialog" aria-modal="true" aria-labelledby="acesso-title">
          <form onClick={(event) => event.stopPropagation()} onSubmit={enviarAcesso} className="relative w-full max-w-md border border-borda bg-superficie p-6 shadow-2xl">
            <button type="button" onClick={() => definirFormularioAcessoAberto(false)} className="absolute right-4 top-4 grid size-9 place-items-center text-texto-secundario hover:text-texto-principal" aria-label="Fechar identificação"><X size={20} /></button>
            <p className="text-xs font-bold tracking-[0.16em] text-secundaria">IDENTIFICAÇÃO</p>
            <h2 id="acesso-title" className="mt-2 text-2xl font-semibold text-texto-principal">Entre para avaliar</h2>
            <p className="mt-2 text-sm text-texto-secundario">Use as credenciais didáticas informadas no projeto.</p>
            <label className="mt-6 block text-sm font-medium text-texto-principal" htmlFor="cpf">CPF</label>
            <input id="cpf" name="cpf" required inputMode="numeric" maxLength={14} onInput={aplicarMascaraCpf} placeholder="111.111.111-11" className="mt-2 w-full border border-borda bg-input-bg px-3 py-3 text-texto-principal outline-none placeholder:text-input-placeholder focus:border-primaria" />
            <label className="mt-4 block text-sm font-medium text-texto-principal" htmlFor="senha">Senha</label>
            <input id="senha" name="senha" maxLength={20} type="password" required placeholder="Sua senha" className="mt-2 w-full border border-borda bg-input-bg px-3 py-3 text-texto-principal outline-none placeholder:text-input-placeholder focus:border-primaria" />
            {erroAcesso && <p className="mt-3 text-sm text-erro font-medium" role="alert">{erroAcesso}</p>}
            <button disabled={enviandoAcesso} type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-primaria px-4 py-3 text-sm font-bold text-primaria-texto hover:bg-primaria-hover disabled:cursor-wait disabled:opacity-60"><LogIn size={18} />{enviandoAcesso ? "Entrando..." : "Entrar"}</button>
          </form>
        </div>
      )}

      {refeicaoEmAvaliacao && (
        <div onClick={() => definirRefeicaoEmAvaliacao(null)} className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-5" role="dialog" aria-modal="true" aria-labelledby="avaliacao-title">
          <form onClick={(event) => event.stopPropagation()} onSubmit={enviarAvaliacao} className="relative w-full max-w-md border border-borda bg-superficie p-6 shadow-2xl">
            <button type="button" onClick={() => definirRefeicaoEmAvaliacao(null)} className="absolute right-4 top-4 grid size-9 place-items-center text-texto-secundario hover:text-texto-principal" aria-label="Fechar avaliação"><X size={20} /></button>
            {!podeAvaliar && (
              <div className="py-4">
                <p className="text-xs font-bold tracking-[0.16em] text-secundaria">AVALIAÇÃO</p>
                <h2 id="avaliacao-title" className="mt-2 text-2xl font-semibold text-texto-principal">{estaAutenticado ? "Perfil sem permissão" : "Identifique-se primeiro"}</h2>
                <p className="mt-3 text-sm leading-6 text-texto-secundario">{estaAutenticado ? "Somente usuários com perfil de aluno podem enviar avaliações." : `Para avaliar ${rotuloPeriodo(refeicaoEmAvaliacao.periodo).toLowerCase()} e deixar um comentário, entre com suas credenciais de aluno.`}</p>
                {!estaAutenticado && <button type="button" onClick={() => { definirRefeicaoEmAvaliacao(null); definirFormularioAcessoAberto(true); }} className="mt-6 inline-flex items-center gap-2 bg-primaria px-4 py-3 text-sm font-bold text-primaria-texto hover:bg-primaria-hover"><LogIn size={18} />Identificar usuário</button>}
              </div>
            )}
            {podeAvaliar && avaliacaoEnviada && (
              <div className="py-8 text-center">
                <Check className="mx-auto text-sucesso" size={38} />
                <h2 id="avaliacao-title" className="mt-4 text-xl font-semibold text-texto-principal">Avaliação registrada</h2>
                <p className="mt-2 text-sm text-texto-secundario">Obrigado por compartilhar sua experiência.</p>
              </div>
            )}
            {podeAvaliar && !avaliacaoEnviada && (
              <>
                <p className="text-xs font-bold tracking-[0.16em] text-secundaria">AVALIAR REFEIÇÃO</p>
                <h2 id="avaliacao-title" className="mt-2 text-2xl font-semibold text-texto-principal">{rotuloPeriodo(refeicaoEmAvaliacao.periodo)}</h2>
                <fieldset className="mt-6">
                  <legend className="text-sm text-texto-secundario">Quantas estrelas esta refeição merece?</legend>
                  <div className="mt-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((valor) => (
                      <button key={valor} type="button" onClick={() => definirNota(valor)} className="grid size-10 place-items-center" aria-label={`${valor} estrela${valor > 1 ? "s" : ""}`}>
                        <Star size={27} className={valor <= nota ? "fill-atencao text-atencao" : "text-borda-forte"} />
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="mt-5 block text-sm text-texto-secundario" htmlFor="comentario">Comentário <span className="text-texto-secundario/70">(opcional)</span></label>
                <textarea id="comentario" name="comentario" rows={4} className="mt-2 w-full resize-none border border-borda bg-input-bg p-3 text-sm text-texto-principal outline-none focus:border-primaria placeholder:text-input-placeholder" placeholder="Conte como foi sua refeição." />
                {erroAvaliacao && <p className="mt-3 text-sm text-erro font-medium" role="alert">{erroAvaliacao}</p>}
                <button disabled={nota === 0 || enviandoAvaliacao} type="submit" className="mt-5 w-full bg-primaria px-4 py-3 text-sm font-bold text-primaria-texto hover:bg-primaria-hover disabled:cursor-not-allowed disabled:bg-borda disabled:text-texto-secundario">{enviandoAvaliacao ? "Enviando..." : "Enviar avaliação"}</button>
              </>
            )}
          </form>
        </div>
      )}
    </main>
  );
}
