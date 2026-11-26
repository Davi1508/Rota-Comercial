// Link "não quero mais receber estes avisos" dos e-mails automáticos. Público: o código no link é o que identifica a pessoa.
import { createClient } from "jsr:@supabase/supabase-js@2";

const pagina = (titulo: string, texto: string, s = 200) => new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${titulo}</title></head>
<body style="margin:0;background:#F2F4FA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14182E"><div style="max-width:464px;margin:0 auto;padding:64px 16px">
<div style="font-weight:800;font-size:20px;line-height:28px;color:#3346D3;margin-bottom:16px">Rota Comercial</div>
<div style="background:#fff;border-radius:16px;padding:32px 24px"><h1 style="font-size:24px;line-height:32px;margin:0 0 16px">${titulo}</h1><p style="font-size:16px;line-height:24px;margin:0">${texto}</p></div></div></body></html>`,
  { status: s, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });

Deno.serve(async (req) => {
  const t = new URL(req.url).searchParams.get("t") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return pagina("Link inválido", "Esse link não está completo. Se quiser parar de receber os avisos, responda qualquer e-mail nosso pedindo.", 400);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.rpc("emails_descadastrar", { p_token: t });
  if (error) return pagina("Não deu certo agora", "Tente de novo em alguns minutos, ou responda qualquer e-mail nosso pedindo para sair.", 500);
  if (!data) return pagina("Link não encontrado", "Não achamos esse cadastro. Se quiser parar de receber os avisos, responda qualquer e-mail nosso pedindo.", 404);
  return pagina("Pronto, você não vai mais receber estes avisos", "Sua conta continua normal. E-mails necessários, como troca de senha, ainda podem chegar quando você pedir.");
});
