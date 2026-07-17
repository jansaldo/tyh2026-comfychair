# ComfyChair: evolución del diseño y oportunidades para el TP3

## 1. Propósito

Este documento reconstruye la evolución de ComfyChair desde el TP1 hasta el cierre del TP2 y la analiza con los conceptos trabajados en las clases 5 a 7 (patrones de diseño) y 9 a 11 (code smells, refactoring, deuda técnica y ADRs).

El objetivo no es producir una lista automática de defectos ni justificar cambios por el solo hecho de usar un patrón. Se busca preparar una base razonada para el TP3:

1. reconocer las fortalezas que conviene preservar;
2. distinguir bugs, smells, deuda y decisiones intencionales;
3. identificar oportunidades de refactoring con evidencia concreta;
4. priorizarlas según valor, riesgo y alcance;
5. proponer las decisiones que deberían documentarse mediante ADRs.

El análisis considera el código y los tests actuales, los enunciados de [TP1](../ENUNCIADO_TP1.md) y [TP2](../ENUNCIADO_TP2_ORIGINAL.md), el [documento de decisiones](DECISIONES.md), los planes conservados en `docs/dev-cycle/`, la devolución técnica del TP1 y el feedback docente posterior al TP2.

## 2. Criterio de lectura

Las clases 9 a 11 insisten en una distinción fundamental:

| Concepto | Aplicación en este análisis |
|---|---|
| Bug | El comportamiento incumple un requisito. Se corrige, pero no se presenta como refactoring. |
| Code smell | Una estructura sugiere investigar un posible problema. Puede ser un falso positivo. |
| Deuda técnica | Una decisión o construcción interna encarece una evolución futura relevante. |
| Refactoring | Cambio interno, realizado en pasos pequeños, que preserva el comportamiento observable. |
| Patrón | Solución con intención y trade-offs conocidos; no es una meta por sí misma. |
| ADR | Registro versionado del contexto, opciones, decisión y consecuencias. |

Por lo tanto, una clase larga no es automáticamente una God Class, una delegación no es automáticamente Feature Envy y una jerarquía no es automáticamente mejor que un condicional. La pregunta rectora es: **¿qué cambio futuro se vuelve más simple o más costoso por esta estructura?**

## 3. Reconstrucción de la evolución

### 3.1. Punto de partida: el TP1 como extensión funcional

El TP1 pedía completar un flujo ya iniciado en el código base:

- asignar tres revisores por paper respetando cupos, bids y conflictos;
- permitir que solo los revisores asignados cargaran reviews;
- seleccionar papers por porcentaje fijo;
- conservar el avance manual entre etapas.

La primera decisión fuerte fue evitar que toda esta lógica creciera dentro de `Session`. Se extrajeron objetos cohesivos:

- [`ReviewerAssigner`](../src/ReviewerAssigner.js), para el algoritmo de asignación;
- [`ReviewerQuota`](../src/ReviewerQuota.js), para capacidad y consumo de cupos;
- [`ReviewAssignment`](../src/ReviewAssignment.js), para la relación paper-reviewer;
- [`FixedAcceptanceSelector`](../src/FixedAcceptanceSelector.js), para la selección porcentual.

Esta distribución fue reconocida como fortaleza en la devolución del TP1: evitó una God Class, permitió tests unitarios por responsabilidad y dejó en `Session` la coordinación del caso de uso.

La secuencia de commits también muestra un desarrollo incremental: primero invariantes de `Paper` y `Review`, luego asignación, integración con la sesión, revisiones, selección y workflow completo. Es una aplicación reconocible del ciclo TDD: comportamiento cubierto, cambio pequeño y regresión completa.

### 3.2. La devolución del TP1 como disparador de refactoring

La devolución detectó tres problemas concretos:

1. `setStage()` era público y permitía romper la máquina de estados;
2. `interestFor()` producía un `TypeError` si no existía bid;
3. el cierre de reviewing dependía del número mágico `3`, en lugar de las asignaciones efectivas.

Las correcciones no introdujeron patrones nuevos de inmediato. Primero protegieron la transición, hicieron explícito el error de bid inexistente y movieron la condición de completitud hacia el modelo de asignaciones. Esta secuencia coincide con el enfoque de la clase 10: antes de llegar a un patrón se aplican transformaciones locales que aclaran responsabilidades y estabilizan el comportamiento.

Es especialmente importante que el número `3` no se eliminó del dominio: sigue siendo la regla de cantidad de revisores. Lo que se eliminó fue su uso duplicado como criterio indirecto para decidir si habían revisado las personas correctas.

### 3.3. TP2: nuevos ejes de variación

El TP2 cambió el objetivo. Ya no bastaba con agregar funcionalidad; el sistema debía soportar:

- operaciones diferentes según la etapa;
- errores para operaciones inválidas;
- nuevas etapas con impacto acotado;
- políticas de aceptación configurables por sesión;
- compatibilidad con el comportamiento del TP1.

El diseño identificó correctamente dos ejes distintos:

- **estado interno del workflow**, resuelto con State;
- **algoritmo intercambiable de selección**, resuelto con Strategy.

Esto reproduce la distinción de la clase 6: los estados cambian desde el propio flujo y suelen conocer sus transiciones; las estrategias son seleccionadas desde afuera y no necesitan conocerse entre sí.

### 3.4. Actualización atómica de papers

Antes de incorporar State se implementó la actualización de papers requerida desde el TP1. La solución preservó:

- la identidad del paper enviado;
- su posición en la sesión;
- las reviews existentes;
- el tipo concreto;
- la versión válida anterior ante un candidato inválido.

Para copiar datos comunes y específicos se introdujo en [`Paper.updateFrom()`](../src/Paper.js) una secuencia fija:

1. validar el candidato;
2. copiar título, autores y autor correspondiente;
3. invocar `copySpecificEditableDataFrom()`;
4. dejar que `RegularPaper` o `Poster` implementen ese paso específico.

Esta estructura tiene la forma de Template Method. Su evaluación detallada aparece en la sección 6.

### 3.5. Refactoring hacia State

Antes del refactoring, `Session` tenía strings de etapa, guardas y condicionales distribuidos en varias operaciones. El commit que introdujo State redujo `Session` de aproximadamente 200 a 140 líneas y movió las reglas a:

- [`ReceivingStage`](../src/stages/ReceivingStage.js);
- [`BiddingStage`](../src/stages/BiddingStage.js);
- [`ReviewingStage`](../src/stages/ReviewingStage.js);
- [`SelectionStage`](../src/stages/SelectionStage.js);
- [`SessionStage`](../src/stages/SessionStage.js), como protocolo y rechazo por defecto.

La transformación preservó la API pública: el cliente sigue enviando mensajes a `Session`, mientras el contexto delega al estado actual. La matriz de operaciones válidas e inválidas quedó cubierta desde la API pública en [`SessionStages.test.js`](../tests/SessionStages.test.js).

No fue una aplicación ornamental. Había evidencia previa:

- varias operaciones dependían de la misma variable de estado;
- el TP2 exigía agregar etapas con impacto mínimo;
- el enunciado pedía evitar lógica condicional centralizada;
- las transiciones eran parte relevante del dominio.

En términos de la clase 10, se trató de un **Replace State-Altering Conditionals with State** respaldado por tests de caracterización y regresión.

### 3.6. Refactoring hacia Strategy

La selección porcentual del TP1 pasó a implementar el contrato [`AcceptancePolicy`](../src/AcceptancePolicy.js). Luego se agregaron:

- [`AcceptanceByCount`](../src/AcceptanceByCount.js);
- [`AcceptanceByScoreThreshold`](../src/AcceptanceByScoreThreshold.js).

`Session` conserva una política configurable e independiente y `SelectionStage` delega la selección. También se preservó el orden determinista ante scores iguales.

Strategy está justificado por tres hechos del requisito: existen algoritmos reales, deben poder reemplazarse por sesión y se espera agregar variantes sin modificar el flujo. No se diseñó una jerarquía para una posibilidad hipotética; el segundo y tercer algoritmo ya estaban pedidos.

### 3.7. Feedback del TP2 e issue #10

La segunda entrega fue evaluada como completa. Los dos comentarios docentes fueron:

- agregar una validación funcional de cantidad de papers al cerrar etapas;
- revisar si el Template Method de `Paper.updateFrom()` justificaba su complejidad.

El issue #10 agregó una precondición de dominio: no cerrar submissions ni bidding sin papers y conservar la etapa si la validación falla. Este cambio no cuestiona State; por el contrario, la regla se ubica naturalmente en los estados que controlan esas transiciones.

El comentario sobre Template Method es diferente: no señala un bug, sino un posible costo de diseño. Es un caso ideal para el TP3 porque exige evaluar fuerzas, consecuencias y evidencia antes de refactorizar.

## 4. Fortalezas que conviene preservar

### 4.1. Modelo guiado por comportamiento

El proyecto no intentó representar todo el dominio de conferencias. Las clases agregadas responden a comportamientos pedidos: asignar, revisar, transicionar y seleccionar. Este criterio coincide con la clase 7: modelar primero los conceptos que participan en las operaciones reales.

### 4.2. Responsabilidades extraídas y testeables

`ReviewerAssigner`, `ReviewerQuota`, `ReviewAssignment`, las políticas y los estados tienen responsabilidades reconocibles. Las suites están organizadas alrededor de esas unidades y existe además un workflow de punta a punta.

El tamaño de `ReviewerAssigner` merece observación, pero no alcanza para declararlo God Class: sus métodos participan del mismo algoritmo, usan el mismo conjunto de colaboradores y no mezclan selección, revisión o transiciones.

### 4.3. Invariantes explícitas

El código protege reglas relevantes:

- score entero entre -3 y 3;
- una review por reviewer y paper;
- límite de reviews centralizado;
- exclusión de autores y bids con conflicto;
- exactamente tres asignaciones por paper;
- actualización por un autor del paper;
- candidato de igual tipo y válido;
- cierre de reviewing según asignaciones reales.

La atomicidad de las transiciones también fue considerada: `BiddingStage` calcula todas las asignaciones antes de reemplazarlas y avanzar. Si el algoritmo falla, la sesión permanece en Bidding.

### 4.4. State bien alineado con su intención

State localiza las operaciones de cada etapa, hace visibles las transiciones y elimina preguntas repetidas por el string de estado. Agregar una etapa concreta requeriría una clase y las transiciones correspondientes, sin agregar ramas a cada operación de `Session`.

El costo existe: más clases y conocimiento entre estados sucesores. Como se trabajó en clase 6, ese acoplamiento es una consecuencia típica de State, no evidencia suficiente de mal diseño.

### 4.5. Strategy bien alineado con su intención

Las políticas son intercambiables, no conocen otras políticas y comparten un protocolo pequeño. La configuración vive por sesión y el workflow no pregunta qué política recibió. Esta es una aplicación clara de composición para variar comportamiento.

### 4.6. Compatibilidad y comportamiento observable

El refactoring conservó los mensajes públicos del TP1, el valor textual de `stage()`, la selección porcentual y el orden de desempate. Los tests se concentran mayormente en resultados y errores observables, lo que permite mover responsabilidades internas sin perder la red de seguridad.

### 4.7. Historia de decisiones disponible

Aunque `DECISIONES.md` todavía no tiene formato ADR, el repositorio conserva planes, alternativas descartadas, matrices de operaciones, mensajes de error y una secuencia de commits pequeños. Esa evidencia reduce deuda cognitiva: permite reconstruir por qué se llegó al diseño actual sin inventar razones a posteriori.

### 4.8. Baseline de tests y cobertura

Al redactar este documento se ejecutó `npm test -- --runInBand --coverage` sobre `main`. El resultado fue:

- 17 suites aprobadas;
- 113 tests aprobados;
- 98 % de statements;
- 96,55 % de branches;
- 97,70 % de functions;
- 97,97 % de lines.

Esta baseline supera ampliamente el 80 % pedido y ofrece una red adecuada para refactorings incrementales. La cobertura no demuestra por sí sola que el diseño sea correcto, pero reduce el riesgo de cambiar estructuras ya ejercitadas. Los tests adicionales del issue #10 pertenecen al PR posterior y elevarán el conteo cuando se integre.

## 5. Falsos positivos que no conviene refactorizar a ciegas

### 5.1. `Session` como supuesto Middle Man

Muchas operaciones de `Session` solo delegan en `_stage`. Una herramienta podría marcar exceso de delegación. En este contexto, esa delegación es la frontera estable del patrón State: evita que los clientes conozcan los estados concretos y conserva la identidad de la sesión.

Eliminarla haría visible la estructura interna o devolvería los condicionales al contexto. No es una mejora.

### 5.2. `SessionStage` como supuesto Refused Bequest

Los estados concretos heredan operaciones que no implementan de manera positiva. Eso podría parecer una jerarquía cuyos hijos rechazan parte del contrato. Sin embargo, el comportamiento requerido para toda operación inválida es precisamente producir un error descriptivo. El rechazo por defecto centraliza una regla uniforme y evita duplicación.

Sí conviene revisar el protocolo si crece mucho o aparecen familias de etapas con contratos realmente distintos, pero hoy responde a la matriz explícita del TP2.

### 5.3. Conocimiento entre estados concretos

`ReceivingStage` conoce `BiddingStage`, este conoce `ReviewingStage` y así sucesivamente. Strategy buscaría independencia entre variantes; State normalmente hace explícitas las transiciones y por eso los estados pueden conocer sucesores. Solo sería deuda si el requisito evolucionara hacia workflows configurables o reutilizables.

### 5.4. `ReviewerAssigner` como supuesta God Class

Tiene más líneas que las demás clases y varios métodos auxiliares. Sin embargo, todos colaboran para una sola responsabilidad: construir una asignación válida y determinista. Extraer clases sin encontrar grupos cohesivos independientes aumentaría la navegación sin reducir acoplamiento.

Antes de dividirla debería aparecer al menos una de estas evidencias:

- razones de cambio distintas dentro de la clase;
- helpers reutilizados por otros algoritmos;
- dificultad concreta para testear una parte;
- cambios frecuentes que afecten subconjuntos independientes.

## 6. Evaluación del Template Method de `Paper.updateFrom()`

### 6.1. Qué resuelve correctamente

La implementación actual fija una secuencia segura:

```text
validar candidato
    -> copiar datos comunes
        -> copiar datos específicos del subtipo
```

Esto aporta:

- una única validación previa;
- preservación de identidad y reviews;
- actualización común consistente;
- un punto de extensión para cada subtipo;
- tests que fijan la atomicidad observable.

Por lo tanto, no es una implementación incorrecta ni un uso falso del nombre Template Method. Hay una receta en la superclase y un hook redefinido por subclases.

### 6.2. Por qué puede considerarse sobreingeniería leve

La mecánica **Form Template Method** vista en la clase 10 parte de métodos duplicados en distintas subclases:

1. se reconocen pasos equivalentes en el mismo orden;
2. se aplican Extract Method y Rename Method;
3. los esqueletos se vuelven iguales;
4. se hace Pull Up del algoritmo común.

En ComfyChair no existían dos algoritmos `updateFrom()` duplicados que exigieran esa convergencia. El template y el hook fueron diseñados directamente al agregar la funcionalidad. Además:

- `Paper` define un hook vacío;
- `RegularPaper` lo implementa con una asignación;
- `Poster` lo implementa con dos asignaciones;
- no existe otro paso variable ni otra familia de actualizaciones;
- una subclase nueva puede olvidar redefinir el hook y seguir funcionando con una actualización incompleta.

El beneficio real es pequeño frente al compromiso conceptual de introducir inversión de control por herencia. Esto encaja mejor con **Speculative Generality** o complejidad accidental que con Duplicate Code.

### 6.3. Alternativas

#### Alternativa A: conservar el Template Method

Es razonable si se espera que:

- aparezcan más tipos de paper;
- todos deban respetar necesariamente la misma secuencia;
- la actualización específica siga siendo un paso simple y no fallable;
- el equipo valore un único punto de control por encima de una jerarquía más explícita.

En ese caso debe documentarse como decisión deliberada y conviene agregar un test de contrato por cada subtipo nuevo.

#### Alternativa B: usar overrides ordinarios

`Paper.updateFrom()` puede conservar validación y copia común. `RegularPaper` y `Poster` pueden redefinir `updateFrom()`, llamar a `super.updateFrom(candidatePaper)` y copiar sus propios campos.

Ventajas:

- elimina el hook vacío y el nombre de patrón innecesario;
- hace explícito en cada subtipo cuál es su operación completa de actualización;
- usa una forma de herencia directa y conocida por el equipo.

Costos:

- la secuencia deja de estar controlada exclusivamente por la superclase;
- una subclase podría olvidar llamar a `super`;
- si en el futuro la copia específica pudiera fallar después de `super`, habría que preservar la atomicidad con validación previa o un snapshot.

#### Alternativa C: reemplazar el paper en `Session`

No se recomienda. Simplificaría la copia, pero rompería la identidad del envío y podría invalidar referencias desde bids, asignaciones o reviews. Contradice una decisión funcional ya cubierta por tests.

### 6.4. Veredicto

El Template Method actual es **correcto pero débilmente justificado**. El comentario docente no obliga a eliminarlo; obliga a explicitar su costo. La mejor lectura para el TP3 es tratarlo como una hipótesis de sobreingeniería, comparar A y B mediante un ADR y cambiarlo solo si el equipo considera que la claridad ganada supera la pérdida del flujo centralizado.

Si se necesita seleccionar un refactoring concreto para la entrega, la alternativa B es defendible y de bajo alcance, siempre que los tests existentes de identidad, datos específicos, tipo y atomicidad permanezcan verdes. No debería presentarse como corrección funcional, sino como simplificación de diseño.

## 7. Oportunidades de mejora

### 7.1. Encapsulamiento incompleto de `Session`

**Evidencia.** La corrección del TP1 eliminó `setStage()` público, pero State introdujo `_transitionTo(stage)`. El prefijo `_` expresa intención, no privacidad real en JavaScript. Un cliente puede invocarlo y forzar una etapa. Lo mismo ocurre con `_addPaper`, `_addBid`, `_replaceAssignments` y `_replaceAcceptedPapers`.

Además, `papers()`, `bids()`, `reviewers()` y `programCommittee()` devuelven las colecciones internas mutables. Un consumidor puede modificar el agregado sin pasar por sus reglas.

**Smells relacionados.** Encapsulation Leak, Inappropriate Intimacy entre contexto y estados y exposición de datos mutables. También hay una divergencia entre la decisión documentada (no existe mutador público de etapa) y lo que el runtime permite.

**Interés potencial.** Una integración futura podría saltar etapas, agregar papers inválidos o reemplazar resultados sin que los tests del dominio lo detecten en el punto de entrada correcto.

**Refactorings candidatos.**

- Encapsulate Variable / Encapsulate Collection;
- Change Function Declaration para reducir el protocolo interno;
- hacer que las operaciones de cierre devuelvan su próximo estado y que `Session` realice la transición mediante un campo privado `#stage`;
- devolver copias o vistas de solo lectura desde las consultas de colecciones;
- reemplazar accesos a colecciones completas por consultas de mayor nivel donde resulte razonable.

**Prioridad.** Alta. Recupera una invariante señalada desde el TP1 y alinea código con documentación. Requiere tests de caracterización porque toca la colaboración central de State.

### 7.2. Código muerto en `Playground.js`

**Evidencia.** [`Playground.js`](../src/Playground.js) crea una variable global implícita y compara dos `Symbol` que siempre son diferentes. Ya había sido señalado en la devolución del TP1 y no forma parte del producto ni de la demo actual.

**Smell.** Dead Code y artefacto de debug.

**Refactoring.** Remove Dead Code.

**Prioridad.** Alta por costo y riesgo casi nulos. Es una buena primera transformación, aunque por sí sola resulta demasiado trivial para demostrar el alcance completo del TP3.

### 7.3. Duplicación en la búsqueda de bids

**Evidencia.** `Session.bidFor()` y `ReviewerAssigner.bidFor()` recorren una colección para encontrar el mismo par `(paper, reviewer)`. `ReviewAssignment` ya encapsula una operación `matches`, mientras `Bid` no la ofrece.

**Smell.** Duplicate Code y posible Shotgun Surgery si cambia la identidad de un bid o su criterio de coincidencia.

**Opciones.**

1. agregar `Bid.matches(paper, reviewer)` y usarlo en ambos recorridos;
2. extraer un objeto colección/registro de bids con `find`, `exists` y actualización;
3. mantener la duplicación si no aparece un tercer consumidor.

La opción 1 centraliza el criterio con poco costo, pero no elimina los dos recorridos. La opción 2 elimina más duplicación, aunque puede ser otra forma de sobreingeniería para solo dos usos.

**Refactorings candidatos.** Extract Method seguido de Move Method; eventualmente Extract Class si la responsabilidad crece.

**Prioridad.** Media-baja. Conviene medir el cambio esperado antes de crear una abstracción adicional.

### 7.4. Protocolo desigual de la política porcentual

**Evidencia.** Las políticas nuevas implementan `select(papers)`. `FixedAcceptanceSelector.select(papers, percentage)` conserva además un segundo parámetro opcional por compatibilidad con el TP1, aunque `Session` ya configura la estrategia como objeto.

**Smell/deuda.** API divergente y compatibilidad acumulada. No viola el uso actual porque JavaScript permite el parámetro extra, pero deja dos formas de configurar el mismo algoritmo.

**Interés potencial.** Nuevos consumidores pueden no saber si el porcentaje pertenece al estado de la estrategia o a cada invocación. También dificulta expresar un contrato uniforme.

**Refactoring candidato.** Change Function Declaration para dejar solo `select(papers)`, después de identificar y migrar todos los clientes del protocolo legado.

**Prioridad.** Baja mientras la compatibilidad con TP1 siga siendo un driver explícito. Es un buen ejemplo de deuda deliberada y prudente que puede documentarse sin pagar todavía.

### 7.5. Uso de códigos numéricos para prioridad de bids

**Evidencia.** `ReviewerAssigner` recorre prioridades de `0` a `3` y `priorityForInterest()` devuelve esos números. El significado de cada valor depende de leer varios métodos.

**Smells posibles.** Magic Number y Primitive Obsession.

**Opciones.**

- reemplazar los números por constantes con nombre;
- hacer que cada interés encapsule su prioridad;
- modelar el orden como una colección explícita de intereses.

Convertir cada `Symbol` en una jerarquía polimórfica sería desproporcionado si lo único que cambia es un número estable. Las constantes con nombre son un primer paso más económico.

**Refactoring candidato.** Replace Magic Literal, no Replace Conditional with Polymorphism como primera opción.

**Prioridad.** Media-baja. Mejora legibilidad con poco riesgo, pero ofrece menos valor estructural que el encapsulamiento de `Session`.

### 7.6. Dependencia directa de `User` con hashing de contraseñas

**Evidencia.** `User` requiere `crypto`, elige SHA-256 y almacena directamente el resultado. Mezcla identidad de dominio con una decisión de seguridad/infraestructura. Además, un hash general sin salt ni función específica para contraseñas no es una estrategia adecuada para un sistema real.

**Clasificación.** Es una deuda de diseño y seguridad heredada del código base, no el foco funcional de los TP1/TP2. Si existiera un requisito real de autenticación, podría convertirse también en una deficiencia de seguridad.

**Refactorings candidatos.** Extract Class/Strategy para un `PasswordHasher` inyectable y Move Method fuera de la entidad.

**Prioridad.** Baja para el TP3 salvo que la consigna formal incluya seguridad o infraestructura. Intervenir sin requisitos podría ampliar indebidamente el alcance.

### 7.7. Documentación de decisiones sin formato ADR

**Evidencia.** `DECISIONES.md` resume resultados, pero normalmente no registra estado, drivers, opciones descartadas ni consecuencias negativas. Los planes sí contienen parte de esa información, aunque queda dispersa.

**Deuda.** Documentation Debt y deuda cognitiva: un lector ve qué se hizo, pero debe reconstruir por qué y bajo qué trade-offs.

**Remediación.** Crear ADRs breves, enlazar decisiones reemplazadas y conservar `DECISIONES.md` como índice o resumen.

**Prioridad.** Obligatoria para el TP3 porque forma parte explícita de la consigna.

## 8. Hallazgos funcionales que deben separarse de los smells

Durante un TP de refactoring es importante no presentar correcciones funcionales como si preservaran comportamiento. Algunos puntos merecen tests o issues independientes:

- `RegularPaper.isValid()` limita palabras, pero no hace explícita la obligatoriedad de un abstract no vacío;
- `BiddingStage.enterBid()` no comprueba que el paper pertenezca a la sesión ni que el reviewer integre el comité;
- `Bid` acepta cualquier valor como interés;
- las colecciones mutables permiten introducir estados inválidos desde afuera.

Antes de cambiar estos comportamientos debe contrastarse el enunciado, acordar la semántica y escribir tests. Si el comportamiento observable cambia, se trata de un fix o una evolución funcional acompañada por refactoring, no de refactoring puro.

## 9. Priorización propuesta para el TP3

La prioridad combina evidencia, interés esperado, cobertura existente, costo y capacidad de demostrar refactorings conocidos.

| Orden | Ítem | Evidencia | Valor | Riesgo | Recomendación |
|---:|---|---|---|---|---|
| 1 | Encapsulamiento de `Session` | Alta | Alto | Medio | Seleccionar como refactoring principal y documentar con ADR. |
| 2 | Decisión sobre Template Method | Media/alta por feedback docente | Medio | Bajo | Comparar alternativas en ADR; simplificar si el equipo confirma sobreingeniería. |
| 3 | `Playground.js` | Confirmada | Bajo | Muy bajo | Remove Dead Code como quick win. |
| 4 | Prioridades numéricas | Media | Bajo/medio | Bajo | Reemplazar por nombres antes de considerar polimorfismo. |
| 5 | Búsqueda duplicada de bids | Media | Medio si el protocolo evoluciona | Medio | Refactorizar solo con una abstracción proporcionada. |
| 6 | API porcentual dual | Confirmada, pero deliberada | Bajo hoy | Medio por compatibilidad | Registrar como deuda aceptada; posponer. |
| 7 | Hashing en `User` | Alta fuera del alcance | Alto en producción | Alto | Crear issue separado; no mezclar sin requisito. |

Esta tabla no obliga a ejecutar todos los cambios. Para una entrega breve resulta más defendible resolver dos o tres ítems bien caracterizados que hacer una limpieza transversal difícil de justificar.

## 10. Secuencia de refactoring recomendada

### Fase 0: baseline y caracterización

1. ejecutar suite y cobertura;
2. registrar cantidad de tests, cobertura y estado inicial;
3. escribir tests desde la API pública para las invariantes que se tocarán;
4. evitar tests nuevos que dependan de campos o mutadores con `_`;
5. hacer un commit por transformación coherente.

### Fase 1: Remove Dead Code

Eliminar `Playground.js`, ejecutar la suite y registrar que no cambia comportamiento del producto. Este paso reduce ruido antes de cambios más profundos.

### Fase 2: decidir y, si corresponde, simplificar `updateFrom()`

1. conservar en verde los tests de `Paper`, `RegularPaper`, `Poster` y `SessionPaperUpdate`;
2. redactar primero el ADR con alternativas A, B y C;
3. si se elige B, reemplazar hooks por overrides en un cambio pequeño;
4. verificar identidad, reviews, tipo, datos específicos y rechazo atómico;
5. no modificar simultáneamente la semántica de actualización.

### Fase 3: cerrar la frontera de `Session`

1. caracterizar transiciones exitosas y fallidas solo por API pública;
2. caracterizar que las consultas no permiten mutar el agregado;
3. hacer privado el estado real;
4. cambiar la colaboración para que los estados propongan/devuelvan transiciones y `Session` las confirme;
5. encapsular colecciones de forma incremental;
6. ejecutar las suites focalizadas después de cada transformación;
7. cerrar con workflow, suite completa y cobertura.

Este refactoring es una ráfaga planificada, no floss refactoring: afecta la frontera entre el contexto y cuatro estados y merece un objetivo y un criterio de finalización explícitos.

### Fase 4: mejoras locales opcionales

Reemplazar prioridades mágicas por nombres y evaluar `Bid.matches()`. Detenerse si la solución requiere más clases que el problema o si no reduce un costo de cambio concreto.

## 11. ADRs propuestos

Se recomienda crear `docs/adr/` y usar numeración estable. Los ADRs históricos pueden escribirse a partir de evidencia del repositorio, dejando claro que documentan decisiones ya tomadas.

### ADR-0001: Modelar el workflow de sesiones con State

- **Estado:** Accepted.
- **Contexto:** condicionales por etapa, operaciones inválidas y requisito de extensibilidad.
- **Opciones:** State; tabla/dispatcher en `Session`; subclases de `Session`.
- **Decisión:** State con contexto estable y rechazos por defecto.
- **Consecuencias positivas:** localización, extensibilidad, API estable.
- **Consecuencias negativas:** más clases, estados acoplados a sucesores, protocolo interno con `Session`.

### ADR-0002: Configurar la aceptación mediante Strategy

- **Estado:** Accepted.
- **Contexto:** tres algoritmos y configuración independiente por sesión.
- **Opciones:** condicional en `Session`; funciones; jerarquía Strategy.
- **Decisión:** objetos `AcceptancePolicy`.
- **Consecuencias:** extensibilidad y testeo aislado; más objetos y una compatibilidad temporal en la política porcentual.

### ADR-0003: Preservar identidad al actualizar papers

- **Estado:** Accepted.
- **Contexto:** bids, asignaciones y reviews pueden referenciar el paper enviado.
- **Opciones:** reemplazar instancia; mutar sin candidato; validar candidato y copiar.
- **Decisión:** validar otra instancia y copiar datos editables sin reemplazar identidad.
- **Consecuencias:** atomicidad observable y referencias estables; necesidad de copiar datos por subtipo.

### ADR-0004: Conservar o retirar Template Method en `Paper.updateFrom()`

- **Estado inicial:** Proposed.
- **Contexto:** feedback docente y variación específica mínima.
- **Opciones:** conservar template; overrides con `super`; reemplazar instancia.
- **Drivers:** simplicidad, atomicidad, extensibilidad real, comprensión del equipo.
- **Decisión:** debe surgir del TP3; si se retira, el ADR explica por qué el patrón era correcto pero desproporcionado.

### ADR-0005: Encapsular transiciones y colecciones de `Session`

- **Estado inicial:** Proposed.
- **Contexto:** pseudo-privacidad y colecciones mutables.
- **Opciones:** conservar convención `_`; campos privados y transiciones devueltas por states; objeto interno de datos.
- **Drivers:** invariantes, compatibilidad, complejidad del protocolo State y testabilidad.
- **Consecuencias esperadas:** frontera de agregado más segura a cambio de modificar la colaboración interna.

### ADR-0006: Mantener temporalmente la API porcentual compatible

- **Estado:** Accepted o Deprecated, según decisión.
- **Contexto:** compatibilidad con TP1 frente a contrato uniforme de Strategy.
- **Decisión posible:** conservar el segundo parámetro hasta migrar consumidores.
- **Consecuencia:** deuda deliberada y trazable, con criterio claro para retirarla.

## 12. Criterios de aceptación para el TP3

Una entrega convincente debería permitir responder afirmativamente:

- ¿Cada smell está respaldado por evidencia y no solo por una métrica?
- ¿Se distinguen falsos positivos propios de State y Strategy?
- ¿Cada refactoring tiene objetivo, precondiciones y pasos pequeños?
- ¿Los tests demuestran preservación de comportamiento?
- ¿Los fixes funcionales están separados de los refactorings?
- ¿Los ADRs registran opciones y consecuencias negativas, no solo la solución elegida?
- ¿La historia de commits deja ver la secuencia del razonamiento?
- ¿El equipo puede explicar el código resultante sin depender del agente que lo generó?

## 13. Trazabilidad con los contenidos de las clases

| Clase | Conceptos aplicados al análisis |
|---|---|
| 5 — Patrones de Diseño I | Template Method como algoritmo invariante con hooks; inversión de control; aumento de complejidad como consecuencia del patrón; necesidad de evaluar trade-offs. |
| 6 — Patrones de Diseño II | Diferencia semántica entre Strategy y State; polimorfismo en lugar de condicionales; costo de más clases; advertencia contra diseñar para cambios hipotéticos. |
| 7 — Patrones de Diseño III y TP2 | Diseño guiado por comportamiento; extensibilidad asimétrica; patrones como hipótesis y no como obligación; requisitos concretos de extensibilidad de etapas y políticas. |
| 9 — Code Smells | Smell como síntoma y no sentencia; falsos positivos; God Class, Feature Envy, Duplicate Code, Shotgun Surgery y smells arquitecturales; priorización por impacto. |
| 10 — Refactoring | Preservación del comportamiento; tests entre pasos; Extract/Move/Remove Dead Code/Encapsulate Collection; Refactoring to Patterns; mecánica de Form Template Method y criterio económico. |
| 11 — Deuda Técnica | Deuda como obligación contingente; principal e interés; deuda deliberada; divergencia entre diseño documentado e implementación; ADRs y deuda cognitiva. |

Esta trazabilidad también sugiere cómo presentar el trabajo: no como una auditoría genérica, sino como una historia de evolución en la que cada smell se interpreta dentro de las decisiones y requisitos que lo produjeron.

## 14. Conclusión

ComfyChair llega al TP3 con una base sólida: responsabilidades separadas, invariantes importantes, tests significativos y dos patrones bien alineados con requisitos reales. State y Strategy no deben desarmarse por alertas estructurales superficiales; representan refactorings hacia patrones respaldados por ejes de variación concretos.

El Template Method de `Paper.updateFrom()` ocupa una zona más ambigua. Protege una secuencia útil, pero la variación actual es tan pequeña que su costo conceptual puede superar su beneficio. Esa tensión es una buena oportunidad pedagógica: el TP3 no debería demostrar que un patrón estaba "mal", sino que el diseño se vuelve a evaluar cuando cambia la evidencia.

La oportunidad de mayor valor está en la frontera de `Session`: la pseudo-privacidad y las colecciones mutables debilitan invariantes que el resto del modelo intenta proteger. Combinada con la eliminación de código muerto, una decisión explícita sobre Template Method y ADRs breves, ofrece un alcance de TP3 coherente, verificable y directamente conectado con los contenidos de las clases 9 a 11.
