---

## Corrección — ComfyChair, Parte 1

### Nota: **7.5 / 10**

---

### Síntesis del análisis

El trabajo implementa los tres bloques obligatorios (secciones 4.1, 4.2 y 4.3) más el ítem opcional de conflicto de interés explícito. Los 50 tests pasan con 96.5 % de cobertura global, muy por encima del mínimo. El diseño orientado a objetos es cuidado y la documentación de decisiones es pertinente. Sin embargo, hay errores de proceso, un problema de diseño concreto y algunos descuidos de código que impiden una nota más alta.

---

### Puntos fuertes

**1. Correctitud funcional completa**
Los tres bloques consignados están implementados y verificados. El algoritmo de asignación (§4.1) respeta correctamente la distribución de cuotas con piso + resto, la cadena de prioridades de bids y la exclusión por coautoría. La selección por corte fijo (§4.3) aplica `Math.floor` coherentemente con la semántica de "porcentaje máximo". El ítem opcional de `Conflict` explícito también está resuelto.

**2. Diseño orientado a objetos con responsabilidades bien asignadas**
La extracción de `ReviewerAssigner`, `ReviewerQuota`, `ReviewAssignment` y `FixedAcceptanceSelector` evita que `Session` se convierta en una clase dios. Cada clase tiene un propósito único y es testeable de forma aislada — algo que se refleja en las suites `ReviewerAssigner.test.js` y `SessionSelection.test.js`.

**3. Cobertura y significatividad de los tests**
96.5 % de sentencias y 95.6 % de ramas. Las suites están organizadas por responsabilidad (una por etapa del flujo), hay tests de integración de punta a punta (`SessionWorkflow.test.js`) y el caso de borde del test de conflicto de interés está cubierto.

**4. Resolución rigurosa de ambigüedades en DECISIONES.md**
El documento identifica correctamente las cinco tensiones del enunciado: la distinción "sin bid" vs. `NotInterested`, la contradicción entre la notación `⌈3A/R⌉` y el ejemplo numérico, la semántica de `Math.floor` para el porcentaje de aceptación, el desempate determinista por orden de envío, y el doble mecanismo de conflicto de interés. Cada una está explicada con justificación.

**5. Convención de estilo respetada**
El código de producción no usa lambdas ni funciones anónimas fuera de las APIs de colecciones. Se usan bucles `for...of` y métodos auxiliares con nombre en todos los casos.

---

### Errores conceptuales y técnicos

**1. `setStage()` es público — rompe la máquina de estados (error de diseño)**
`Session` modela un flujo secuencial con invariantes por etapa (`assertStage`, guardas en `submit`, `enterBid`, etc.). Sin embargo, `setStage()` es un método público que permite saltar a cualquier etapa sin validación. Cualquier código externo puede escribir `session.setStage("Selection")` y eludir todas las transiciones. El método debería ser privado (o al menos con el prefijo `_setStage` como convención del proyecto) y usarse solo internamente.

**2. `interestFor()` tiene un NPE latente**
```js
interestFor(paper, reviewer) {
    return this.bidFor(paper, reviewer).interest(); // bidFor puede retornar undefined
}
```
Si no existe bid para ese par, `bidFor` retorna `undefined` y la llamada a `.interest()` lanza `TypeError`. El método está expuesto públicamente y no hay test que cubra este camino. Debería lanzar un error descriptivo o devolver un valor por defecto.

**3. `allReviewsSubmitted()` acopla la lógica a una constante mágica**
```js
if (paper.reviewsCount() !== 3) return false;
```
El número `3` está hardcodeado. Si en el futuro el algoritmo de asignación cambiara la cantidad de revisores por artículo, este método quedaría desincronizado silenciosamente. Sería más robusto verificar que cada artículo tenga al menos una revisión por cada revisor asignado según `this._assignments`.

---

### Problemas de entrega y proceso

**4. La documentación fue enviada al repositorio incorrecto**
El PR #4 con `DECISIONES.md` y `DOCUMENTACION_TECNICA.md` se abrió contra `juliangrigera/tyh2026-comfychair` (el repositorio original del que forkearon) en lugar del fork propio del grupo. A la fecha de entrega, estos entregables requeridos **no están en la rama `main` del repositorio a evaluar**. La documentación existe y es de buena calidad, pero el error de proceso es real.

**5. Evidencia de trabajo colaborativo débil**
Los commits de código en `main` tienen un único autor (jansaldo). El segundo integrante (CipollaLucas) aparece solo en el PR de documentación. El enunciado pide explícitamente que "el historial de commits refleje la contribución de cada integrante". Una distribución donde un integrante hace todo el código y otro solo la documentación no evidencia trabajo colaborativo sobre las consignas técnicas.

**6. `Playground.js` — artefacto de debug no eliminado**
El archivo contiene `jaiio = new Session()` (sin `const`/`let`) y `Symbol("test") == Symbol("test")` (siempre `false`, código muerto). Debería haberse eliminado o excluido antes de la entrega.

---

### Oportunidades de mejora

- El método `quotasByRemainingCapacity` en `ReviewerAssigner` reconstruye la lista ordenada en cada llamada (una vez por artículo × una vez por nivel de prioridad). Para volúmenes grandes esto es costoso. Un enfoque más eficiente sería ordenar los quotas una sola vez y actualizar la posición del revisor después de cada asignación.
- `Session.bidFor()` tiene duplicación de lógica con `ReviewerAssigner.bidFor()`. Ambas iteran bids buscando por `paper` y `reviewer`. Una abstracción compartida eliminaría ese duplicado.
- La clase `Paper` llama a `paper.isValid()` en `canSubmit`, pero `Paper` base no define `isValid()` — solo lo hacen las subclases. Agregar un `isValid() { return false; }` en la clase base haría explícita la intención abstracta.

---

### Cuadro resumen

| Criterio | Evaluación |
|---|---|
| Correctitud funcional (4.1, 4.2, 4.3 + bonus) | Excelente |
| Calidad del modelo de objetos | Buena (con el error de `setStage` público) |
| Cobertura y significatividad de tests | Excelente |
| Documento de decisiones | Bueno en contenido, no entregado en el repo correcto |
| Diagrama de clases | Presente y correcto (mismo problema de entrega) |
| Historia de commits / trabajo colaborativo | Débil |