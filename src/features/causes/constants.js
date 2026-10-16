// Causas de error (contrato F5 y G3): las clasifica el backend; aquí solo nombre y color de
// cada grupo, compartidos por el Inicio y Eventos.

/** Grupos fijos de causas, con su nombre y color. */
export const CAUSE_GROUPS = {
  deal_data: { label: 'Datos del negocio', color: 'var(--cause-deal)' },
  fiscal_data: { label: 'Datos fiscales', color: 'var(--cause-fiscal)' },
  destination_validation: { label: 'Validación del destino', color: 'var(--cause-validation)' },
  master_blocked: { label: 'Maestro bloqueado', color: 'var(--cause-master)' },
  connectivity: { label: 'Conectividad', color: 'var(--cause-connectivity)' },
  other: { label: 'Otro', color: 'var(--cause-other)' },
}

/** Grupo desconocido (el backend agregó uno nuevo): se muestra como "Otro". */
export const causeGroup = (key) => CAUSE_GROUPS[key] ?? CAUSE_GROUPS.other
