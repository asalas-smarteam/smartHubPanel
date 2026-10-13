import { CATEGORY_LABELS, STATUS_LABELS, TICKET_CATEGORIES, TICKET_STATUSES } from './constants'

export const STATUS_OPTIONS = TICKET_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}))
export const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}))
