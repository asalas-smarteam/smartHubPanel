import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Tarjeta con título; es una región con ese nombre (lectores de pantalla y tests). */
export function DetailSection({ title, children, action }) {
  return (
    <Card className="gap-3 py-4" role="region" aria-label={title}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  )
}
