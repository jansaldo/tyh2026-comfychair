# Plan de implementación de ComfyChair — TP2

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir primero la actualización de envíos omitida en el TP1 y luego evolucionar ComfyChair para modelar el flujo de la sesión con estados extensibles y políticas configurables de aceptación, preservando el comportamiento observable existente y una cobertura mínima del 80%.

**Architecture:** El primer PR incorporará la actualización atómica sobre el flujo actual para cerrar el issue #3 sin mezclarlo con el rediseño del TP2. El segundo PR convertirá `Session` en contexto State (`ReceivingStage`, `BiddingStage`, `ReviewingStage`, `SelectionStage`) y migrará allí la restricción temporal de actualización. El tercero resolverá la selección con objetos Strategy que compartirán un ordenamiento estable por score y orden de envío. Las actualizaciones usarán un paper candidato separado: se valida por completo y, sólo si es válido, sus datos editables se copian sobre el envío original para conservar identidad y posición.

**Tech Stack:** Node.js 18+, CommonJS, JavaScript orientado a objetos, Jest 29.

---

## 1. Estado base comprobado

- Rama relevada: `main`, commit `0a53d90`.
- Suite base: `12` suites y `54` tests en verde.
- Cobertura base: `96.25%` statements, `94.84%` branches, `94.04%` functions y `96.16%` lines.
- Flujo existente: `Receiving -> Bidding -> Reviewing -> Selection` mediante un string y condicionales dentro de `Session`.
- Selección existente: `FixedAcceptanceSelector`, con porcentaje entero de `0` a `100`, `Math.floor` y desempate por orden de envío.
- Cambios locales ajenos que deben preservarse: `package-lock.json` no trackeado.

## 2. Alcance y restricciones

### Incluido

- Refactor del flujo a patrón State sin condicional central por etapa.
- Errores descriptivos para toda operación no habilitada.
- Transiciones atómicas: una falla no cambia etapa, asignaciones ni datos del dominio.
- Actualización de papers durante Recepción por cualquiera de sus autores.
- Políticas `AcceptanceByCount` y `AcceptanceByScoreThreshold`.
- Compatibilidad de la política porcentual del TP1.
- Configuración independiente de políticas por sesión.
- Tests unitarios, tests de integración del agregado y regresiones del TP1.

### Excluido

- Reloj, scheduler o cierre automático por fecha.
- Nuevas etapas posteriores a Selección.
- Cambios en `README.md`, `demo.js`, `docs/DECISIONES.md`, `docs/DOCUMENTACION_TECNICA.md`, diagramas o cualquier otra documentación **durante los PRs 1 a 3**. Estos entregables siguen dentro del alcance total del TP2, pero quedan delegados al PR 4.
- Refactors de `ReviewerAssigner`, `Bid`, `Review`, `Conference` o `User` que no sean necesarios para el TP2.
- Incorporación de `package-lock.json` a los commits salvo decisión explícita del equipo.

## 3. Secuencia de PRs y responsables

Los PRs se implementarán y mergearán en este orden. Cada casillero se marca con `- [x]` dentro del mismo PR que completa el trabajo; no se marca por anticipado.

- [x] **PR 1 — `fix`: permitir actualizar envíos hasta el cierre de Recepción (`#3`).** A cargo nuestro. Rama: `fix/issue-3-update-paper-before-deadline`. Incluye el protocolo atómico de actualización, autorización por autor, pertenencia a la sesión, conservación de identidad y orden, rechazo después del cierre y sus tests. Se clasifica como `fix` porque el TP1 ya exigía que “Los envíos pueden modificarse hasta el cierre de la etapa” y la implementación no lo contempló.
- [x] **PR 2 — `refactor`: modelar el flujo de la sesión con State.** A cargo nuestro. Rama: `refactor/session-state-workflow`. Parte del PR 1 ya mergeado, elimina el despacho condicional por etapa, migra la regla de actualización a `ReceivingStage`, preserva las APIs del TP1 y prueba operaciones inválidas y transiciones atómicas.
- [ ] **PR 3 — `feat`: incorporar políticas configurables de aceptación.** A cargo nuestro. Rama: `feat/configurable-acceptance-policies`. Parte del PR 2 ya mergeado, conserva la política porcentual e incorpora `AcceptanceByCount`, `AcceptanceByScoreThreshold` y configuración independiente por sesión mediante Strategy.
- [ ] **PR 4 — `docs`: completar entregables y cierre del TP2.**. Rama sugerida: `docs/tp2-deliverables`. Debe actualizar el diagrama de clases y los documentos de decisiones/diseño para reflejar State y Strategy, revisar la documentación técnica y ejecutar la verificación final de entregables y cobertura.

Orden de ejecución de las tareas detalladas de este documento:

1. PR 1: Tasks PR1.1, PR1.2 y PR1.3.
2. PR 2: Tasks PR2.1 y PR2.2.
3. PR 3: Tasks PR3.1, PR3.2 y PR3.3.
4. Verificación técnica de los PRs 1 a 3: Task Cierre.1.
5. PR 4: Task PR4.1.

## 4. Decisiones de diseño

### 4.1. Alternativas evaluadas

1. **State + Strategy — elegida.** Cada etapa recibe las operaciones válidas y hereda rechazos descriptivos para el resto. Cada política implementa `select(papers)`. Es la alternativa que mejor satisface extensibilidad, responsabilidad única y ausencia de condicionales en `Session`.
2. **Tabla de transiciones y handlers dentro de `Session`.** Reduce archivos, pero conserva un despachador central y hace que cada operación nueva obligue a editar la tabla y el agregado.
3. **Subclases de `Session` por etapa.** Evita condicionales, pero complica conservar la identidad de la sesión al transicionar y duplica el estado común del agregado.

### 4.2. Contrato público resultante

Se preservan estas APIs públicas del flujo del TP1, además de las consultas existentes de papers, bids y asignaciones:

```js
session.canSubmit(paper);
session.submit(paper);
session.closeSubmissions();
session.enterBid(paper, reviewer, interest);
session.closeBidding();
session.submitReview(paper, reviewer, text, score);
session.closeReviewing();
session.setAcceptancePercentage(percentage);
session.selectAcceptedPapers();
session.acceptedPapers();
session.stage();
```

Se agrega:

```js
session.updatePaper(submittedPaper, requestingAuthor, candidatePaper);
session.setAcceptancePolicy(policy);
session.acceptancePolicy();
```

`stage()` seguirá devolviendo exactamente `"Receiving"`, `"Bidding"`, `"Reviewing"` o `"Selection"`; el cambio a objetos State no se filtrará a consumidores existentes.

### 4.3. Semántica de actualización

- `submittedPaper` se identifica por referencia dentro de `session.papers()`.
- `requestingAuthor` debe pertenecer a la lista de autores de la versión actualmente enviada.
- `candidatePaper` debe ser otra instancia de la misma clase concreta que `submittedPaper`.
- El candidato puede cambiar título, autores, autor corresponsal y datos específicos (`abstract`, `attachmentUrl`, `sourcesUrl`).
- El candidato debe satisfacer `isValid()` y las invariantes de construcción.
- Sólo después de validar se copian los datos. `_reviews` no se reemplaza.
- La referencia del paper dentro de `_papers` y su índice no cambian.
- Rechazar una actualización con el mismo objeto evita que un consumidor mutile la versión válida antes de pedir validación transaccional.

### 4.4. Operaciones por estado

| Operación | Receiving | Bidding | Reviewing | Selection |
|---|---:|---:|---:|---:|
| `submit` | Sí | Error | Error | Error |
| `updatePaper` | Sí | Error | Error | Error |
| `closeSubmissions` | Sí | Error | Error | Error |
| `enterBid` | Error | Sí | Error | Error |
| `closeBidding` | Error | Sí | Error | Error |
| `submitReview` | Error | Error | Sí | Error |
| `closeReviewing` | Error | Error | Sí | Error |
| `selectAcceptedPapers` | Error | Error | Error | Sí |
| `acceptedPapers` | Error | Error | Error | Sí |

`setAcceptancePolicy` y `setAcceptancePercentage` son configuración, no selección; se permiten en cualquier etapa y limpian el resultado aceptado previamente para no dejar datos obsoletos.

### 4.5. Errores observables

Los tests deben fijar estos mensajes:

```text
Cannot submit papers during <Stage> stage
Cannot update papers during <Stage> stage
Cannot close submissions during <Stage> stage
Cannot enter bids during <Stage> stage
Cannot close bidding during <Stage> stage
Cannot submit reviews during <Stage> stage
Cannot close reviewing during <Stage> stage
Cannot select accepted papers during <Stage> stage
Cannot query accepted papers during <Stage> stage
Paper was not submitted to this session
Only an author can update this paper
Updated paper must be a different object
Updated paper must keep its type
Cannot update paper with invalid data
Acceptance policy must implement select(papers)
Maximum accepted paper count must be a non-negative integer
Score threshold must be a finite number
```

## 5. Mapa de archivos

### Crear

- `src/stages/SessionStage.js`: comportamiento inválido común y nombre de etapa.
- `src/stages/ReceivingStage.js`: envío, actualización y cierre de recepción.
- `src/stages/BiddingStage.js`: alta/actualización de bids, asignación y transición atómica.
- `src/stages/ReviewingStage.js`: revisión, completitud y cierre.
- `src/stages/SelectionStage.js`: aplicación de la política y consulta de aceptados.
- `src/AcceptancePolicy.js`: ordenamiento estable compartido.
- `src/AcceptanceByCount.js`: corte por cantidad máxima.
- `src/AcceptanceByScoreThreshold.js`: filtro inclusivo por score mínimo.
- `tests/FixedAcceptanceSelector.test.js`: regresión unitaria de porcentaje.
- `tests/AcceptanceByCount.test.js`: casos nominales, bordes y empates.
- `tests/AcceptanceByScoreThreshold.test.js`: mayor, igual y menor al umbral.
- `tests/SessionStages.test.js`: matriz de operaciones inválidas y no mutación.
- `tests/SessionPaperUpdate.test.js`: autorización, pertenencia, atomicidad, tipos y deadline.

### Modificar

- `src/Session.js`: incorporar primero la actualización del issue #3; luego convertirlo en contexto State y configurar Strategy por instancia.
- `src/Paper.js`: protocolo de copia validada de datos editables comunes.
- `src/RegularPaper.js`: copia del abstract.
- `src/Poster.js`: copia de URLs específicas.
- `src/FixedAcceptanceSelector.js`: convertir el selector porcentual en Strategy sin romper su llamada histórica.
- `tests/SessionAssignment.test.js`: reforzar atomicidad de `closeBidding`.
- `tests/SessionReviewing.test.js`: ajustar error de etapa y reforzar cierre fallido.
- `tests/SessionSelection.test.js`: integrar políticas, aislamiento y error de etapa.

### Verificar sin modificar salvo regresión real

- `tests/SessionWorkflow.test.js`: conservar el flujo porcentual completo como regresión.
- `tests/Demo.test.js`: comprobar que la compatibilidad del TP1 mantiene operativa la demo existente.

## 6. Estrategia TDD y secuencia de implementación

### Task PR1.1: Congelar la baseline y proteger el workspace

**Files:**
- Test: todos los archivos bajo `tests/`
- Preserve: `ENUNCIADO_TP1.md`, `ENUNCIADO_TP2.md`, `package-lock.json`

- [x] **Step 1: Registrar el estado antes de modificar producción**

Run:

```bash
git status --short
npm test -- --runInBand --coverage
```

Expected:

```text
Test Suites: 12 passed, 12 total
Tests:       54 passed, 54 total
All files statements >= 96%
All files branches >= 94%
```

- [x] **Step 2: Confirmar que el trabajo se hará en una rama del TP2**

Run:

```bash
git branch --show-current
```

Expected para el PR 1: `fix/issue-3-update-paper-before-deadline`. Si todavía es `main`, crear esa rama antes de implementar sin alterar los cambios locales del usuario. Para los PRs siguientes, crear la rama indicada en la sección 3 desde el PR anterior ya integrado.

No commit en esta tarea.

### Task PR1.2: Hacer atómica la actualización de datos editables de `Paper`

**Files:**
- Modify: `src/Paper.js`
- Modify: `src/RegularPaper.js`
- Modify: `src/Poster.js`
- Modify: `tests/Paper.test.js`
- Modify: `tests/RegularPaper.test.js`
- Modify: `tests/Poster.test.js`

- [x] **Step 1: Escribir tests fallidos para datos comunes, identidad lógica y validación previa**

Agregar a `tests/Paper.test.js`:

```js
it("should copy editable common data from a valid candidate", function shouldCopyCommonData() {
    const newAuthor = new User();
    const candidate = new Paper("Updated title", [matias, newAuthor], matias);

    paper.updateFrom(candidate);

    expect(paper.title()).toBe("Updated title");
    expect(paper.authors()).toEqual([matias, newAuthor]);
    expect(paper.correspondingAuthor()).toBe(matias);
});

it("should preserve reviews when editable data changes", function shouldPreserveReviews() {
    paper.addReview(julian, "Existing review", 2);
    const candidate = new Paper("Updated title", [juan, matias], juan);

    paper.updateFrom(candidate);

    expect(paper.reviews()).toHaveLength(1);
    expect(paper.score()).toBe(2);
});

it("should reject an invalid candidate without changing valid data", function shouldRejectInvalidCandidateAtomically() {
    const previousAuthors = paper.authors().slice();
    const candidate = new Paper("", [julian], julian);

    function updateWithInvalidCandidate() {
        paper.updateFrom(candidate);
    }

    expect(updateWithInvalidCandidate).toThrow("Cannot update paper with invalid data");
    expect(paper.title()).toBe("A Systematic Literature Review");
    expect(paper.authors()).toEqual(previousAuthors);
    expect(paper.correspondingAuthor()).toBe(juan);
});

it("should reject using itself as update candidate", function shouldRejectSameObjectCandidate() {
    function updateFromItself() {
        paper.updateFrom(paper);
    }

    expect(updateFromItself).toThrow("Updated paper must be a different object");
});
```

Agregar a `tests/RegularPaper.test.js`:

```js
it("should copy an updated abstract from a valid regular paper", function shouldCopyUpdatedAbstract() {
    const candidate = new RegularPaper(
        "Updated regular paper",
        [juan, julian],
        julian,
        "Updated abstract"
    );

    paper01.updateFrom(candidate);

    expect(paper01.title()).toBe("Updated regular paper");
    expect(paper01.abstract()).toBe("Updated abstract");
});

it("should reject an overlong abstract without partial changes", function shouldRejectOverlongAbstractAtomically() {
    const originalTitle = paper01.title();
    const originalAbstract = paper01.abstract();
    const candidate = new RegularPaper(
        "Invalid replacement title",
        [juan, julian],
        juan,
        new Array(302).join("word ")
    );

    function updateWithOverlongAbstract() {
        paper01.updateFrom(candidate);
    }

    expect(updateWithOverlongAbstract).toThrow("Cannot update paper with invalid data");
    expect(paper01.title()).toBe(originalTitle);
    expect(paper01.abstract()).toBe(originalAbstract);
});
```

Agregar a `tests/Poster.test.js`:

```js
it("should copy poster-specific URLs from a valid poster", function shouldCopyPosterUrls() {
    const candidate = new Poster(
        "Updated poster",
        [julian, juan],
        julian,
        "https://example.com/updated.pdf",
        "https://example.com/updated.zip"
    );

    poster01.updateFrom(candidate);

    expect(poster01.attachmentUrl()).toBe("https://example.com/updated.pdf");
    expect(poster01.sourcesUrl()).toBe("https://example.com/updated.zip");
});

it("should reject changing the concrete paper type", function shouldRejectTypeChange() {
    const regularCandidate = new RegularPaper(
        "Regular replacement",
        [juan],
        juan,
        "Valid abstract"
    );

    function updatePosterAsRegularPaper() {
        poster01.updateFrom(regularCandidate);
    }

    expect(updatePosterAsRegularPaper).toThrow("Updated paper must keep its type");
});
```

Agregar `const RegularPaper = require("../src/RegularPaper");` a `tests/Poster.test.js`.

- [x] **Step 2: Ejecutar los tests y comprobar RED**

Run:

```bash
npm test -- --runInBand tests/Paper.test.js tests/RegularPaper.test.js tests/Poster.test.js
```

Expected: FAIL porque `updateFrom` y `copySpecificEditableDataFrom` todavía no existen.

- [x] **Step 3: Implementar el protocolo de actualización validada**

Agregar dentro de `Paper` en `src/Paper.js`:

```js
updateFrom(candidatePaper){
    this.assertValidUpdateCandidate(candidatePaper);
    this._title = candidatePaper.title();
    this._authors = candidatePaper.authors().slice();
    this._correspondingAuthor = candidatePaper.correspondingAuthor();
    this.copySpecificEditableDataFrom(candidatePaper);
}
assertValidUpdateCandidate(candidatePaper){
    if (candidatePaper === this) {
        throw new Error("Updated paper must be a different object");
    }

    if (candidatePaper.constructor !== this.constructor) {
        throw new Error("Updated paper must keep its type");
    }

    if (!candidatePaper.isValid()) {
        throw new Error("Cannot update paper with invalid data");
    }
}
copySpecificEditableDataFrom(candidatePaper){
}
```

Agregar dentro de `RegularPaper` en `src/RegularPaper.js`:

```js
copySpecificEditableDataFrom(candidatePaper){
    this._abstract = candidatePaper.abstract();
}
```

Agregar dentro de `Poster` en `src/Poster.js`:

```js
copySpecificEditableDataFrom(candidatePaper){
    this._attachmentUrl = candidatePaper.attachmentUrl();
    this._sourcesUrl = candidatePaper.sourcesUrl();
}
```

- [x] **Step 4: Verificar GREEN y regresión**

Run:

```bash
npm test -- --runInBand tests/Paper.test.js tests/RegularPaper.test.js tests/Poster.test.js
npm test -- --runInBand
```

Expected: todas las suites en verde.

- [x] **Step 5: Commit**

```bash
git add src/Paper.js src/RegularPaper.js src/Poster.js tests/Paper.test.js tests/RegularPaper.test.js tests/Poster.test.js
git commit -m "fix: support atomic paper data updates"
```

### Task PR3.1: Extraer el contrato común de políticas y preservar el porcentaje del TP1

**Files:**
- Create: `src/AcceptancePolicy.js`
- Modify: `src/FixedAcceptanceSelector.js`
- Create: `tests/FixedAcceptanceSelector.test.js`

- [ ] **Step 1: Escribir la regresión unitaria de la política porcentual**

Crear `tests/FixedAcceptanceSelector.test.js`:

```js
const FixedAcceptanceSelector = require("../src/FixedAcceptanceSelector");
const Paper = require("../src/Paper");
const User = require("../src/User");

let author;
let reviewer;

function buildFixture() {
    author = new User("author", "UNLP", "author@unlp.edu", "123");
    reviewer = new User("reviewer", "UNLP", "reviewer@unlp.edu", "123");
}

function paperWithScore(title, score) {
    const paper = new Paper(title, [author], author);
    paper.addReview(reviewer, "Review", score);
    return paper;
}

beforeEach(buildFixture);

describe("FixedAcceptanceSelector", function fixedAcceptanceSelectorSuite() {
    it("should keep supporting the historical percentage argument", function shouldKeepHistoricalApi() {
        const papers = [paperWithScore("first", 1), paperWithScore("second", 3)];
        const selector = new FixedAcceptanceSelector();

        expect(selector.select(papers, 50)).toEqual([papers[1]]);
    });

    it("should use its configured percentage as a strategy", function shouldUseConfiguredPercentage() {
        const papers = [paperWithScore("first", 1), paperWithScore("second", 3)];
        const selector = new FixedAcceptanceSelector(50);

        expect(selector.select(papers)).toEqual([papers[1]]);
    });

    it("should preserve submission order for tied scores", function shouldPreserveSubmissionOrder() {
        const papers = [paperWithScore("first", 2), paperWithScore("second", 2)];
        const selector = new FixedAcceptanceSelector(50);

        expect(selector.select(papers)).toEqual([papers[0]]);
    });

    it("should reject invalid configured percentages", function shouldRejectInvalidPercentage() {
        function createInvalidPolicy() {
            new FixedAcceptanceSelector(101);
        }

        expect(createInvalidPolicy).toThrow("Acceptance percentage must be between 0 and 100");
    });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla la configuración por constructor**

Run:

```bash
npm test -- --runInBand tests/FixedAcceptanceSelector.test.js
```

Expected: FAIL en el caso que invoca `select(papers)` sobre un selector configurado.

- [ ] **Step 3: Crear `AcceptancePolicy` con ordenamiento estable reutilizable**

Crear `src/AcceptancePolicy.js`:

```js
class AcceptancePolicy{
    select(papers){
        throw new Error("Acceptance policy must implement select(papers)");
    }
    orderByScoreAndSubmissionOrder(papers){
        const orderedPapers = [];

        for (const paper of papers) {
            this.insertPaperByScore(orderedPapers, paper);
        }

        return orderedPapers;
    }
    insertPaperByScore(orderedPapers, paper){
        let inserted = false;

        for (let index = 0; index < orderedPapers.length; index += 1) {
            if (paper.score() > orderedPapers[index].score()) {
                orderedPapers.splice(index, 0, paper);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            orderedPapers.push(paper);
        }
    }
}

module.exports = AcceptancePolicy;
```

- [ ] **Step 4: Convertir `FixedAcceptanceSelector` en Strategy compatible**

Reemplazar `src/FixedAcceptanceSelector.js` por:

```js
const AcceptancePolicy = require("./AcceptancePolicy");

class FixedAcceptanceSelector extends AcceptancePolicy{
    constructor(percentage){
        super();
        const configuredPercentage = typeof(percentage) === "undefined" ? 0 : percentage;
        this.assertValidPercentage(configuredPercentage);
        this._percentage = configuredPercentage;
    }
    select(papers, percentage){
        const selectedPercentage = typeof(percentage) === "undefined"
            ? this._percentage
            : percentage;
        this.assertValidPercentage(selectedPercentage);
        const orderedPapers = this.orderByScoreAndSubmissionOrder(papers);
        const acceptedCount = Math.floor((orderedPapers.length * selectedPercentage) / 100);

        return orderedPapers.slice(0, acceptedCount);
    }
    assertValidPercentage(percentage){
        if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
            throw new Error("Acceptance percentage must be between 0 and 100");
        }
    }
}

module.exports = FixedAcceptanceSelector;
```

- [ ] **Step 5: Verificar y commitear**

Run:

```bash
npm test -- --runInBand tests/FixedAcceptanceSelector.test.js tests/SessionSelection.test.js
npm test -- --runInBand
```

Expected: todo verde y mismos resultados porcentuales del TP1.

```bash
git add src/AcceptancePolicy.js src/FixedAcceptanceSelector.js tests/FixedAcceptanceSelector.test.js
git commit -m "refactor: expose percentage selection as a policy"
```

### Task PR3.2: Implementar las dos políticas nuevas de aceptación

**Files:**
- Create: `src/AcceptanceByCount.js`
- Create: `src/AcceptanceByScoreThreshold.js`
- Create: `tests/AcceptanceByCount.test.js`
- Create: `tests/AcceptanceByScoreThreshold.test.js`

- [ ] **Step 1: Escribir los tests fallidos de `AcceptanceByCount`**

Crear `tests/AcceptanceByCount.test.js` usando el helper `paperWithScore` de la tarea anterior y estos casos:

```js
it("should accept the highest scoring papers up to the maximum", function shouldApplyMaximumCount() {
    const papers = [paperWithScore("one", 1), paperWithScore("two", 3), paperWithScore("three", 2)];
    const policy = new AcceptanceByCount(2);

    expect(policy.select(papers)).toEqual([papers[1], papers[2]]);
});

it("should accept none when maximum is zero", function shouldAcceptNone() {
    const papers = [paperWithScore("one", 1)];

    expect(new AcceptanceByCount(0).select(papers)).toEqual([]);
});

it("should accept all when maximum exceeds paper count", function shouldAcceptAll() {
    const papers = [paperWithScore("one", 1), paperWithScore("two", 2)];

    expect(new AcceptanceByCount(10).select(papers)).toEqual([papers[1], papers[0]]);
});

it("should preserve submission order at a tied cutoff", function shouldPreserveTiedSubmissionOrder() {
    const papers = [paperWithScore("one", 2), paperWithScore("two", 2)];

    expect(new AcceptanceByCount(1).select(papers)).toEqual([papers[0]]);
});

it("should reject a negative or fractional maximum", function shouldRejectInvalidMaximum() {
    function createNegativePolicy() {
        new AcceptanceByCount(-1);
    }
    function createFractionalPolicy() {
        new AcceptanceByCount(1.5);
    }

    expect(createNegativePolicy).toThrow("Maximum accepted paper count must be a non-negative integer");
    expect(createFractionalPolicy).toThrow("Maximum accepted paper count must be a non-negative integer");
});
```

El archivo debe importar `AcceptanceByCount`, `Paper` y `User`, inicializar `author` y `reviewer` en `beforeEach`, y definir `paperWithScore(title, score)` exactamente como en `tests/FixedAcceptanceSelector.test.js`.

- [ ] **Step 2: Escribir los tests fallidos de `AcceptanceByScoreThreshold`**

Crear `tests/AcceptanceByScoreThreshold.test.js` con el mismo fixture y:

```js
it("should accept scores above and equal to the threshold", function shouldApplyInclusiveThreshold() {
    const papers = [paperWithScore("below", 0), paperWithScore("equal", 1), paperWithScore("above", 3)];
    const policy = new AcceptanceByScoreThreshold(1);

    expect(policy.select(papers)).toEqual([papers[2], papers[1]]);
});

it("should not impose a result count limit", function shouldNotLimitCount() {
    const papers = [paperWithScore("one", 2), paperWithScore("two", 3), paperWithScore("three", 1)];

    expect(new AcceptanceByScoreThreshold(1).select(papers)).toHaveLength(3);
});

it("should preserve submission order between tied accepted papers", function shouldPreserveTiedSubmissionOrder() {
    const papers = [paperWithScore("one", 2), paperWithScore("two", 2)];

    expect(new AcceptanceByScoreThreshold(2).select(papers)).toEqual(papers);
});

it("should reject a non finite threshold", function shouldRejectInvalidThreshold() {
    function createInvalidPolicy() {
        new AcceptanceByScoreThreshold(Number.POSITIVE_INFINITY);
    }

    expect(createInvalidPolicy).toThrow("Score threshold must be a finite number");
});
```

- [ ] **Step 3: Ejecutar y comprobar RED**

Run:

```bash
npm test -- --runInBand tests/AcceptanceByCount.test.js tests/AcceptanceByScoreThreshold.test.js
```

Expected: FAIL porque ambos módulos faltan.

- [ ] **Step 4: Implementar `AcceptanceByCount`**

Crear `src/AcceptanceByCount.js`:

```js
const AcceptancePolicy = require("./AcceptancePolicy");

class AcceptanceByCount extends AcceptancePolicy{
    constructor(maximumCount){
        super();

        if (!Number.isInteger(maximumCount) || maximumCount < 0) {
            throw new Error("Maximum accepted paper count must be a non-negative integer");
        }

        this._maximumCount = maximumCount;
    }
    select(papers){
        return this.orderByScoreAndSubmissionOrder(papers).slice(0, this._maximumCount);
    }
}

module.exports = AcceptanceByCount;
```

- [ ] **Step 5: Implementar `AcceptanceByScoreThreshold`**

Crear `src/AcceptanceByScoreThreshold.js`:

```js
const AcceptancePolicy = require("./AcceptancePolicy");

class AcceptanceByScoreThreshold extends AcceptancePolicy{
    constructor(minimumScore){
        super();

        if (!Number.isFinite(minimumScore)) {
            throw new Error("Score threshold must be a finite number");
        }

        this._minimumScore = minimumScore;
    }
    select(papers){
        const orderedPapers = this.orderByScoreAndSubmissionOrder(papers);
        const acceptedPapers = [];

        for (const paper of orderedPapers) {
            if (paper.score() >= this._minimumScore) {
                acceptedPapers.push(paper);
            }
        }

        return acceptedPapers;
    }
}

module.exports = AcceptanceByScoreThreshold;
```

- [ ] **Step 6: Verificar y commitear**

Run:

```bash
npm test -- --runInBand tests/AcceptanceByCount.test.js tests/AcceptanceByScoreThreshold.test.js tests/FixedAcceptanceSelector.test.js
```

Expected: las tres políticas en verde.

```bash
git add src/AcceptanceByCount.js src/AcceptanceByScoreThreshold.js tests/AcceptanceByCount.test.js tests/AcceptanceByScoreThreshold.test.js
git commit -m "feat: add count and score acceptance policies"
```

### Task PR3.3: Configurar una política independiente por `Session`

**Files:**
- Modify: `src/Session.js`
- Modify: `src/stages/SelectionStage.js`
- Modify: `tests/SessionSelection.test.js`

- [ ] **Step 1: Agregar tests de configuración, aislamiento y regresión**

Agregar imports a `tests/SessionSelection.test.js`:

```js
const AcceptanceByCount = require("../src/AcceptanceByCount");
const AcceptanceByScoreThreshold = require("../src/AcceptanceByScoreThreshold");
```

Agregar casos:

```js
it("should delegate selection to its configured policy", function shouldUseConfiguredPolicy() {
    const threePapers = buildPapers(3);
    moveSessionToSelection(session, threePapers, [1, 3, 2]);
    session.setAcceptancePolicy(new AcceptanceByCount(2));

    expect(session.selectAcceptedPapers()).toEqual([threePapers[1], threePapers[2]]);
});

it("should isolate policies and results between sessions", function shouldIsolateSessionPolicies() {
    const countSession = new Session();
    const thresholdSession = new Session();
    const countPapers = buildPapers(3);
    const thresholdPapers = buildPapers(3);
    moveSessionToSelection(countSession, countPapers, [1, 2, 3]);
    moveSessionToSelection(thresholdSession, thresholdPapers, [1, 2, 3]);
    countSession.setAcceptancePolicy(new AcceptanceByCount(1));
    thresholdSession.setAcceptancePolicy(new AcceptanceByScoreThreshold(2));

    expect(countSession.selectAcceptedPapers()).toEqual([countPapers[2]]);
    expect(thresholdSession.selectAcceptedPapers()).toEqual([thresholdPapers[2], thresholdPapers[1]]);
    expect(countSession.acceptancePolicy()).not.toBe(thresholdSession.acceptancePolicy());
});

it("should reject an object without a selection contract", function shouldRejectInvalidPolicy() {
    function configureInvalidPolicy() {
        session.setAcceptancePolicy({});
    }

    expect(configureInvalidPolicy).toThrow("Acceptance policy must implement select(papers)");
});

it("should keep percentage configuration as a compatibility facade", function shouldKeepPercentageFacade() {
    const fourPapers = buildPapers(4);
    moveSessionToSelection(session, fourPapers, [2, 3, 1, 0]);
    session.setAcceptancePercentage(50);

    expect(session.selectAcceptedPapers()).toEqual([fourPapers[1], fourPapers[0]]);
});
```

- [ ] **Step 2: Ejecutar y comprobar RED**

Run:

```bash
npm test -- --runInBand tests/SessionSelection.test.js
```

Expected: FAIL porque `setAcceptancePolicy` y `acceptancePolicy` no existen.

- [ ] **Step 3: Adaptar `Session` y `SelectionStage` para Strategy**

En el constructor de `Session`, reemplazar `_acceptancePercentage` por:

```js
this._acceptancePolicy = new FixedAcceptanceSelector(0);
```

Agregar en `Session` la configuración y la fachada porcentual:

```js
setAcceptancePolicy(policy){
    if (typeof(policy) !== "object" || policy === null || typeof(policy.select) !== "function") {
        throw new Error("Acceptance policy must implement select(papers)");
    }

    this._acceptancePolicy = policy;
    this._acceptedPapers = [];
}
acceptancePolicy(){
    return this._acceptancePolicy;
}
setAcceptancePercentage(percentage){
    this.setAcceptancePolicy(new FixedAcceptanceSelector(percentage));
}
```

Reemplazar en `src/stages/SelectionStage.js` la selección porcentual transitoria del PR 2 por:

```js
selectAcceptedPapers(session){
    const acceptedPapers = session.acceptancePolicy().select(session.papers());
    session._replaceAcceptedPapers(acceptedPapers);
    return acceptedPapers;
}
```

- [ ] **Step 4: Verificar y commitear**

Run:

```bash
npm test -- --runInBand tests/SessionSelection.test.js tests/SessionWorkflow.test.js tests/Demo.test.js
npm test -- --runInBand
```

Expected: nuevas políticas integradas y flujo porcentual previo en verde.

```bash
git add src/Session.js src/stages/SelectionStage.js tests/SessionSelection.test.js
git commit -m "feat: configure acceptance policy per session"
```

### Task PR2.1: Introducir el State base y la matriz de operaciones inválidas

Esta tarea constituye la fase RED del refactor y se completa con la implementación GREEN de Task PR2.2; no se debe commitear ni dejar la rama compartida entre ambas tareas.

**Files:**
- Create: `src/stages/SessionStage.js`
- Create: `tests/SessionStages.test.js`
- Modify: `src/Session.js`
- Modify: `tests/SessionReviewing.test.js`
- Modify: `tests/SessionSelection.test.js`

- [x] **Step 1: Crear una prueba parametrizada desde la API pública**

Crear `tests/SessionStages.test.js`. El fixture debe construir una sesión con un paper y cuatro revisores, y disponer de helpers `moveToBidding`, `moveToReviewing` y `moveToSelection`. Definir estas operaciones exactas:

```js
function operationCases(session, paper, author, reviewer) {
    const candidate = new Paper("Updated", [author], author);

    return [
        {allowed: "Receiving", action: "submit papers", invoke: function submitPaper() { session.submit(candidate); }},
        {allowed: "Receiving", action: "update papers", invoke: function updatePaper() { session.updatePaper(paper, author, candidate); }},
        {allowed: "Receiving", action: "close submissions", invoke: function closeSubmissions() { session.closeSubmissions(); }},
        {allowed: "Bidding", action: "enter bids", invoke: function enterBid() { session.enterBid(paper, reviewer, Interests.Maybe); }},
        {allowed: "Bidding", action: "close bidding", invoke: function closeBidding() { session.closeBidding(); }},
        {allowed: "Reviewing", action: "submit reviews", invoke: function submitReview() { session.submitReview(paper, reviewer, "Review", 1); }},
        {allowed: "Reviewing", action: "close reviewing", invoke: function closeReviewing() { session.closeReviewing(); }},
        {allowed: "Selection", action: "select accepted papers", invoke: function selectPapers() { session.selectAcceptedPapers(); }},
        {allowed: "Selection", action: "query accepted papers", invoke: function queryPapers() { session.acceptedPapers(); }}
    ];
}
```

Generar un test por combinación inválida:

```js
for (const stageName of ["Receiving", "Bidding", "Reviewing", "Selection"]) {
    for (const operationCase of operationCasesForStage(stageName)) {
        if (operationCase.allowed !== stageName) {
            it(
                "should reject " + operationCase.action + " during " + stageName,
                function shouldRejectOperationWithoutMutation() {
                    const stageBefore = operationCase.session.stage();
                    const papersBefore = operationCase.session.papers().slice();
                    const bidsBefore = operationCase.session.bids().slice();

                    expect(operationCase.invoke).toThrow(
                        "Cannot " + operationCase.action + " during " + stageName + " stage"
                    );
                    expect(operationCase.session.stage()).toBe(stageBefore);
                    expect(operationCase.session.papers()).toEqual(papersBefore);
                    expect(operationCase.session.bids()).toEqual(bidsBefore);
                }
            );
        }
    }
}
```

`operationCasesForStage(stageName)` debe crear una sesión nueva, llevarla a la etapa pedida y adjuntar `session` a cada caso antes de devolverlo. Para Selection debe enviar una review por cada reviewer asignado y luego cerrar Reviewing. No reutilizar una sesión mutada entre casos.

- [x] **Step 2: Actualizar expectativas existentes de error**

En `tests/SessionReviewing.test.js`:

```js
expect(submitReviewTooEarly).toThrow("Cannot submit reviews during Receiving stage");
```

En `tests/SessionSelection.test.js`:

```js
expect(selectTooEarly).toThrow("Cannot select accepted papers during Receiving stage");
```

- [x] **Step 3: Ejecutar y comprobar RED útil**

Run:

```bash
npm test -- --runInBand tests/SessionStages.test.js tests/SessionReviewing.test.js tests/SessionSelection.test.js
```

Expected: FAIL porque varias transiciones hoy pueden invocarse desde etapas incorrectas y los errores actuales no identifican operación y etapa.

- [x] **Step 4: Crear el State base**

Crear `src/stages/SessionStage.js`:

```js
class SessionStage{
    constructor(name){
        this._name = name;
    }
    name(){
        return this._name;
    }
    canSubmit(paper){
        return false;
    }
    reject(operation){
        throw new Error("Cannot " + operation + " during " + this.name() + " stage");
    }
    submit(session, paper){
        this.reject("submit papers");
    }
    updatePaper(session, paper, author, candidatePaper){
        this.reject("update papers");
    }
    closeSubmissions(session){
        this.reject("close submissions");
    }
    enterBid(session, paper, reviewer, interest){
        this.reject("enter bids");
    }
    closeBidding(session){
        this.reject("close bidding");
    }
    submitReview(session, paper, reviewer, text, score){
        this.reject("submit reviews");
    }
    closeReviewing(session){
        this.reject("close reviewing");
    }
    selectAcceptedPapers(session){
        this.reject("select accepted papers");
    }
    acceptedPapers(session){
        this.reject("query accepted papers");
    }
}

module.exports = SessionStage;
```

- [x] **Step 5: Convertir `Session` en contexto delegador**

En `src/Session.js`, reemplazar el string inicial por `new ReceivingStage()` y hacer que estas APIs no contengan validaciones de etapa:

```js
stage(){
    return this._stage.name();
}
canSubmit(paper){
    return this._stage.canSubmit(paper);
}
submit(paper){
    return this._stage.submit(this, paper);
}
updatePaper(paper, author, candidatePaper){
    return this._stage.updatePaper(this, paper, author, candidatePaper);
}
closeSubmissions(){
    return this._stage.closeSubmissions(this);
}
enterBid(paper, reviewer, interest){
    return this._stage.enterBid(this, paper, reviewer, interest);
}
closeBidding(){
    return this._stage.closeBidding(this);
}
submitReview(paper, reviewer, text, score){
    return this._stage.submitReview(this, paper, reviewer, text, score);
}
closeReviewing(){
    return this._stage.closeReviewing(this);
}
selectAcceptedPapers(){
    return this._stage.selectAcceptedPapers(this);
}
acceptedPapers(){
    return this._stage.acceptedPapers(this);
}
_transitionTo(stage){
    this._stage = stage;
}
_addPaper(paper){
    this._papers.push(paper);
}
_containsPaper(paper){
    return this._papers.includes(paper);
}
_addBid(bid){
    this._bids.push(bid);
}
_replaceAssignments(assignments){
    this._assignments = assignments;
}
_replaceAcceptedPapers(papers){
    this._acceptedPapers = papers;
}
```

Eliminar `#setStage`, `assertStage` y las ramas de etapa anteriores sólo después de que las cuatro clases concretas de las tareas siguientes estén conectadas.

### Task PR2.2: Implementar los cuatro estados concretos y preservar transiciones atómicas

**Files:**
- Create: `src/stages/ReceivingStage.js`
- Create: `src/stages/BiddingStage.js`
- Create: `src/stages/ReviewingStage.js`
- Create: `src/stages/SelectionStage.js`
- Modify: `src/Session.js`
- Modify: `tests/SessionAssignment.test.js`
- Modify: `tests/SessionReviewing.test.js`

- [x] **Step 1: Implementar Receiving preservando la actualización incorporada en el PR 1**

Crear `src/stages/ReceivingStage.js`:

```js
const BiddingStage = require("./BiddingStage");
const SessionStage = require("./SessionStage");

class ReceivingStage extends SessionStage{
    constructor(){
        super("Receiving");
    }
    canSubmit(paper){
        return paper.isValid();
    }
    submit(session, paper){
        if (!paper.isValid()) {
            throw new Error("Cannot submit invalid paper");
        }

        session._addPaper(paper);
    }
    updatePaper(session, paper, author, candidatePaper){
        if (!session._containsPaper(paper)) {
            throw new Error("Paper was not submitted to this session");
        }

        if (!paper.hasAuthor(author)) {
            throw new Error("Only an author can update this paper");
        }

        paper.updateFrom(candidatePaper);
    }
    closeSubmissions(session){
        session._transitionTo(new BiddingStage());
    }
}

module.exports = ReceivingStage;
```

- [x] **Step 2: Implementar Bidding con commit posterior al cálculo**

Crear `src/stages/BiddingStage.js`:

```js
const {Bid} = require("../Bid");
const ReviewerAssigner = require("../ReviewerAssigner");
const SessionStage = require("./SessionStage");
const ReviewingStage = require("./ReviewingStage");

class BiddingStage extends SessionStage{
    constructor(){
        super("Bidding");
    }
    enterBid(session, paper, reviewer, interest){
        const existingBid = session.bidFor(paper, reviewer);

        if (typeof(existingBid) === "undefined") {
            session._addBid(new Bid(paper, reviewer, interest));
            return;
        }

        existingBid.setInterest(interest);
    }
    closeBidding(session){
        const assigner = new ReviewerAssigner();
        const assignments = assigner.assign(
            session.papers(),
            session.reviewers(),
            session.bids()
        );

        session._replaceAssignments(assignments);
        session._transitionTo(new ReviewingStage());
    }
}

module.exports = BiddingStage;
```

El cálculo de `assignments` debe terminar antes de mutar `Session`; si `ReviewerAssigner.assign` lanza, no se ejecutan las dos últimas líneas.

- [x] **Step 3: Implementar Reviewing con completitud por asignaciones**

Crear `src/stages/ReviewingStage.js`:

```js
const SessionStage = require("./SessionStage");
const SelectionStage = require("./SelectionStage");

class ReviewingStage extends SessionStage{
    constructor(){
        super("Reviewing");
    }
    submitReview(session, paper, reviewer, text, score){
        if (!session.isReviewerAssignedTo(paper, reviewer)) {
            throw new Error("Reviewer is not assigned to this paper");
        }

        paper.addReview(reviewer, text, score);
    }
    closeReviewing(session){
        if (!this.allReviewsSubmitted(session)) {
            throw new Error("Cannot close reviewing before all assigned reviews are submitted");
        }

        session._transitionTo(new SelectionStage());
    }
    allReviewsSubmitted(session){
        for (const paper of session.papers()) {
            if (!this.allAssignedReviewsSubmittedFor(session, paper)) {
                return false;
            }
        }

        return true;
    }
    allAssignedReviewsSubmittedFor(session, paper){
        const assignedReviewers = session.assignedReviewersFor(paper);

        if (assignedReviewers.length !== paper.constructor.allowedReviews) {
            return false;
        }

        for (const reviewer of assignedReviewers) {
            if (!paper.hasReviewFrom(reviewer)) {
                return false;
            }
        }

        return true;
    }
}

module.exports = ReviewingStage;
```

- [x] **Step 4: Implementar Selection preservando temporalmente la política porcentual del TP1**

Crear `src/stages/SelectionStage.js`:

```js
const FixedAcceptanceSelector = require("../FixedAcceptanceSelector");
const SessionStage = require("./SessionStage");

class SelectionStage extends SessionStage{
    constructor(){
        super("Selection");
    }
    selectAcceptedPapers(session){
        const selector = new FixedAcceptanceSelector();
        const acceptedPapers = selector.select(
            session.papers(),
            session.acceptancePercentage()
        );
        session._replaceAcceptedPapers(acceptedPapers);
        return acceptedPapers;
    }
    acceptedPapers(session){
        return session._acceptedPapers;
    }
}

module.exports = SelectionStage;
```

Agregar temporalmente a `Session` este accessor para preservar la implementación del TP1 sin exponer el objeto State:

```js
acceptancePercentage(){
    return this._acceptancePercentage;
}
```

Task PR3.3 eliminará `_acceptancePercentage` y este accessor cuando el PR 3 introduzca la Strategy configurable.

- [x] **Step 5: Conectar `Session` a `ReceivingStage`**

Agregar al inicio de `src/Session.js`:

```js
const ReceivingStage = require("./stages/ReceivingStage");
```

El constructor debe usar:

```js
this._stage = new ReceivingStage();
```

Conservar en `Session` las consultas de datos, bids y asignaciones; eliminar la lógica que ahora vive en los estados. En particular, reemplazar la implementación directa de `updatePaper` agregada en el PR 1 por la delegación a `_stage`, manteniendo `_containsPaper` como operación interna del contexto.

- [x] **Step 6: Reforzar que las transiciones fallidas no dejan cambios parciales**

Agregar al caso imposible de `tests/SessionAssignment.test.js`:

```js
expect(impossibleSession.stage()).toBe("Bidding");
expect(impossibleSession.assignedReviewersFor(papers[0])).toEqual([]);
expect(impossibleSession.assignedReviewersFor(papers[1])).toEqual([]);
```

Agregar al cierre incompleto de `tests/SessionReviewing.test.js`:

```js
const reviewCountsBefore = [papers[0].reviewsCount(), papers[1].reviewsCount()];

expect(closeReviewing).toThrow("Cannot close reviewing before all assigned reviews are submitted");
expect(session.stage()).toBe("Reviewing");
expect([papers[0].reviewsCount(), papers[1].reviewsCount()]).toEqual(reviewCountsBefore);
```

- [x] **Step 7: Verificar refactor State completo**

Run:

```bash
npm test -- --runInBand tests/SessionStages.test.js tests/SessionAssignment.test.js tests/SessionReviewing.test.js tests/SessionSelection.test.js tests/SessionWorkflow.test.js
npm test -- --runInBand
```

Expected: todas las operaciones previas conservadas; cada operación inválida falla con mensaje específico; las transiciones fallidas mantienen estado.

- [x] **Step 8: Commit**

```bash
git add src/Session.js src/stages tests/SessionStages.test.js tests/SessionAssignment.test.js tests/SessionReviewing.test.js tests/SessionSelection.test.js
git commit -m "refactor: model session workflow with state objects"
```

### Task PR1.3: Corregir en `Session` la actualización de papers durante Recepción

Aunque esta sección se conserva cerca de los tests transversales de etapas para facilitar su lectura, se ejecuta inmediatamente después de Task PR1.2, antes de comenzar los PRs 2 y 3.

**Files:**
- Modify: `src/Session.js`
- Create: `tests/SessionPaperUpdate.test.js`

- [x] **Step 1: Crear el fixture de actualización**

Crear `tests/SessionPaperUpdate.test.js` con `Session`, `User`, `RegularPaper` y `Poster`. En `beforeEach`, construir:

```js
session = new Session();
author = new User("author", "UNLP", "author@unlp.edu", "123");
coauthor = new User("coauthor", "UNLP", "coauthor@unlp.edu", "123");
outsider = new User("outsider", "UNLP", "outsider@unlp.edu", "123");
regularPaper = new RegularPaper(
    "Original regular",
    [author, coauthor],
    author,
    "Original abstract"
);
poster = new Poster(
    "Original poster",
    [author],
    author,
    "https://example.com/original.pdf",
    "https://example.com/original.zip"
);
session.submit(regularPaper);
session.submit(poster);
```

- [x] **Step 2: Agregar los escenarios funcionales obligatorios**

```js
it("should let any current author update a submitted regular paper", function shouldAllowCoauthorUpdate() {
    const candidate = new RegularPaper(
        "Updated regular",
        [coauthor, outsider],
        coauthor,
        "Updated abstract"
    );

    session.updatePaper(regularPaper, coauthor, candidate);

    expect(regularPaper.title()).toBe("Updated regular");
    expect(regularPaper.authors()).toEqual([coauthor, outsider]);
    expect(regularPaper.correspondingAuthor()).toBe(coauthor);
    expect(regularPaper.abstract()).toBe("Updated abstract");
});

it("should preserve submission identity and order", function shouldPreserveIdentityAndOrder() {
    const candidate = new RegularPaper("Updated", [author], author, "Updated abstract");

    session.updatePaper(regularPaper, author, candidate);

    expect(session.papers()[0]).toBe(regularPaper);
    expect(session.papers()[1]).toBe(poster);
});

it("should update poster-specific data", function shouldUpdatePosterData() {
    const candidate = new Poster(
        "Updated poster",
        [author],
        author,
        "https://example.com/updated.pdf",
        "https://example.com/updated.zip"
    );

    session.updatePaper(poster, author, candidate);

    expect(poster.attachmentUrl()).toBe("https://example.com/updated.pdf");
    expect(poster.sourcesUrl()).toBe("https://example.com/updated.zip");
});

it("should reject a non author without changing the paper", function shouldRejectNonAuthor() {
    const candidate = new RegularPaper("Updated", [author], author, "Updated abstract");

    function updateAsOutsider() {
        session.updatePaper(regularPaper, outsider, candidate);
    }

    expect(updateAsOutsider).toThrow("Only an author can update this paper");
    expect(regularPaper.title()).toBe("Original regular");
    expect(regularPaper.abstract()).toBe("Original abstract");
});

it("should reject a paper not submitted to the session", function shouldRejectForeignPaper() {
    const foreignPaper = new RegularPaper("Foreign", [author], author, "Foreign abstract");
    const candidate = new RegularPaper("Updated", [author], author, "Updated abstract");

    function updateForeignPaper() {
        session.updatePaper(foreignPaper, author, candidate);
    }

    expect(updateForeignPaper).toThrow("Paper was not submitted to this session");
    expect(session.papers()).toEqual([regularPaper, poster]);
});

it("should reject invalid replacement data atomically", function shouldRejectInvalidDataAtomically() {
    const candidate = new RegularPaper(
        "Invalid new title",
        [author],
        author,
        new Array(302).join("word ")
    );

    function updateWithInvalidData() {
        session.updatePaper(regularPaper, author, candidate);
    }

    expect(updateWithInvalidData).toThrow("Cannot update paper with invalid data");
    expect(regularPaper.title()).toBe("Original regular");
    expect(regularPaper.abstract()).toBe("Original abstract");
});

it("should reject updates after submissions close", function shouldRejectUpdateAfterDeadline() {
    const candidate = new RegularPaper("Updated", [author], author, "Updated abstract");
    session.closeSubmissions();

    function updateAfterDeadline() {
        session.updatePaper(regularPaper, author, candidate);
    }

    expect(updateAfterDeadline).toThrow("Cannot update papers during Bidding stage");
    expect(session.stage()).toBe("Bidding");
    expect(regularPaper.title()).toBe("Original regular");
    expect(regularPaper.abstract()).toBe("Original abstract");
});
```

- [x] **Step 3: Ejecutar y comprobar RED**

Run:

```bash
npm test -- --runInBand tests/SessionPaperUpdate.test.js
```

Expected: FAIL porque `Session.updatePaper` todavía no existe.

- [x] **Step 4: Habilitar actualización en `Session` sobre el flujo actual**

Agregar a `src/Session.js`:

```js
updatePaper(paper, author, candidatePaper){
    if (this.stage() !== "Receiving") {
        throw new Error("Cannot update papers during " + this.stage() + " stage");
    }

    if (!this._papers.includes(paper)) {
        throw new Error("Paper was not submitted to this session");
    }

    if (!paper.hasAuthor(author)) {
        throw new Error("Only an author can update this paper");
    }

    paper.updateFrom(candidatePaper);
}
```

- [x] **Step 5: Verificar y commitear**

Run:

```bash
npm test -- --runInBand tests/SessionPaperUpdate.test.js
npm test -- --runInBand
```

Expected: todos los casos de actualización y la suite previa en verde. El PR cierra el issue #3 sin introducir todavía State ni políticas nuevas.

```bash
git add src/Session.js tests/SessionPaperUpdate.test.js
git commit -m "fix: allow paper updates before the submission deadline"
```

### Task Cierre.1: Cerrar regresiones, cobertura y calidad de los PRs 1 a 3

**Files:**
- Modify only if a regression is found: tests and production files listed above
- Do not modify: documentation, demo, package metadata

- [ ] **Step 1: Ejecutar cada área focalizada**

Run:

```bash
npm test -- --runInBand tests/SessionPaperUpdate.test.js
npm test -- --runInBand tests/SessionStages.test.js
npm test -- --runInBand tests/AcceptanceByCount.test.js tests/AcceptanceByScoreThreshold.test.js tests/FixedAcceptanceSelector.test.js
npm test -- --runInBand tests/SessionAssignment.test.js tests/SessionReviewing.test.js tests/SessionSelection.test.js
npm test -- --runInBand tests/SessionWorkflow.test.js tests/Demo.test.js
```

Expected: cero tests fallidos en cada grupo.

- [ ] **Step 2: Ejecutar suite y cobertura completas**

Run:

```bash
npm test -- --runInBand --coverage
```

Expected:

```text
Test Suites: all passed
Tests:       all passed
Statements: >= 80%
Branches:   >= 80%
Functions:  >= 80%
Lines:      >= 80%
```

- [ ] **Step 3: Inspeccionar condiciones centralizadas prohibidas**

Run:

```bash
rg '_stage\s*===|_stage\s*==|stage\(\)\s*===|stage\(\)\s*==' src/Session.js src/stages
```

Expected: sin resultados. `Session` sólo delega; los estados concretos no preguntan cuál es la etapa actual.

- [ ] **Step 4: Comprobar que no se introdujeron callbacks anónimos en producción**

Run:

```bash
rg '=>|function\s*\(' src/Session.js src/Paper.js src/RegularPaper.js src/Poster.js src/AcceptancePolicy.js src/AcceptanceByCount.js src/AcceptanceByScoreThreshold.js src/FixedAcceptanceSelector.js src/stages
```

Expected: sin funciones flecha ni funciones anónimas nuevas en los archivos productivos tocados.

- [ ] **Step 5: Revisar el diff acotado**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Expected:

- `git diff --check` sin salida.
- Ningún cambio en `README.md`, `demo.js`, `docs/DECISIONES.md`, `docs/DOCUMENTACION_TECNICA.md` ni archivos de enunciado.
- `package-lock.json` sigue fuera de los commits si estaba fuera al comenzar.

- [ ] **Step 6: Commit de correcciones de integración, sólo si fue necesario**

```bash
git add src tests
git commit -m "test: cover tp2 workflow and regressions"
```

No crear un commit vacío si la verificación no exigió cambios.

### Task PR4.1: Completar documentación, diagrama y cierre del TP2

**Files:**
- Modify: `docs/DOCUMENTACION_TECNICA.md`
- Modify: `docs/DECISIONES.md`
- Modify only if its description or links become stale: `README.md`
- Verify: `docs/dev-cycle/4-PLAN-TP2.md`

- [ ] **Step 1: Actualizar el diagrama de clases Mermaid**

Modificar el `classDiagram` de `docs/DOCUMENTACION_TECNICA.md` para representar, como mínimo:

- `Session` como contexto que referencia un `SessionStage` actual y una `AcceptancePolicy`;
- `SessionStage` y sus cuatro estados concretos;
- las transiciones `ReceivingStage -> BiddingStage -> ReviewingStage -> SelectionStage`;
- `AcceptancePolicy`, `FixedAcceptanceSelector`, `AcceptanceByCount` y `AcceptanceByScoreThreshold`;
- la relación de actualización entre `Session`, `Paper`, `RegularPaper` y `Poster`.

- [ ] **Step 2: Actualizar la descripción técnica del flujo**

Documentar en `docs/DOCUMENTACION_TECNICA.md` las operaciones habilitadas por etapa, el cierre manual de Recepción como deadline, la actualización atómica de trabajos y la configuración independiente de políticas por sesión.

- [ ] **Step 3: Registrar las decisiones de diseño**

Agregar a `docs/DECISIONES.md` decisiones explícitas sobre:

- elección de State frente a condicionales o una tabla central;
- elección de Strategy para las políticas de aceptación;
- conservación de la política porcentual como compatibilidad del TP1;
- uso de un paper candidato validado para conservar identidad, orden y última versión válida;
- alcance manual del deadline, sin reloj ni scheduler.

- [ ] **Step 4: Verificar enlaces y consistencia documental**

Run:

```bash
rg -n 'DOCUMENTACION_TECNICA|DECISIONES|classDiagram|SessionStage|AcceptancePolicy' README.md docs
git diff --check
```

Expected: el README no contiene enlaces rotos hacia los documentos modificados, el diagrama menciona State y Strategy, y `git diff --check` no produce salida.

- [ ] **Step 5: Ejecutar la verificación final de entrega**

Run:

```bash
npm test -- --runInBand --coverage
```

Expected: todas las suites y tests pasan; statements, branches, functions y lines permanecen en al menos 80%.

- [ ] **Step 6: Commit**

```bash
git add docs/DOCUMENTACION_TECNICA.md docs/DECISIONES.md README.md docs/dev-cycle/4-PLAN-TP2.md
git commit -m "docs: complete tp2 design deliverables"
```

Si `README.md` no requirió cambios, omitirlo del `git add`.

## 7. Matriz de trazabilidad del enunciado

| Requisito TP2 | Diseño | Tests principales |
|---|---|---|
| Operaciones definidas por etapa | State y rechazo por defecto | `SessionStages.test.js` |
| Errores descriptivos en etapa inválida | `SessionStage.reject` | `SessionStages.test.js` |
| Sin condicional central en `Session` | Delegación polimórfica | búsqueda `rg` de Task Cierre.1 |
| Transición fallida sin cambios parciales | cálculo antes de commit | `SessionAssignment.test.js`, `SessionReviewing.test.js` |
| Autor actualiza durante Recepción | `ReceivingStage.updatePaper` | `SessionPaperUpdate.test.js` |
| Sólo autores y papers de la sesión | validaciones previas | `SessionPaperUpdate.test.js` |
| Actualización inválida conserva versión | candidato validado antes de copia | `Paper.test.js`, `RegularPaper.test.js`, `SessionPaperUpdate.test.js` |
| Identidad y orden de envío estables | copia sobre objeto original | `SessionPaperUpdate.test.js` |
| Deadline manual al cerrar Recepción | rechazo State desde Bidding | `SessionPaperUpdate.test.js`, `SessionStages.test.js` |
| `AcceptanceByCount` | Strategy por cantidad | `AcceptanceByCount.test.js` |
| `AcceptanceByScoreThreshold` inclusivo | Strategy por umbral | `AcceptanceByScoreThreshold.test.js` |
| Porcentaje TP1 compatible | facade `setAcceptancePercentage` | `FixedAcceptanceSelector.test.js`, `SessionSelection.test.js`, `SessionWorkflow.test.js` |
| Empates deterministas | orden estable compartido | tests de las tres políticas |
| Políticas aisladas por sesión | instancia en cada `Session` | `SessionSelection.test.js` |
| Selección sólo en Selection | `SelectionStage` | `SessionStages.test.js` |
| Cobertura mínima 80% | verificación Jest final | Tasks Cierre.1 y PR4.1 |
| Diagrama de clases actualizado | Mermaid con State y Strategy | Task PR4.1 |
| Documento de decisiones actualizado | decisiones de flujo, políticas y actualización | Task PR4.1 |

## 8. Criterio de finalización

La implementación se considera terminada únicamente cuando:

1. la suite completa pasa sin exclusiones ni tests salteados;
2. statements, branches, functions y lines permanecen en al menos 80%;
3. las nueve operaciones de la matriz fallan en todas las etapas no habilitadas sin mutar el agregado;
4. el flujo porcentual completo del TP1 sigue pasando;
5. dos sesiones con políticas distintas producen resultados independientes;
6. una actualización inválida o posterior al deadline conserva la última versión válida;
7. `Session.js` no contiene condicionales que despachen comportamiento según la etapa;
8. los diffs de los PRs 1 a 3 no incluyen documentación, diagramas, demo ni cambios de dependencias;
9. el PR 4 actualiza el diagrama de clases y los documentos de decisiones y diseño para reflejar el resultado implementado.
