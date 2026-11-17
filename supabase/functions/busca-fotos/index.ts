// Busca fotos de produtos no Brave para o cadastro do catálogo.
// Só para quem está logado com conta ativa; limite mensal por usuário; buscas iguais ficam guardadas por 30 dias (não gastam de novo).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const URL_SB = Deno.env.get("SUPABASE_URL")!, SERVICO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const rpc = async (nome: string, args: unknown) => {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nome}`, { method: "POST", headers: { apikey: SERVICO, Authorization: `Bearer ${SERVICO}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`rpc ${nome}: ${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
};
// "https://lojavirtual.disolle.com.br/x" -> "disolle"
function palavraDoSite(site: string): string {
  try {
    const h = new URL(/^https?:\/\//i.test(site) ? site : "https://" + site).hostname.toLowerCase();
    const partes = h.split(".").filter((p) => !["www", "loja", "lojavirtual", "shop", "store", "com", "br", "net", "org", "ind", "app", "online", "site"].includes(p));
    return (partes.sort((a, b) => b.length - a.length)[0] || "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  } catch { return ""; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { erro: "use POST" });
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json(401, { erro: "Entre na sua conta para buscar fotos" });
  const quem = await fetch(`${URL_SB}/auth/v1/user`, { headers: { Authorization: auth, apikey: req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "" } });
  if (!quem.ok) return json(401, { erro: "Entre na sua conta para buscar fotos" });
  const uid = (await quem.json()).id as string;

  let texto = "", site = "";
  try { const b = await req.json(); texto = String(b.q || ""); site = String(b.site || ""); } catch { return json(400, { erro: "pedido inválido" }); }
  const palavra = site ? palavraDoSite(site) : "";
  const q = [palavra, texto].join(" ").normalize("NFC").replace(/\s+/g, " ").trim().slice(0, 200);
  if (q.length < 3) return json(400, { erro: "Digite o nome do produto antes de buscar" });
  const chaveCache = q.toLowerCase();

  try {
    const guardado = await rpc("busca_cache_ler", { p_q: chaveCache });
    if (guardado) return json(200, { fotos: guardado, guardada: true });

    const cont = await rpc("busca_contar", { p_uid: uid });
    if (!cont.ok) return json(429, cont.motivo === "limite"
      ? { erro: `Você usou as ${cont.limite} buscas de foto deste mês. Elas voltam no mês que vem.`, limite: true }
      : { erro: "Sua conta precisa estar ativa para buscar fotos" });

    const chave = Deno.env.get("BRAVE_API_KEY");
    if (!chave) return json(503, { erro: "Busca de fotos indisponível no momento" });
    const u = "https://api.search.brave.com/res/v1/images/search?" + new URLSearchParams({ q, country: "BR", search_lang: "pt-br", count: "20", safesearch: "strict" });
    const r = await fetch(u, { headers: { "X-Subscription-Token": chave, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return json(502, { erro: "A busca de fotos não respondeu agora. Tente de novo." });
    const d = await r.json();
    let fotos = (d.results || []).map((x: any) => ({
      img: String(x.properties?.url || ""), thumb: String(x.thumbnail?.src || ""), fonte: String(x.source || "").slice(0, 80),
      titulo: String(x.title || "").slice(0, 140), w: +x.properties?.width || 0, h: +x.properties?.height || 0,
    })).filter((f: any) => /^https:\/\//.test(f.thumb) && /^https?:\/\//.test(f.img) && !(f.w && f.h && Math.min(f.w, f.h) < 200));
    if (palavra) fotos = [...fotos.filter((f: any) => f.fonte.includes(palavra)), ...fotos.filter((f: any) => !f.fonte.includes(palavra))];
    fotos = fotos.slice(0, 12);
    await rpc("busca_cache_gravar", { p_q: chaveCache, p_res: fotos });
    return json(200, { fotos, usadas: cont.usadas, limite: cont.limite });
  } catch (e) {
    console.error(e);
    return json(500, { erro: "Não deu para buscar agora. Tente de novo." });
  }
});
