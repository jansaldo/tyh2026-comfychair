# ComfyChair — Documento de Decisiones de Diseño

Este documento describe las decisiones de diseño tomadas durante el desarrollo de la Parte 1 del sistema ComfyChair, las ambigüedades resueltas del enunciado y sus respectivas justificaciones.

---

## 1. Ambigüedades del Enunciado Resueltas

### 1.1. Prioridades en el Algoritmo de Bidding ("Sin Bid" vs "No Interesado")

- **Ambigüedad:** La sección 2.4 indica que, por defecto, para cada artículo un revisor está _no interesado_. Sin embargo, la sección 2.5 establece el orden de prioridad de asignación como: `Interested -> Maybe -> sin bid -> NotInterested`. Si por defecto el estado es _no interesado_, no habría diferencia entre "sin bid" y "no interesado".
- **Resolución:** Para mantener la prioridad requerida por el algoritmo de asignación, se decidió que la **ausencia de un objeto `Bid`** en el sistema representa el estado "sin bid" (con prioridad 2, superior a `NotInterested`). El estado `NotInterested` (prioridad 3) solo se aplica si el revisor ingresó explícitamente ese interés durante la etapa de `Bidding`.
- **Consecuencia en API:** Cuando se consulta `Session.interestFor(paper, reviewer)` y no existe un `Bid` explícito, el sistema ahora falla con `Error("No bid found for paper and reviewer")` en lugar de colapsar con un `TypeError` o degradar implícitamente el caso a `NotInterested`.

### 1.2. Fórmula de Distribución de Carga de Revisores

- **Ambigüedad:** La sección 2.5 menciona que cada revisor debe hacer `⌈3A/R⌉` revisiones (techo de la división) y distribuir el resto. Si se usara estrictamente el techo (`ceil`) para todos los revisores, se generarían más revisiones que las necesarias.
- **Resolución:** Se interpretó la fórmula según el ejemplo numérico provisto en el enunciado:
  - La cuota base de revisiones para cada revisor se calcula con la división entera (piso): `cuotaBase = Math.floor((3 * A) / R)`.
  - El remanente o resto se obtiene con: `resto = (3 * A) % R`.
  - Los primeros `resto` revisores de la lista del comité de programa reciben una revisión adicional (`cuotaBase + 1`), mientras que los restantes hacen exactamente `cuotaBase` revisiones. Esto garantiza que la suma de todas las cuotas de revisores sea exactamente `3 * A`.

### 1.3. Porcentaje de Aceptación por Corte Fijo

- **Ambigüedad:** La sección 2.7 indica que se acepta un porcentaje máximo configurado en la sesión. No se aclara si, ante resultados no enteros, la cantidad debe redondearse hacia arriba o hacia abajo.
- **Resolución:** Dado que el enunciado especifica que el porcentaje es un **máximo**, la cantidad de artículos aceptados no debe superar esa proporción bajo ninguna circunstancia. Por lo tanto, se aplica un redondeo hacia abajo (`Math.floor`):
  $$\text{papersAceptados} = \lfloor \frac{\text{totalPapers} \times \text{porcentaje}}{100} \rfloor$$

### 1.4. Desempate en el Corte de Selección

- **Ambigüedad:** En la sección 2.7 no se especifica el criterio de desempate en caso de que dos o más artículos tengan el mismo score promedio en la frontera del corte.
- **Resolución:** Para garantizar un comportamiento determinista en el sistema, en caso de empate de score, se prioriza el **orden de envío original** de los artículos (orden en el que fueron agregados al arreglo `_papers` de la sesión).

### 1.5. Conflictos de Interés

- **Ambigüedad:** La sección 4.1 menciona que la exclusión por conflicto de interés (cuando un revisor es autor del artículo) es requerida, y añade que el soporte para registrar `Conflict` de manera explícita en el bidding es opcional pero valorable.
- **Resolución:** Se implementó el soporte completo para ambas variantes de conflicto de interés:
  - **Conflicto implícito por autoría:** Si el revisor es autor o coautor del artículo (`paper.hasAuthor(reviewer)`), queda completamente excluido de ser asignado.
  - **Conflicto explícito por bidding:** Si el revisor declara explícitamente un interés de tipo `Conflict` (`Interests.Conflict`) durante la etapa de bidding, se le trata igual que a un autor, impidiendo su asignación a dicho artículo.

---

## 2. Decisiones de Arquitectura y Diseño Orientado a Objetos

### 2.1. Descomposición del Algoritmo de Asignación (`ReviewerAssigner`)

- **Decisión:** Para evitar un método excesivamente largo y complejo en la clase `Session` (lo cual dificultaría su mantenimiento y testeo), se delegó la lógica de asignación a clases especializadas de responsabilidad única:
  - `ReviewerQuota`: Modela la cuota de revisiones de un revisor específico y lleva el control del cupo disponible (`remaining()`).
  - `ReviewAssignment`: Representa la asociación inmutable entre un `Paper` y un `User` (revisor).
  - `ReviewerAssigner`: Contiene el algoritmo de asignación que distribuye las cuotas y prioriza a los revisores de acuerdo a sus intereses.
- **Justificación:** Esto permite aislar y testear unitariamente el algoritmo de asignación de manera pura en `tests/ReviewerAssigner.test.js` sin requerir una instancia de `Session` con todas sus etapas funcionales.

### 2.2. Encapsulación de la Selección (`FixedAcceptanceSelector`)

- **Decisión:** De manera análoga a la asignación, la selección de artículos aceptados se delegó a la clase `FixedAcceptanceSelector`.
- **Justificación:** Separa la responsabilidad de ordenamiento y filtrado de la lógica de negocio de la sesión, facilitando el cambio de políticas de selección en el futuro (por ejemplo, si se quisieran agregar otras modalidades de selección aparte de corte fijo).

### 2.3. Invariantes en el Modelo de Dominio (`Paper` y `Review`)

- **Decisión:** La clase `Review` valida en su constructor que el score sea un número entero en el rango $[-3, +3]$. La clase `Paper` controla que no se superen las 3 revisiones máximas permitidas y que un revisor no pueda registrar más de una revisión para el mismo artículo. Ese máximo queda centralizado en `Paper.allowedReviews = 3`, y otras piezas del sistema lo reutilizan en lugar de repetir números mágicos.
- **Justificación:** Seguir el principio de que los objetos del dominio deben proteger sus propias invariantes en todo momento, evitando estados inválidos e inconsistencias.

### 2.4. Restricción de Estilo de Código (Sin Lambdas ni Funciones Anónimas)

- **Decisión:** En consonancia con las pautas del trabajo práctico y para apegarse a un estilo de orientación a objetos clásico, se evitó el uso de funciones anónimas y funciones flecha (`() => {}`) en todo el código de producción. En su lugar, se utilizaron bucles `for...of` tradicionales y métodos auxiliares con nombre explícito (por ejemplo, en `ReviewerAssigner.js` para ordenar los quotas por capacidad remanente).

### 2.5. Encapsulación del Flujo de Etapas en `Session`

- **Decisión:** La mutación genérica de la etapa de una sesión dejó de ser una API pública y pasó a un método privado `#setStage(stage)`. Hacia afuera solo permanecen disponibles las transiciones de dominio: `closeSubmissions()`, `closeBidding()` y `closeReviewing()`.
- **Justificación:** Una sesión es una máquina de estados secuencial. Exponer un mutador público permitía saltar etapas o forzar estados inválidos desde cualquier consumidor, debilitando las reglas del dominio.

### 2.6. Criterio de Cierre de `Reviewing`

- **Decisión:** El cierre de la etapa `Reviewing` se valida contra las asignaciones efectivas y no contra un conteo bruto de reviews por paper. Es decir, para cerrar la etapa, cada reviewer asignado a un artículo debe haber enviado su revisión.
- **Justificación:** El enunciado sigue exigiendo exactamente 3 revisores por artículo, pero chequear solo `reviewsCount() === 3` abría un falso positivo: tres reviews cargadas por usuarios no asignados permitían avanzar de etapa. La validación por asignación conserva la regla de 3 y además protege la integridad del workflow.
