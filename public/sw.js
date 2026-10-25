// Service worker do "Já pagamos?": deixa o app abrir rápido e mostrar a casca sem internet.
// Só guarda arquivos do próprio site; chamadas ao Supabase (dados, login, anexos) nunca passam pelo cache.
const CACHE = 'ja-pagamos-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Páginas: rede primeiro (para pegar a versão nova), cache se estiver offline.
  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(CACHE).then((cache) => cache.put('/', copia))
          return resposta
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Arquivos com hash no nome (/assets/...) e ícones não mudam: cache primeiro.
  evento.respondWith(
    caches.match(request).then(
      (salva) =>
        salva ||
        fetch(request).then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copia))
          }
          return resposta
        }),
    ),
  )
})
