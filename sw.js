// Service worker: deixa o site abrir sem internet (na estrada o sinal cai).
//
// Estratégia "rede primeiro": com internet, sempre busca a versão nova e
// guarda uma cópia; sem internet, usa a cópia guardada.
// "__V__" é trocado pela versão do commit na publicação (veja o workflow).

const CACHE = "esse-frete-paga-__V__";
const ARQUIVOS = [
  "./",
  "index.html",
  "styles.css?v=__V__",
  "src/app.js?v=__V__",
  "src/calc.js?v=__V__",
  "src/antt-tabela-a.js?v=__V__",
  "src/config.js?v=__V__",
  "src/compartilhar.js?v=__V__",
  "manifest.webmanifest",
  "icones/icone-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  // apaga as cópias de versões antigas
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // só cuida dos arquivos do próprio site; a busca de rota (outro endereço) passa direto
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return resp;
      })
      .catch(async () => {
        const guardado = await caches.match(req);
        if (guardado) return guardado;
        if (req.mode === "navigate") return caches.match("./");
        return Response.error();
      })
  );
});
