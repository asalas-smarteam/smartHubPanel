// Mapeos de campos de ejemplo del modo simulado (plan 4p), ya con la forma del contrato I2.
// Ficticios: campos del ERP y propiedades del CRM inventados para cada empresa.

const row = (tenantKey, n, fields) => ({
  id: `map-${tenantKey.toLowerCase()}-${String(n).padStart(3, '0')}`,
  tenantKey,
  isActive: true,
  editable: true,
  includeInSourceQuery: true,
  userField: false,
  ...fields,
})

const ACME = [
  ['product', 'product', 'ItemCode', 'item_code'],
  ['product', 'product', 'ItemName', 'name'],
  [
    'product',
    'product',
    'QuantityOnStock',
    'quantity',
    { editable: false, includeInSourceQuery: false },
  ],
  ['product', 'product', 'Price', 'price'],
  ['product', 'ItemWarehouseInfoCollection', 'InStock', 'stock_bodega'],
  ['product', 'ItemWarehouseInfoCollection', 'WarehouseCode', 'bodega'],
  ['company', 'businessPartner', 'CardCode', 'codigo_cliente', { editable: false }],
  ['company', 'businessPartner', 'CardName', 'name'],
  ['company', 'businessPartner', 'Phone1', 'phone'],
  ['company', 'businessPartner', 'SalesPersonCode', 'propietario', { userField: true }],
  ['company', 'businessPartner', 'PriceListNum', 'lista_precios', { isActive: false }],
  ['contact', 'contactEmployee', 'Name', 'firstname'],
  ['contact', 'contactEmployee', 'E_Mail', 'email'],
  ['contact', 'contactEmployee', 'MobilePhone', 'mobilephone', { isActive: false }],
  ['address', 'bpAddress', 'Street', 'address'],
  ['address', 'bpAddress', 'City', 'city'],
  ['deal', 'orders-quotations', 'DocTotal', 'amount', { editable: false }],
  ['deal', 'orders-quotations', 'Comments', 'description'],
  ['deal', 'inventory-transfer-request', 'FromWarehouse', 'bodega_origen'],
  ['addressExtension', 'addressExtension', 'ShipToStreet', 'direccion_envio'],
  ['deal', 'purchase-quotations', 'CardCode', 'proveedor'],
  // Contexto que el front todavía no conoce: se muestra tal cual.
  ['invoice', 'creditNotes', 'DocNum', 'numero_nota'],
]

const GLOBEX = [
  ['product', 'product', 'ItemCode', 'item_code'],
  ['product', 'product', 'ItemName', 'name'],
  ['company', 'businessPartner', 'CardCode', 'codigo_cliente', { editable: false }],
  ['company', 'businessPartner', 'CardName', 'name'],
  ['contact', 'contactEmployee', 'E_Mail', 'email'],
]

function build(tenantKey, list) {
  return list.map(([objectType, sourceContext, sourceField, targetField, extra], index) =>
    row(tenantKey, index + 1, { objectType, sourceContext, sourceField, targetField, ...extra }),
  )
}

/** Initech no tiene mapeos (estado vacío). */
export const SEED_MAPPINGS = [...build('ACME', ACME), ...build('GLOBEX', GLOBEX)]
