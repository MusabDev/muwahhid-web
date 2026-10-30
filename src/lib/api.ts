export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

let csrfPromise: Promise<void> | null = null

async function ensureCsrf() {
  if (readCookie('XSRF-TOKEN')) return
  csrfPromise ??= fetch('/sanctum/csrf-cookie', { credentials: 'include' }).then(() => {
    csrfPromise = null
  })
  await csrfPromise
}

type Body = Record<string, unknown> | unknown[] | FormData | undefined

export async function api<T>(path: string, options: { method?: string; body?: Body; query?: Record<string, unknown>; retried?: boolean; keepalive?: boolean } = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }

  if (method !== 'GET') {
    await ensureCsrf()
    const token = readCookie('XSRF-TOKEN')
    if (token) headers['X-XSRF-TOKEN'] = token
  }

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  let url = `/api${path}`
  if (options.query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

  const response = await fetch(url, { method, headers, body, credentials: 'include', keepalive: options.keepalive })

  if (response.status === 419 && method !== 'GET' && !options.retried) {
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
    return api<T>(path, { ...options, retried: true })
  }

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(response.status, data.message ?? 'কিছু একটা সমস্যা হয়েছে', data.errors ?? {})
  }

  return data as T
}

export function firstError(error: unknown) {
  if (error instanceof ApiError) {
    const first = Object.values(error.errors)[0]?.[0]
    return first ?? error.message
  }
  return error instanceof Error ? error.message : 'কিছু একটা সমস্যা হয়েছে'
}
