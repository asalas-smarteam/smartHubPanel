import { AppBackground } from '@/components/brand/app-background'
import { Logo } from '@/components/brand/logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Marco de las pantallas de acceso: fondo con el degradado de la marca y tarjeta de vidrio. */
export function AuthShell({ title, description, children }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <AppBackground variant="hero" />
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <Logo tone="light" className="text-3xl" />
        <Card surface="strong" className="w-full">
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl">{title}</h1>
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}
