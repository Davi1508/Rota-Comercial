// E-mails automáticos do Rota Comercial: roda uma vez por dia (pg_cron), manda pelo Brevo e anota o que saiu.
// Só aceita chamada com o código secreto do agendador (cabeçalho x-cron).
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_APP = "https://rotacomercial.app.br/";
const URL_FUNC = "https://ulafdnjjdiscowijqwdg.supabase.co/functions/v1/descadastrar";
const ZAP = "5575988189659";
const PRECO = "R$ 29,90 por mês";
const MAX_POR_RODADA = 80;

type P = { user_id: string; email: string; nome: string; tipo: string; trial_ate: string; token: string };

const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Bahia", day: "2-digit", month: "2-digit" });
const primeiroNome = (n: string) => (String(n || "").trim().split(/\s+/)[0] || "tudo bem").slice(0, 40);
const zap = (txt: string) => `https://wa.me/${ZAP}?text=${encodeURIComponent(txt)}`;

function botao(href: string, txt: string, cor = "#3346D3") {
  return `<a href="${href}" style="display:inline-block;background:${cor};color:#fff;text-decoration:none;font-weight:700;font-size:16px;line-height:24px;padding:12px 24px;border-radius:999px">${txt}</a>`;
}
function moldura(corpo: string, sair: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F2F4FA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14182E">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="font-weight:800;font-size:20px;line-height:28px;color:#3346D3;margin-bottom:16px">Rota Comercial</div>
<div style="background:#fff;border-radius:16px;padding:32px 24px;font-size:16px;line-height:24px">${corpo}</div>
<p style="font-size:12px;line-height:16px;color:#6B7185;margin:16px 8px">Você recebe este e-mail porque tem uma conta no Rota Comercial. <a href="${sair}" style="color:#6B7185">Não quero mais receber estes avisos</a>.</p>
</div></body></html>`;
}

export function montar(p: P) {
  const nome = esc(primeiroNome(p.nome)), sair = `${URL_FUNC}?t=${p.token}`;
  if (p.tipo === "teste_acabando") {
    const d = dataBR(p.trial_ate);
    return {
      assunto: "Seu teste do Rota Comercial acaba em 2 dias",
      html: moldura(`<p style="margin:0 0 16px">Oi, ${nome}!</p>
<p style="margin:0 0 16px">Seu teste grátis do Rota Comercial termina no dia <b>${d}</b>.</p>
<p style="margin:0 0 24px">Para continuar lançando pedidos, a assinatura custa <b>${PRECO}</b>. É só chamar no WhatsApp que eu envio o Pix e libero na hora. Tudo o que você já cadastrou continua guardado.</p>
<p style="margin:0 0 16px">${botao(zap("Oi! Quero assinar o Rota Comercial."), "Assinar pelo WhatsApp", "#1C8A4A")}</p>
<p style="margin:0">${botao(URL_APP, "Abrir o app")}</p>`, sair),
      texto: `Oi, ${primeiroNome(p.nome)}!\n\nSeu teste grátis do Rota Comercial termina no dia ${d}.\nPara continuar lançando pedidos, a assinatura custa ${PRECO}. Chame no WhatsApp que eu envio o Pix e libero na hora: ${zap("Oi! Quero assinar o Rota Comercial.")}\nTudo o que você já cadastrou continua guardado.\n\nAbrir o app: ${URL_APP}\n\nNão quero mais receber estes avisos: ${sair}`,
      sair,
    };
  }
  if (p.tipo === "teste_acabou") {
    return {
      assunto: "Seu teste do Rota Comercial terminou",
      html: moldura(`<p style="margin:0 0 16px">Oi, ${nome}!</p>
<p style="margin:0 0 16px">Seu teste grátis terminou. <b>Seus dados continuam guardados</b>: você ainda abre o app e vê suas lojas, pedidos e comissões.</p>
<p style="margin:0 0 24px">Para voltar a lançar pedidos, assine por <b>${PRECO}</b>. Chame no WhatsApp que eu envio o Pix e libero na hora.</p>
<p style="margin:0 0 16px">${botao(zap("Oi! Meu teste do Rota Comercial acabou e quero assinar."), "Assinar pelo WhatsApp", "#1C8A4A")}</p>
<p style="margin:0">Faltou alguma coisa para você? Responda este e-mail e me conte. Eu leio todos.</p>`, sair),
      texto: `Oi, ${primeiroNome(p.nome)}!\n\nSeu teste grátis terminou. Seus dados continuam guardados: você ainda abre o app e vê suas lojas, pedidos e comissões.\nPara voltar a lançar pedidos, assine por ${PRECO}: ${zap("Oi! Meu teste do Rota Comercial acabou e quero assinar.")}\n\nFaltou alguma coisa para você? Responda este e-mail e me conte.\n\nNão quero mais receber estes avisos: ${sair}`,
      sair,
    };
  }
  return {
    assunto: "Precisa de ajuda para começar no Rota Comercial?",
    html: moldura(`<p style="margin:0 0 16px">Oi, ${nome}!</p>
<p style="margin:0 0 16px">Vi que você criou sua conta, mas ainda não lançou nenhum pedido. Começar leva uns 2 minutos:</p>
<ol style="margin:0 0 24px;padding-left:24px"><li>Cadastre a marca que você representa e a comissão;</li><li>Cadastre uma loja;</li><li>Lance o primeiro pedido. A comissão aparece na hora.</li></ol>
<p style="margin:0 0 24px">${botao(URL_APP, "Abrir o app")}</p>
<p style="margin:0">Travou em alguma coisa? Responda este e-mail ou <a href="${zap("Oi! Preciso de ajuda para começar no Rota Comercial.")}" style="color:#3346D3">chame no WhatsApp</a>.</p>`, sair),
    texto: `Oi, ${primeiroNome(p.nome)}!\n\nVi que você criou sua conta, mas ainda não lançou nenhum pedido. Começar leva uns 2 minutos:\n1. Cadastre a marca que você representa e a comissão;\n2. Cadastre uma loja;\n3. Lance o primeiro pedido. A comissão aparece na hora.\n\nAbrir o app: ${URL_APP}\nTravou em alguma coisa? Responda este e-mail ou chame no WhatsApp: ${zap("Oi! Preciso de ajuda para começar no Rota Comercial.")}\n\nNão quero mais receber estes avisos: ${sair}`,
    sair,
  };
}

Deno.serve(async (req) => {
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  if (req.method !== "POST") return json({ erro: "método" }, 405);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ok } = await sb.rpc("cron_emails_ok", { p: req.headers.get("x-cron") || "" });
  if (ok !== true) return json({ erro: "não autorizado" }, 401);
  let corpo: { simular?: boolean; verificar?: boolean; teste?: string } = {};
  try { corpo = await req.json(); } catch { /* sem corpo */ }
  const chave = Deno.env.get("BREVO_API_KEY");
  const remetente = Deno.env.get("EMAIL_REMETENTE") || "contato@rotacomercial.app.br";
  if (corpo.verificar) return json({ chave: !!chave, remetente });
  const enviar = (para: string, nomePara: string, m: ReturnType<typeof montar>, tag: string) => fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": chave!, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Rota Comercial", email: remetente },
      replyTo: { email: remetente, name: "Rota Comercial" },
      to: [{ email: para, name: nomePara }],
      subject: m.assunto, htmlContent: m.html, textContent: m.texto,
      headers: { "List-Unsubscribe": `<${m.sair}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      tags: [tag],
    }),
  });
  // Teste: manda os três modelos para um endereço só, sem registrar nada
  if (corpo.teste) {
    if (!chave) return json({ erro: "falta o segredo BREVO_API_KEY" }, 503);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(corpo.teste)) return json({ erro: "e-mail de teste inválido" }, 400);
    const res: Record<string, unknown> = {};
    for (const tipo of ["teste_acabando", "teste_acabou", "sem_uso"]) {
      const m = montar({ user_id: "teste", email: corpo.teste, nome: "Teste", tipo, trial_ate: new Date(Date.now() + 2 * 864e5).toISOString(), token: "00000000-0000-4000-8000-000000000000" });
      m.assunto = "[Teste] " + m.assunto;
      const r = await enviar(corpo.teste, "Teste", m, "teste");
      res[tipo] = r.ok ? "enviado" : `${r.status} ${(await r.text()).slice(0, 200)}`;
    }
    return json({ teste: res });
  }

  const { data, error } = await sb.rpc("emails_pendentes");
  if (error) return json({ erro: error.message }, 500);
  const lista = ((data || []) as P[]).slice(0, MAX_POR_RODADA);
  const porTipo: Record<string, number> = {};
  lista.forEach((p) => (porTipo[p.tipo] = (porTipo[p.tipo] || 0) + 1));
  if (corpo.simular) return json({ simulado: true, total: lista.length, porTipo });

  if (!chave) return json({ erro: "falta o segredo BREVO_API_KEY", aguardando: lista.length, porTipo }, 503);

  let enviados = 0;
  const falhas: string[] = [];
  for (const p of lista) {
    const m = montar(p);
    const r = await enviar(p.email, primeiroNome(p.nome), m, p.tipo);
    if (r.ok) { await sb.rpc("emails_marcar", { p_user: p.user_id, p_tipo: p.tipo }); enviados++; }
    else falhas.push(`${p.tipo}:${r.status}`);
  }
  return json({ enviados, falhas: falhas.slice(0, 10), porTipo });
});
