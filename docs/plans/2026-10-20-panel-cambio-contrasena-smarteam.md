# Plan 4s: cambio de contraseña para Smarteam

Fecha: 2026-10-20. Estado: aprobado e implementado (2026-10-20).

Pedido de Deiver: que las cuentas de Smarteam puedan cambiar su propia contraseña. A los clientes
se les sigue restableciendo desde Usuarios (el backend no deja que una cuenta se restablezca a sí
misma). Sin cambios en el backend: `POST /auth/change-password` (C2) ya acepta la sesión normal.

- Botón "Contraseña" (icono de llave; solo icono en celular) en la barra superior, visible con
  `staff.users` (solo Smarteam). Lleva a `/cuenta/contrasena`, protegida con el mismo permiso.
- `src/features/auth/change-password-form.jsx`: el formulario sale de la página del cambio
  obligatorio y lo usan las dos páginas (`change-password-page.jsx` y la nueva
  `account-password-page.jsx`).
- Al guardar: aviso "Contraseña actualizada. Tus otras sesiones se cerraron.", la sesión actual
  sigue y el formulario queda vacío. Contraseña actual incorrecta → error en el campo.
- Tests: `account-password-page.test.jsx`; los del cambio obligatorio siguen igual.
