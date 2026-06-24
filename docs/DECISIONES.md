# ComfyChair - Documento de decisiones de diseno

Este documento resume las decisiones tomadas para la Parte 2 del proyecto ComfyChair.

## 1. Resoluciones del dominio

### 1.1. Flujo de sesiones con State
- `Session` mantiene la orquestacion del proceso, pero delega el comportamiento variable en objetos `SessionStage`.
- Las etapas concretas son `ReceivingStage`, `BiddingStage`, `ReviewingStage` y `SelectionStage`.
- Las operaciones invalidas para la etapa actual fallan con errores descriptivos y no modifican el estado.
- La transicion entre etapas es interna al contexto; no existe un mutador publico para forzar estados arbitrarios.

### 1.2. Actualizacion de papers durante recepcion
- Un paper enviado puede actualizarse mientras la sesion permanezca en `Receiving`.
- La actualizacion conserva la identidad del envio y su posicion dentro de la lista de papers.
- Si la nueva version no valida, la version anterior se conserva intacta.
- Desde `Bidding` en adelante, toda actualizacion es rechazada.

### 1.3. Politicas de aceptacion
- La seleccion de papers se delega en una estrategia intercambiable que implementa `select(papers)`.
- La politica porcentual del TP1 se conserva como `FixedAcceptanceSelector`.
- Se agregan dos politicas nuevas:
  - `AcceptanceByCount`, que acepta una cantidad maxima fija de papers.
  - `AcceptanceByScoreThreshold`, que acepta todos los papers con score promedio mayor o igual al umbral.
- La politica de aceptacion se configura por sesion y no afecta a otras sesiones.

### 1.4. Orden determinista
- Cuando dos papers tienen el mismo score, se respeta el orden de envio original.
- Esto aplica tanto al selector porcentual como a las politicas nuevas.

### 1.5. Cierre de reviewing
- `ReviewingStage` solo permite avanzar cuando cada reviewer asignado ya envio su review.
- Se valida contra las asignaciones efectivas y no contra un conteo bruto de reviews.
- Esto evita falsos positivos si un usuario no asignado intenta cargar revisiones.

## 2. Criterios de diseno

### 2.1. Responsabilidad unica
- `Session` coordina el flujo, pero no concentra la logica variable de etapas ni de seleccion.
- `ReviewerAssigner` sigue encapsulando la asignacion de revisores.
- `AcceptancePolicy` y sus implementaciones encapsulan la seleccion.

### 2.2. Compatibilidad con el TP1
- Se conserva el comportamiento observable del TP1 en asignacion, revisiones y seleccion porcentual.
- La evolucion a TP2 no rompe la API existente mas alla de las extensiones necesarias.

### 2.3. Estilo de implementacion
- Se mantiene el estilo orientado a objetos del proyecto.
- Se evita el uso de lambdas y funciones anonimas en el codigo de produccion.
