# Documentación del Esquema de Base de Datos: `fawredd_gym`

Este esquema define la persistencia de datos para la plataforma de entrenamiento, gestionando perfiles de usuarios, el historial de sesiones de fuerza e hipertrofia, el subsistema de notificaciones Push para la PWA y los módulos de memoria y análisis para el motor de Inteligencia Artificial (AI Coach).

---

## 1. Tipos Personalizados (Enums)

### `objetivo`
Define la meta principal de entrenamiento declarada por el usuario.
* `hipertrofia`
* `fuerza`
* `mantenimiento`

### `experiencia`
Clasificación del nivel de entrenamiento del atleta.
* `principiante`
* `intermedio`
* `avanzado`

---

## 2. Diccionario de Tablas Centrales

### Tabla: `users`
Almacena la información de perfil, métricas físicas y configuración de accesos de los usuarios.

| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `text` | Primary Key | Identificador único del usuario en el sistema. |
| `external_auth_id` | `text` | Unique, Not Null | ID asignado por el proveedor de autenticación externo. |
| `nombre` | `text` | Nullable | Nombre completo del usuario. |
| `edad` | `integer` | Nullable | Edad en años. |
| `peso` | `integer` | Nullable | Peso actual del usuario. |
| `altura` | `integer` | Nullable | Altura actual del usuario. |
| `objetivo` | `enum (objetivo)` | Nullable | Meta actual de entrenamiento. |
| `experiencia` | `enum (experiencia)`| Nullable | Nivel de experiencia en el gimnasio. |
| `tipo_de_usuario` | `integer` | Not Null, Default: `2` | Rol del usuario dentro de la plataforma:<br>• `1`: Administrador<br>• `2`: Usuario común (Atleta)<br>• `3`: Coach |
| `created_at` | `timestamp` | Not Null, Default: Now | Fecha y hora de registro. |
| `updated_at` | `timestamp` | Not Null, Default: Now | Última actualización del perfil. |

### Tabla: `workouts`
Cabecera que registra una sesión de entrenamiento individual iniciada por un usuario.

| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `text` | Primary Key | ID único del entrenamiento. |
| `user_id` | `text` | Foreign Key -> `users.id` | Atleta que realizó la sesión. |
| `fecha` | `date` | Not Null (Mode: String) | Fecha calendario en la que se ejecutó el entrenamiento. |
| `created_at` | `timestamp` | Not Null, Default: Now | Fecha de creación del registro. |
| `updated_at` | `timestamp` | Not Null, Default: Now | Última edición del entrenamiento. |

### Tabla: `workout_exercises`
Representa las series, repeticiones y cargas de un ejercicio específico realizado dentro de un entrenamiento.

| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `text` | Primary Key | ID único de la ejecución del ejercicio. |
| `workout_id` | `text` | FK -> `workouts.id` (Cascade) | Sesión de entrenamiento asociada. Al borrar el workout se eliminan en cascada sus ejercicios. |
| `nombre` | `text` | Not Null | Nombre del ejercicio (ej. "Prensa de piernas"). |
| `series` | `integer` | Default: `1` | Cantidad de series/sets realizados. |
| `repeticiones` | `integer` | Default: `0` | Cantidad de repeticiones por serie. |
| `peso` | `integer` | Default: `0` | Carga utilizada en el ejercicio. |
| `duracion_segundos`| `integer` | Default: `0` | Tiempo de ejecución (útil para ejercicios isométricos o de cardio). |
| `grupo_muscular` | `text` | Default: `"Otros..."` | Agrupación muscular para análisis y balances (ej. "Pecho", "Piernas"). |
| `created_at` | `timestamp` | Not Null, Default: Now | Fecha de creación. |

---

## 3. Subsistema de Contexto y Logs de IA

> 💡 **Nota de Arquitectura:** Este set de tablas compone la memoria a largo plazo y la capa de análisis adaptativo del "AI Coach", permitiendo persistir estados complejos sin desbordar la ventana de contexto de los modelos de lenguaje (LLMs).

### Tabla: `ai_memories`
Hechos e información clave extraídos de las conversaciones con el usuario que la IA debe recordar a largo plazo.
* `id` (`text`, PK)
* `user_id` (`text`, FK -> `users.id`): Usuario al que pertenece el recuerdo.
* `fecha` (`timestamp`, Default: Now): Momento en el que se consolidó la memoria.
* `contenido` (`text`, Not Null): Información cruda en texto libre extraída por el agente de IA.

### Tabla: `ai_logs`
Historial técnico de interacciones con las APIs de IA para auditoría, debugging y optimización de prompts.
* `id` (`text`, PK)
* `user_id` (`text`, FK -> `users.id`, Nullable)
* `request_payload` (`text`): JSON estructurado o string enviado al LLM (prompts, variables de contexto).
* `response_payload` (`text`): JSON o texto devuelto por el LLM.
* `created_at` (`timestamp`, Default: Now)

### Tabla: `training_objectives`
Detalle extendido y cualitativo de las metas de entrenamiento redactadas por el usuario o sugeridas por el coach.
* `id` (`text`, PK)
* `user_id` (`text`, FK -> `users.id`, Not Null)
* `content` (`text`, Not Null): Descripción de los objetivos de entrenamiento.
* `updated_at` (`timestamp`, Default: Now)

### Tabla: `training_states`
**Estado del Perfil Evolutivo.** Representa la foto consolidada de la situación física y el plan táctico actual que la IA computa sobre el atleta basándose en su historial de ejercicios (`last_workout_id`).
* `id` (`text`, PK)
* `user_id` (`text`, FK -> `users.id`, Not Null)
* `last_workout_id` (`text`, FK -> `workouts.id`): Último entrenamiento procesado para generar este estado.
* `priority_goals` / `secondary_goals` (`text`): Objetivos principales y secundarios actuales.
* `progression_focus` (`text`): En qué métrica o variable se está buscando sobrecarga progresiva.
* `weak_areas` (`text`): Puntos débiles detectados (ej. falta de volumen en cadena posterior).
* `recovery_notes` (`text`): Fatiga reportada, molestias registradas o pautas de descanso.
* `weekly_strategy` (`text`): Planificación macro de la semana en curso.
* `recommendation_next` (`text`): Sugerencia inmediata para la siguiente sesión de entrenamiento.
* `evolution_analysis` (`text`): Resumen narrativo del progreso del usuario.
* `created_at` (`timestamp`, Default: Now)

---

## 4. Subsistema de Notificaciones de la PWA

### Tabla: `push_subscriptions`
Almacena los tokens y credenciales de Web Push cifradas. Un mismo usuario puede registrar múltiples dispositivos o navegadores (desktop, mobile).

* `id` (`text`, PK)
* `user_id` (`text`, FK -> `users.id`, Cascade): Si el usuario se elimina, se limpian sus suscripciones.
* `endpoint` (`text`, Not Null, **Unique Index**): URL única generada por el navegador para el envío del push stream.
* `p256dh` (`text`, Not Null): Clave pública elíptica (ECDH) para la encriptación de payloads.
* `auth` (`text`, Not Null): Secreto de autenticación HMAC.
* `created_at` (`timestamp`, Default: Now)