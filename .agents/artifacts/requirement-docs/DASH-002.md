# REQUIREMENT DOC: DASH-002 (Phase 2 Mobile-First Dashboard)
**Status**: `[APPROVED]`

## 1. Description
Rediseñar completamente el dashboard con un enfoque mobile-first. Se requiere mejorar la UX con interacciones eficientes y mostrar la información clave para promover la carga de un entrenamiento. Además, la CLI `shadcn@latest init --preset b2D0wqNxT` será ejecutada para resetear el styling al nuevo template/tema.

## 2. Acceptance Criteria
- [ ] **Infra/Style**: Se debe ejecutar comando de migración de \`shadcn\` y limpiar configuraciones de Tailwind obsoletas. 
- [ ] **Header**: Implementar componente con menú, título central, y toggle de dark/light mode.
- [ ] **Acción Crítica (CTA)**: Botón "Registrar entrenamiento", priorizado (above the fold).
- [ ] **Estado del Día**: Chequear si hubo entrenamiento hoy. Si no hubo, incentivar carga. Mostrar 1 recomendación corta de la última generación de AI.
- [ ] **Calendario (20 días)**: Mostrar días clickeables. Modal al clickear mostrando ejercicios, botón de editar entrenamiento.
- [ ] **Resumen Semanal**: Tabla de grupos musculares (orden de mayor a menor frecuencia) para los últimos 7 días. Top insight de más/menos trabajado, y días entrenados (`X/7`).
- [ ] **Insights AI**: Un bloque específico, bien delimitado, con la última "ayuda memoria"\ generada para la lectura del usuario. (Reutilizar la llamada a la BD y no procesar nuevos tokens inútilmente).
- [ ] **Mobile-First**: La interfaz debe ser táctil y legible primariamente en teléfonos. (Scroll vertical).

## SECURITY_REVIEW (Security Engineer)
`[APPROVED]`
- No hay nuevos inputs expuestos que generen riesgo de SQL Injection. 
- Los modales deben utilizar validación estricta de las entidades pre-existentes de la DB.
- Datos limitados a lo que provee Clerk/usuario sin filtraciones entre inquilinos.

## ARCHITECTURE_REVIEW (Infrastructure)
`[APPROVED_WITH_NOTES]`
- El re-setup de `shadcn` no debe sobreescribir configs personalizadas de Clerk (en el globals.css si existieran). Re-integrar `globals.css` post generacion de preset cuidadosamente.
- Mantener validación y variables de Server Actions para interaccionar con Vercel Postgres/Redis.

