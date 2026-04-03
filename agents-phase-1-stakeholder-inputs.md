# 1. DESCRIPCIÓN DEL PRODUCTO

El presente producto consiste en una aplicación web mobile-first orientada a usuarios que realizan entrenamiento físico en gimnasio.

El objetivo principal es asistir al usuario en la planificación y continuidad de su entrenamiento mediante el uso de inteligencia artificial, utilizando como base el historial de actividad registrado dentro de la aplicación.

A diferencia de aplicaciones tradicionales de tracking, este producto no se limita al registro de datos, sino que incorpora una capa de análisis que permite generar recomendaciones concretas y accionables para la siguiente sesión de entrenamiento. Estas recomendaciones buscan mejorar la adherencia, progresión y consistencia del usuario en relación con sus objetivos personales (por ejemplo: hipertrofia, fuerza o mantenimiento).

El sistema se apoya en tres pilares fundamentales:

* Registro estructurado del entrenamiento
* Visualización del progreso
* Generación de recomendaciones personalizadas mediante AI

El alcance inicial del producto será incremental bajo un enfoque de Producto Mínimo Viable (MVP), priorizando la funcionalidad crítica de generación de recomendaciones por sobre características accesorias.

---

# 2. OBJETIVO DEL PRODUCTO

Crear una aplicación que permita a usuarios de gimnasio:

* Registrar sus entrenamientos de forma simple
* Visualizar su evolución en el tiempo
* Recibir recomendaciones claras para su próximo entrenamiento

---

# 3. ALCANCE (MVP)

El MVP incluye únicamente:

1. Registro de usuarios y autenticación
2. Carga de entrenamientos
3. Generación de “ayuda memoria” (recomendación AI)
4. Visualización básica del historial

Todo lo demás queda fuera de alcance en esta etapa.

---

# 4. MODELO DE DATOS (OBLIGATORIO DEFINIR)

## Usuario

* id
* nombre
* edad
* peso
* altura
* objetivo (hipertrofia, fuerza, mantenimiento)
* experiencia (principiante/intermedio/avanzado)

## Entrenamiento

* id
* user_id
* fecha
* ejercicios[]:

  * nombre
  * series
  * repeticiones
  * peso

## AyudaMemoria (AI Output)

* id
* user_id
* fecha
* contenido
* basado_en_entrenamientos_ids[]

---

# 5. FUNCIONALIDADES

## 5.1 Dashboard (básico en MVP)

Mostrar:

* entrenamientos por semana
* volumen total (peso x reps x series)
* últimos entrenamientos

Evitar complejidad innecesaria en visualizaciones en esta etapa.

---

## 5.2 Entrenamiento (CORE FEATURE)

El usuario debe poder:

* Crear un entrenamiento
* Editarlo
* Consultar historial

Esta funcionalidad es crítica para la existencia del producto.

---

## 5.3 AI – AYUDA MEMORIA (CORE FEATURE)

### INPUT:

* Últimos N entrenamientos (ej: últimos 7)
* Objetivo del usuario
* Última ayuda memoria generada (si existe)

### OUTPUT:

Texto estructurado que incluya:

1. Resumen del progreso reciente
2. Recomendación concreta para el próximo entrenamiento
3. Ajustes sugeridos (peso, repeticiones, descanso, frecuencia)

### REGLAS:

* No inventar datos
* Basarse únicamente en historial real
* Generar recomendaciones accionables
* Evitar generalidades

---

## 5.4 Nutrición (FUERA DEL MVP)

* Solo notas manuales
* Sin procesamiento AI en esta etapa

---

## 5.5 Perfil

* Edición de datos del usuario
* Configuración de objetivos

---

# 6. REQUISITOS TÉCNICOS

## Stack obligatorio

* Next.js
* TypeScript
* TailwindCSS
* shadcn/ui
* Drizzle ORM
* Vercel Postgres
* Clerk (autenticación)

## Deploy

* Vercel

---

# 7. ARQUITECTURA AI

Definir una función única:

generateTrainingSuggestion(user, trainings, lastSuggestion) => string

Restricciones:

* La AI no accede directamente a la base de datos
* La AI no toma decisiones fuera de este contexto
* La AI transforma datos en recomendaciones útiles

---

# 8. ESTRATEGIA DE DESARROLLO

Orden obligatorio:

1. Autenticación
2. CRUD de entrenamientos
3. Persistencia de datos
4. Dashboard básico
5. Integración AI
6. Iteración sobre calidad de recomendaciones

No avanzar si la etapa anterior no está validada.

---

# 9. CRITERIOS DE ÉXITO (MVP)

El producto cumple su objetivo si:

* El usuario puede registrar entrenamientos sin fricción
* La AI genera recomendaciones coherentes
* El usuario puede aplicar esas recomendaciones en su siguiente sesión

---

# 10. RESTRICCIONES

* No sobre-diseñar la interfaz en el MVP
* No incorporar funcionalidades no solicitadas
* No optimizar prematuramente

---

# 11. REQUISITOS TÉCNICOS Y DE CALIDAD

## 11.1 Base del Proyecto

* El proyecto ya fue inicializado utilizando:
  pnpm create-next-app@latest <folder-name> --yes
* Se debe respetar la estructura base generada y extenderla de forma consistente.

---

## 11.2 Stack Tecnológico (OBLIGATORIO)

* Framework: Next.js (versión 16.2.2)
* Lenguaje: TypeScript
* Estilos: TailwindCSS
* Componentes UI: shadcn/ui
* ORM: Drizzle
* Base de datos: Vercel Postgres
* Autenticación: Clerk
* Iconografía: lucide-react
* Cache / rate limiting: Vercel Redis
* Deploy: Vercel

No sustituir tecnologías sin justificación explícita.

---

## 11.3 Estándares de Implementación

* Utilizar Server Components por defecto y Client Components solo cuando sea necesario.
* Separar claramente:

  * lógica de negocio
  * acceso a datos
  * componentes de UI
* Tipar explícitamente todos los modelos y respuestas (evitar `any`).
* Mantener consistencia en naming (camelCase para variables, PascalCase para componentes).
* Evitar lógica compleja en componentes de UI.

---

## 11.4 Performance y Escalabilidad (MVP-aware)

* No optimizar prematuramente, pero:

  * Evitar renders innecesarios
  * Minimizar llamadas redundantes a la base de datos
* Implementar caching básico con Vercel Redis en:

  * respuestas de AI
  * consultas frecuentes del dashboard

---

## 11.5 Seguridad

El sistema debe prevenir:

* Inyección de código (SQL/JS)
* Inputs maliciosos en formularios
* Uso abusivo de endpoints (rate limiting)

Requerimientos mínimos:

* Validación de inputs en servidor (no confiar en cliente)
* Sanitización de datos antes de persistir
* Uso de rate limiting en endpoints críticos (AI y escritura)

---

## 11.6 Uso Responsable de la AI

La aplicación debe controlar el uso de la AI para evitar:

* Generación excesiva de requests (costos)
* Inputs irrelevantes o maliciosos
* Uso fuera del dominio de entrenamiento físico

Medidas:

* Limitar frecuencia de generación de “ayuda memoria”
* Validar que existan datos de entrenamiento antes de invocar AI
* Restringir el contexto enviado al modelo únicamente a datos relevantes

---

## 11.7 Experiencia de Usuario (criterios objetivos)

* La interfaz debe ser:

  * Responsive (mobile-first obligatorio)
  * Navegable en ≤ 3 pasos para cargar un entrenamiento
  * Clara en jerarquía visual (no saturación de información)

Evitar definiciones subjetivas como “atractiva” sin criterio funcional.

---

## 11.8 Mantenibilidad

* Código modular y reutilizable
* Componentes pequeños y enfocados
* Evitar duplicación de lógica
* Estructura preparada para crecimiento incremental

---

## 11.9 Testing (mínimo requerido)

* Validar manualmente:

  * flujo de registro
  * carga de entrenamiento
  * generación de AI
* Testing automatizado es deseable pero no bloqueante para MVP

---
# 12. FINAL COMMENTS
* sponsor user should tell in requirements if a production postgress and redis db will be used in development or if a docker container so to env vars to be configured.
---
Inicia leyendo AGENTS.md y luego continua con el desarrollo de la aplicacion.