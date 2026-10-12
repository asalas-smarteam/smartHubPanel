import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'

import { DEFAULT_PAGE_SIZE, parsePage, parsePageSize, usePaginationParams } from './pagination'

function setup(initialEntry = '/usuarios') {
  const wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  )
  return renderHook(() => ({ params: usePaginationParams(), location: useLocation() }), { wrapper })
}

describe('parsePage / parsePageSize', () => {
  it('valores inválidos caen a los de defecto', () => {
    expect(parsePage(null)).toBe(1)
    expect(parsePage('0')).toBe(1)
    expect(parsePage('abc')).toBe(1)
    expect(parsePage('2.5')).toBe(1)
    expect(parsePage('3')).toBe(3)
    expect(parsePageSize('7')).toBe(DEFAULT_PAGE_SIZE)
    expect(parsePageSize(null)).toBe(DEFAULT_PAGE_SIZE)
    expect(parsePageSize('50')).toBe(50)
  })
})

describe('usePaginationParams', () => {
  it('lee page y pageSize de la URL', () => {
    const { result } = setup('/usuarios?page=3&pageSize=50')
    expect(result.current.params.page).toBe(3)
    expect(result.current.params.pageSize).toBe(50)
  })

  it('valores inválidos en la URL caen a los de defecto', () => {
    const { result } = setup('/usuarios?page=0&pageSize=7')
    expect(result.current.params.page).toBe(1)
    expect(result.current.params.pageSize).toBe(25)
  })

  it('cambiar de página actualiza la URL', () => {
    const { result } = setup()
    act(() => result.current.params.setPagination({ page: 2, pageSize: 25 }))
    expect(result.current.location.search).toBe('?page=2')
  })

  it('cambiar el tamaño vuelve a la página 1', () => {
    const { result } = setup('/usuarios?page=3')
    act(() => result.current.params.setPagination({ page: 3, pageSize: 50 }))
    expect(result.current.params.page).toBe(1)
    expect(result.current.location.search).toBe('?pageSize=50')
  })

  it('cambiar un filtro vuelve a la página 1 y conserva el tamaño', () => {
    const { result } = setup('/usuarios?page=3&pageSize=50')
    act(() => result.current.params.setFilter('tenantKey', 'ACME'))
    expect(result.current.params.page).toBe(1)
    expect(result.current.params.getFilter('tenantKey')).toBe('ACME')
    expect(result.current.location.search).toBe('?pageSize=50&tenantKey=ACME')
    act(() => result.current.params.setFilter('tenantKey', null))
    expect(result.current.location.search).toBe('?pageSize=50')
  })
})
