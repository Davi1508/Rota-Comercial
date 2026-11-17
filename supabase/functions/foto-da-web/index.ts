// Busca uma imagem da internet para o app (o navegador não consegue por causa de CORS).
// Só para quem está logado; só imagens; até 8 MB; nada de endereços internos.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const erro = (status: number, msg: string) =>
  new Response(JSON.stringify({ erro: msg }), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const MAX = 8 * 1024 * 1024;

function enderecoProibido(u: URL): boolean {
  if (!/^https?:$/.test(u.protocol)) return true;
  if (u.username || u.password) return true;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h.includes(".") || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h.includes(":")) return true; // IPv6 literal
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    if (a === 10 || a === 127 || a === 0 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return true;
  }
  if (/^\d+$/.test(h) || /^0x/i.test(h)) return true;
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erro(405, "use POST");
  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!auth.startsWith("Bearer ")) return erro(401, "entre na sua conta");
  const quem = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!quem.ok) return erro(401, "entre na sua conta");

  let alvo: URL;
  try {
    const { url } = await req.json();
    if (typeof url !== "string" || url.length > 2000) return erro(400, "link inválido");
    alvo = new URL(url.trim());
  } catch { return erro(400, "link inválido"); }

  try {
    let atual = alvo, r: Response | null = null;
    for (let i = 0; i < 4; i++) { // segue até 3 redirecionamentos, conferindo cada destino
      if (enderecoProibido(atual)) return erro(400, "link não permitido");
      r = await fetch(atual, {
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RotaComercial/1.0)", Accept: "image/*" },
        signal: AbortSignal.timeout(10000),
      });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { atual = new URL(r.headers.get("location")!, atual); continue; }
      break;
    }
    if (!r || !r.ok) return erro(502, "não consegui abrir esse link");
    const tipo = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!/^image\/(jpeg|jpg|png|webp|gif|avif)$/.test(tipo)) return erro(415, "esse link não é de uma imagem");
    const tam = +(r.headers.get("content-length") || 0);
    if (tam > MAX) return erro(413, "imagem grande demais");
    const leitor = r.body!.getReader(), partes: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.length;
      if (total > MAX) { leitor.cancel(); return erro(413, "imagem grande demais"); }
      partes.push(value);
    }
    const corpo = new Uint8Array(total);
    let p = 0; for (const x of partes) { corpo.set(x, p); p += x.length; }
    return new Response(corpo, { headers: { ...CORS, "Content-Type": tipo, "Cache-Control": "no-store" } });
  } catch {
    return erro(502, "não consegui abrir esse link");
  }
});
