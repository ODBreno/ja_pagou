// Service worker do "Já pagamos?": deixa o app abrir rápido e mostrar a casca sem internet.
// Só guarda arquivos do próprio site; chamadas ao Supabase (dados, login, anexos) nunca passam pelo cache.
const CACHE = 'ja-pagamos-v2'

// Notificações mandadas pelo servidor (api/notificacoes.ts): { titulo, corpo, tag }.
self.addEventListener('push', (evento) => {
  const dados = evento.data ? evento.data.json() : {}
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'Já pagamos?', {
      body: dados.corpo || '',
      tag: dados.tag,
      icon: '/icones/icone-192.png',
      badge: '/icones/icone-192.png',
    }),
  )
})

// Tocar na notificação abre o app (ou traz para frente se já estiver aberto).
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => new URL(j.url).origin === self.location.origin)
      return aberta ? aberta.focus() : self.clients.openWindow('/')
    }),
  )
})

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
