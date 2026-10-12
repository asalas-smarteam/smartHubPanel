import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { server } from '@/mocks/server'

import { apiFetch } from './client'
import { ApiError, getErrorMessage } from './errors'

function captureRequest(method, path, response = HttpResponse.json({ ok: true })) {
  const captured = {}
  server.use(
    http[method](path, async ({ request }) => {
      captured.request = request
      captured.url = new URL(request.url)
      captured.body = request.method === 'GET' ? null : await request.text()
      return response
    }),
  )
  return captured
}

describe('apiFetch', () => {
  it('llama a /api con la ruta dada y sin X-Panel-Request en GET', async () => {
    const captured = captureRequest('get', '/api/auth/me')
    await apiFetch('/auth/me')
    expect(captured.url.pathname).toBe('/api/auth/me')
    expect(captured.request.headers.get('X-Panel-Request')).toBeNull()
    expect(captured.request.credentials).toBe('same-origin')
  })

  it('manda X-Panel-Request: 1 y JSON en las mutaciones', async () => {
    const post = captureRequest('post', '/api/auth/login')
    await apiFetch('/auth/login', { method: 'POST', json: { email: 'a@b.c', password: 'x' } })
    expect(post.request.headers.get('X-Panel-Request')).toBe('1')
    expect(post.request.headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(post.body)).toEqual({ email: 'a@b.c', password: 'x' })

    const patch = captureRequest('patch', '/api/staff/users/u1')
    await apiFetch('/staff/users/u1', { method: 'PATCH', json: { active: false } })
    expect(patch.request.headers.get('X-Panel-Request')).toBe('1')
  })

  it('omite los parámetros vacíos de la query', async () => {
    const captured = captureRequest('get', '/api/staff/users')
    await apiFetch('/staff/users', { query: { page: 2, pageSize: 25, tenantKey: '', x: null } })
    expect(Object.fromEntries(captured.url.searchParams)).toEqual({ page: '2', pageSize: '25' })
  })

  it('devuelve undefined con 204', async () => {
    captureRequest('post', '/api/auth/logout', new HttpResponse(null, { status: 204 }))
    await expect(apiFetch('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('valida la respuesta con el esquema', async () => {
    captureRequest('get', '/api/thing', HttpResponse.json({ id: 'a', extra: 1 }))
    const schema = z.object({ id: z.string() })
    await expect(apiFetch('/thing', { schema })).resolves.toEqual({ id: 'a' })
  })

  it('lanza invalid_response si la respuesta no cumple el esquema', async () => {
    captureRequest('get', '/api/thing', HttpResponse.json({ id: 123 }))
    const schema = z.object({ id: z.string() })
    const consoleError = console.error
    console.error = () => {}
    try {
      await expect(apiFetch('/thing', { schema })).rejects.toMatchObject({
        status: 200,
        code: 'invalid_response',
      })
    } finally {
      console.error = consoleError
    }
  })
})

describe('errores de la API', () => {
  it('formato del panel: { error, message }', async () => {
    captureRequest(
      'post',
      '/api/auth/login',
      HttpResponse.json({ error: 'invalid_credentials' }, { status: 401 }),
    )
    const error = await apiFetch('/auth/login', { method: 'POST', json: {} }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, code: 'invalid_credentials' })
    expect(getErrorMessage(error)).toBe('Correo o contraseña incorrectos.')
  })

  it('formato actual del backend: { ok: false, message }', async () => {
    captureRequest(
      'get',
      '/api/x',
      HttpResponse.json({ ok: false, message: 'Nope' }, { status: 404 }),
    )
    const error = await apiFetch('/x').catch((e) => e)
    expect(error).toMatchObject({ status: 404, code: null, serverMessage: 'Nope' })
    expect(getErrorMessage(error)).toBe('No encontramos lo que buscas.')
  })

  it('formato por defecto de Fastify: { statusCode, error, message }', async () => {
    captureRequest(
      'post',
      '/api/x',
      HttpResponse.json(
        { statusCode: 400, error: 'Bad Request', message: 'body/email must match format' },
        { status: 400 },
      ),
    )
    const error = await apiFetch('/x', { method: 'POST', json: {} }).catch((e) => e)
    expect(error).toMatchObject({ status: 400, code: null })
    expect(getErrorMessage(error)).toBe('Revisa los datos e inténtalo de nuevo.')
  })

  it('error de red → network_error', async () => {
    server.use(http.get('/api/down', () => HttpResponse.error()))
    const error = await apiFetch('/down').catch((e) => e)
    expect(error).toMatchObject({ status: 0, code: 'network_error' })
  })

  it('5xx sin cuerpo → mensaje genérico', async () => {
    captureRequest('get', '/api/boom', new HttpResponse(null, { status: 500 }))
    const error = await apiFetch('/boom').catch((e) => e)
    expect(error.status).toBe(500)
    expect(getErrorMessage(error)).toMatch(/servidor tuvo un problema/)
  })
})
