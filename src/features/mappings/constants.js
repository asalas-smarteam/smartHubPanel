// Mapeo de campos (plan 4p, contrato 08). Nombres en español de los valores que guarda el
// backend; uno desconocido se muestra tal cual.

/** Objeto del CRM al que va el campo. */
export const OBJECT_LABELS = {
  product: 'Productos',
  contact: 'Contactos',
  company: 'Empresas',
  deal: 'Negocios',
  invoice: 'Facturas',
  address: 'Direcciones',
  addressExtension: 'Direcciones del documento',
}

/** De qué parte del ERP sale el campo. */
export const CONTEXT_LABELS = {
  businessPartner: 'Socio de negocio',
  contactEmployee: 'Persona de contacto',
  bpAddress: 'Dirección del socio',
  product: 'Producto',
  ItemWarehouseInfoCollection: 'Inventario por bodega',
  'orders-quotations': 'Pedidos y cotizaciones',
  'inventory-transfer-request': 'Traslado de inventario',
  'purchase-quotations': 'Cotizaciones de compra',
  addressExtension: 'Dirección del documento',
}

export const EMPTY_VALUE = '—'

const labelOf = (labels) => (value) => (value ? (labels[value] ?? value) : EMPTY_VALUE)
export const objectLabel = labelOf(OBJECT_LABELS)
export const contextLabel = labelOf(CONTEXT_LABELS)

/** Filtro de estado (`?estado=`). */
export const STATUS_FILTERS = ['activos', 'inactivos']
export const STATUS_OPTIONS = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
]
