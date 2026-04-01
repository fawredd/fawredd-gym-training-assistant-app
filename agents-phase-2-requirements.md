# FASE 2 – REDISEÑO COMPLETO DEL DASHBOARD (MOBILE-FIRST)

## CONTEXTO

La aplicación ya cuenta con:
- Autenticación funcional (Clerk)
- CRUD de entrenamientos
- Persistencia en base de datos
- Generación básica de AI (ayuda memoria)
- Carga de datos de multiples formas.

El dashboard actual es funcional pero de baja calidad en términos de UX y no cumple con los objetivos del producto.

El objetivo de esta fase es rediseñar completamente el dashboard con foco en:
- Usabilidad real en mobile
- Claridad de estado del usuario
- Promover acción (no solo visualización)
- Integración útil de la AI

---

## OBJETIVO

Construir un nuevo dashboard que permita al usuario:
1. Entender su estado actual en segundos
2. Registrar rápidamente un entrenamiento
3. Visualizar su historial de forma intuitiva
4. Acceder a recomendaciones útiles de la AI
5. Editar entrenamientos existentes fácilmente

---

## ESTRUCTURA DEL DASHBOARD (OBLIGATORIA)

El dashboard debe renderizar los siguientes bloques en este orden:

---

### 1. HEADER

Debe incluir:
- Botón de menú (izquierda)
- Título de la app (centro)
- Toggle dark/light (derecha)

---

### 2. CTA PRINCIPAL (CRÍTICO)

Agregar un botón prominente:
- Texto: “Registrar entrenamiento”
- Debe estar visible sin scroll (above the fold)
- Debe redirigir al flujo de creación de entrenamiento

---

### 3. ESTADO DEL DÍA (CRÍTICO)

Mostrar un bloque que indique:

- Si el usuario entrenó hoy o no
- En caso negativo: mostrar mensaje de acción (ej: “No registraste entrenamiento hoy”)
- Mostrar una recomendación breve (1 línea) basada en la última ayuda memoria

Este bloque debe ser simple, claro y accionable.

---

### 4. CALENDARIO DE ENTRENAMIENTOS

Requerimientos:

- Mostrar últimos 20 días incluyendo hoy
- Resaltar:
  - Día actual
  - Días con entrenamientos registrados
- Cada día debe ser clickeable

#### Interacción:
Al hacer click en un día:
- Abrir modal
- Mostrar detalle del entrenamiento de ese día (si existe)

#### Modal debe permitir:
- Visualizar ejercicios
- EDITAR entrenamiento existente
- Botón opcional: “Usar como base” (pre-cargar nuevo entrenamiento)

---

### 5. RESUMEN SEMANAL (ÚLTIMOS 7 DÍAS)

Mostrar:

#### Tabla:
- Grupo muscular
- Cantidad de días trabajados

Ordenado de mayor a menor

#### Insights (OBLIGATORIO):
- Grupo más trabajado
- Grupo menos trabajado
- Frecuencia total de entrenamiento (ej: 3/7 días)

Evitar mostrar métricas irrelevantes o demasiado técnicas.

---

### 6. BLOQUE DE AI (AYUDA MEMORIA)

Mostrar:
- Última ayuda memoria generada
- Debe ser claramente legible (no colapsada)
- Separación visual del resto del contenido

No regenerar AI en este paso, solo consumir datos existentes.

---

## REQUERIMIENTOS DE UX/UI

- Mobile-first obligatorio
- Scroll vertical fluido
- Componentes táctiles con buen tamaño
- No saturar con información
- Priorizar claridad sobre estética

---

## REUTILIZACIÓN Y ARQUITECTURA

- Reutilizar componentes existentes cuando sea posible
- Separar componentes:
  - DashboardContainer
  - Calendar
  - TrainingModal
  - WeeklySummary
  - AIInsight

- No mezclar lógica de negocio en componentes UI

---

## DATOS

- Utilizar datos reales desde la base de datos
- No mockear información
- Optimizar queries para evitar múltiples llamadas innecesarias

---

## RESTRICCIONES

- No agregar nuevas features fuera de este alcance
- No modificar lógica de AI en esta fase
- No sobre-ingenierizar animaciones o gráficos

---

## CRITERIOS DE ÉXITO

El dashboard cumple su objetivo si:

- El usuario puede entender su estado en menos de 5 segundos
- Puede registrar un entrenamiento en 1 acción clara
- Puede revisar y editar entrenamientos pasados fácilmente
- La información mostrada es útil y no decorativa

---

## IMPORTANTE

voy a ejecutar este comando "pnpm dlx shadcn@latest init --preset b2D0wqNxT --template next" ya que quiero ese THEME, con lo cual elimina del codigo cualquier rastro de tailwindcss y shadcn/ui que no sea el que se genera con este comando.

No improvisar diseño.
Seguir exactamente esta estructura.

Si alguna decisión no está especificada:
→ elegir la opción más simple y funcional (no la más compleja)