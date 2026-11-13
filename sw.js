// Service worker do Rota Comercial: guarda o app no aparelho para abrir sem internet.
// Estratégia: tenta a rede primeiro (para sempre pegar a versão nova) e usa a cópia guardada se estiver sem conexão.
const VERSAO = 'rc-v1';
// Bibliotecas e fontes de fora que também ficam guardadas (mapa, conta, fonte)
const DE_FORA = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSAO);
    // os arquivos de js têm nome com assunto; pega a lista real pelo index.html
    try {
      const html = await (await fetch('index.html', { cache: 'no-store' })).text();
      const scripts = [...html.matchAll(/src="(js\/[^"]+)"/g)].map(m => m[1]);
      await c.addAll(['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon-192.png', ...scripts]);
    } catch (err) { /* sem internet na instalação: guarda conforme for usando */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSAO) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mesmoSite = url.origin === self.location.origin;
  // dados da conta (Supabase) nunca são guardados aqui: vão sempre direto ao servidor
  if (!mesmoSite && !DE_FORA.includes(url.hostname)) return;
  e.respondWith((async () => {
    const c = await caches.open(VERSAO);
    try {
      const rede = await Promise.race([fetch(req), new Promise((_, r) => setTimeout(() => r(new Error('lento')), 6000))]);
      if (rede && (rede.ok || rede.type === 'opaque')) c.put(req, rede.clone());
      return rede;
    } catch (err) {
      const guardado = await c.match(req, { ignoreSearch: mesmoSite }) || (req.mode === 'navigate' && await c.match('index.html'));
      if (guardado) return guardado;
      throw err;
    }
  })());
});
