'use client'

const stripTrailingSlash = (value: string) => value.replace(/\/+$|^\s+|\s+$/g, '')
const stripLeadingSlash = (value: string) => value.replace(/^\/+/, '')

export const API_BASE_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/capstone-redo'
)

const SESSION_TOKEN_KEYS = ['sessionToken', 'authToken', 'token']

function getSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  for (const key of SESSION_TOKEN_KEYS) {
    const token = window.localStorage.getItem(key)
    if (token) {
      return token
    }
  }

  return null
}

function buildUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) {
    return input
  }

  return `${API_BASE_URL}/${stripLeadingSlash(input)}`
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown> | null
}

export async function apiFetch<T = unknown>(input: string, init: ApiFetchOptions = {}): Promise<T> {
  const url = buildUrl(input)
  const headers = new Headers(init.headers ?? {})
  const body = init.body

  if (body != null && !(body instanceof FormData) && typeof body !== 'string' && !(body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json')
  } else if (body != null && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getSessionToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
    body:
      body != null && !(body instanceof FormData) && typeof body !== 'string' && !(body instanceof URLSearchParams)
        ? JSON.stringify(body)
        : body,
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const payload = await response.json()
      if (payload && typeof payload === 'object' && 'error' in payload) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message = (payload as any).error || message
      }
    } catch {
      // ignore invalid JSON payload
    }

    const error = new Error(`API request failed: ${message}`)
    ;(error as any).status = response.status
    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  const responseText = await response.text()
  if (!responseText) {
    return undefined as T
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(responseText) as T
  }

  return responseText as unknown as T
}

export function isApiErrorWithStatus(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === status
}
