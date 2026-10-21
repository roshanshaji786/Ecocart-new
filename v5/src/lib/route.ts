// Hash routes: #/ · #/shop · #/shop/<category> · #/p/<slug> · #/cart · #/impact · #/account · #/admin · #/search?q=
export type Route = { name: string; param?: string; query: URLSearchParams }

export const parse = (hash = location.hash): Route => {
  const [path, qs] = hash.replace(/^#\/?/, '').split('?')
  const [name, param] = path.split('/')
  return { name: name || 'home', param: param ? decodeURIComponent(param) : undefined, query: new URLSearchParams(qs) }
}

export const go = (to: string) => {
  if (location.hash !== to) location.hash = to
  window.scrollTo(0, 0)
}
