# Sistema Supermarket con seguridad, IA y privacidad

Sistema académico de supermercado (ventas presenciales y virtuales) con foco en
**seguridad de bases de datos**: cifrado, enmascaramiento de datos, control de acceso
por roles, auditoría, MFA y privacidad. Proyecto de la materia *Seguridad en Base de
Datos* (UMSA), realizado en equipo de 3 personas.

## Funcionalidades
- **Ventas presenciales y virtuales**, inventario, clientes y devoluciones.
- **6 roles:** ADMIN, GERENTE_GENERAL, AUDITOR, CAJERO, ALMACENERO y SISTEMA_IA.
- **Panel de administración con 11 módulos** (Supermercado, Seguridad, Auditoría,
  IA, Operaciones, Reportes, Integración, Monitoreo, Privacidad, QA y Gobierno),
  visibles según el rol.
- **Enmascaramiento de datos:** CI, correo y teléfono se muestran enmascarados a los
  roles sin permiso (ej. `****7343`).
- **Cifrado** de datos personales con `pgcrypto` y contraseñas con bcrypt.
- **Seguridad en la base de datos:** RLS por sucursal, MFA, listas de IP, horarios de
  acceso, política de contraseñas y sesiones activas.
- **Auditoría** con verificación de integridad en cadena.
- **Backups, retención y anonimización de datos, monitoreo y alertas.**
- **IA:** alertas de stock bajo, detección de ventas anómalas, predicción de demanda y
  asistente conversacional con modelo local (Ollama).

## Tecnologías
| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL (PL/pgSQL, pgcrypto) |
| Backend | NestJS 11, TypeScript, node-postgres |
| Frontend | Next.js 16, React 19, TypeScript |
| IA local | Ollama (llama3.2:1b), opcional |

## Estructura
```
database/   Script SQL (esquema, funciones, vistas, RLS) y migración de pagos
backend/    API en NestJS
frontend/   Aplicación web en Next.js
```

## Mi participación y el equipo
- Divar: conexión de la base de datos con el backend y el frontend, mejoras en la
  base de datos, y desarrollo del backend y frontend [planificando la arquitectura y
  dirigiendo agentes de IA que implementaron el código].
- Daniel: diseño de la base de datos.
- Gabriel: documentacion de todo el sistema en general.

## Cómo ejecutarlo en local
Requisitos: PostgreSQL, Node.js y pgAdmin (opcional). Ollama es opcional.

1. En pgAdmin crea la base `supermarket_db`, conéctate y ejecuta
   `database/bd_supermarket_validado.sql`. Luego ejecuta
   `database/sql/migracion_pagos_supermarket.sql`.
2. Backend:
```bash
   cd backend
   cp .env.example .env     # completa DB_PASSWORD y DB_CRYPTO_KEY
   npm install
   npm run start:dev        # http://localhost:3000
```
3. Frontend (en otro puerto, porque el backend usa el 3000):
```bash
   cd frontend
   npm install
   npm run dev -- -p 3001   # http://localhost:3001
```

## Usuarios de demostración
Solo para entorno local y de prueba. La contraseña de todos es `Supermarket123*`:
`admin`, `gerente`, `auditor`, `cajero_centro`, `almacen_centro`.
El código MFA de demostración para admin, gerente y auditor es `123456`.
**No usar estas credenciales ni la clave de cifrado de demostración en producción.**

## Capturas
[Tienda pública] [Login] [Panel admin] [Datos enmascarados vs. completos]

## Limitaciones y mejoras pendientes
- La API aún no valida un token por solicitud: los roles se aplican en la base de
  datos (RLS y vistas) y en la interfaz. Próximo paso: autenticación con JWT y guards
  de roles en NestJS.
- Las claves de demostración deben moverse a un gestor de secretos.
- No hay despliegue en línea; el proyecto se ejecuta en local.
