# Plan de Implementacion de ComfyChair
xxxx
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar asignacion de revisores, carga de revisiones y seleccion por corte fijo sobre el codigo base actual, manteniendo los tests existentes en verde y conservando cobertura mayor o igual a 80%.

**Architecture:** `Session` debe seguir siendo el agregado raiz y el orquestador del flujo `Receiving -> Bidding -> Reviewing -> Selection`, pero la logica de asignacion no debe quedar embebida en un metodo largo. La propuesta es mover el algoritmo a objetos chicos y trazables (`ReviewAssignment`, `ReviewerQuota`, `ReviewerAssigner`, `FixedAcceptanceSelector`) y dejar que `Paper` y `Review` custodien sus propias invariantes.

**Tech Stack:** Node.js CommonJS, Jest 29, tests unitarios en `tests/`.

---

## Estado base relevado

- Suite actual: `24` tests en verde.
- Cobertura actual: `93.68%` statements, `90.9%` branches.
- Flujo ya implementado: `Receiving` y `Bidding`.
- Clases existentes a preservar: `User`, `Conference`, `RegularPaper`, `Poster`, mas el comportamiento ya cubierto de `Paper`, `Review`, `Bid` y `Session`.

## Restricciones y decisiones que deben guiar la implementacion

1. Mantener orientacion a objetos estricta. No modelar asignaciones o cuotas con objetos literales ad hoc si se pueden representar como clases de dominio claras.
2. No introducir lambdas ni funciones anonimas nuevas en codigo productivo. En archivos tocados, preferir `for...of`, metodos auxiliares con nombre y comparadores/metodos declarados explicitamente.
3. En tests nuevos, preferir callbacks nombrados cuando sea razonable para no seguir propagando el estilo actual basado en arrows.
4. La formula de distribucion de carga debe seguir el ejemplo del enunciado, no el `ceil` literal: `base = Math.floor((3 * A) / R)` y `resto = (3 * A) % R`; los primeros `resto` revisores reciben una revision adicional.
5. Aunque 2.4 dice que el estado por defecto es `NotInterested`, 2.5 separa "sin bid" de `NotInterested`. Para que el algoritmo sea consistente con la prioridad pedida, se debe distinguir:
   - bid explicito `Interested`
   - bid explicito `Maybe`
   - ausencia de bid
   - bid explicito `NotInterested`
6. El conflicto de interes obligatorio para esta etapa es: un autor nunca puede ser revisor de su propio paper. El soporte para registrar `Conflict` durante bidding puede quedar como opcional si sobra tiempo.
7. El porcentaje de aceptacion se interpreta como tope maximo, por lo que la cantidad aceptada debe ser `Math.floor(totalPapers * porcentaje / 100)`.
8. Ante empate de score en el borde del corte, mantener orden de envio para no introducir no determinismo.
9. No escribir aun el documento de decisiones ni el diagrama de clases final; dejar el plan listo para que esa documentacion se haga despues de cerrar el codigo.

## Mapa de archivos propuesto

**Crear**

- `src/ReviewAssignment.js`
- `src/ReviewerQuota.js`
- `src/ReviewerAssigner.js`
- `src/FixedAcceptanceSelector.js`
- `tests/Review.test.js`
- `tests/ReviewerAssigner.test.js`
- `tests/SessionAssignment.test.js`
- `tests/SessionReviewing.test.js`
- `tests/SessionSelection.test.js`
- `tests/SessionWorkflow.test.js`

**Modificar**

- `src/Review.js`
- `src/Paper.js`
- `src/Session.js`
- `tests/Paper.test.js`
- `tests/Session.test.js`

## Estrategia TDD de alto nivel

1. Empezar por invariantes chicas y aisladas (`Review`, `Paper`) para no mezclar errores de validacion con errores de flujo.
2. Extraer y testear el algoritmo de asignacion fuera de `Session`.
3. Integrar ese algoritmo a `Session` con cambios minimos y verificables.
4. Implementar carga de revisiones solo despues de que existan asignaciones confiables.
5. Implementar seleccion solo despues de que la etapa de revisiones quede cerrada por tests.
6. Cerrar con un test end-to-end y corrida completa con cobertura.

## Tareas

### Task 1: Congelar baseline y alinear el estilo en los archivos que seguro se tocaran

**Files:**
- Modify: `src/Paper.js`
- Modify: `src/Session.js`
- Modify: `tests/Session.test.js`

- [ ] **Step 1: Ejecutar la baseline antes de tocar nada**

Run: `npm test -- --runInBand`
Expected: `5 passed, 5 total`

- [ ] **Step 2: Escribir un test de regresion pequeno para proteger el comportamiento ya existente de `bidFor`**

Agregar a `tests/Session.test.js` un caso que deje explicitado que un bid previo se recupera por `paper` y `reviewer`:

```js
it("should recover an existing bid for a paper and reviewer", function shouldRecoverExistingBid() {
    asse.closeSubmissions();
    asse.enterBid(paper02, juan, Interests.Maybe);

    expect(asse.bidFor(paper02, juan).interest()).toBe(Interests.Maybe);
});
```

- [ ] **Step 3: Reemplazar callbacks anonimos nuevos o inevitables en `src/Paper.js` y `src/Session.js` por helpers con nombre o loops**

Objetivo de este paso:

```js
score() {
    if (this.reviewsCount() === 0) {
        return 0;
    }

    let totalScore = 0;
    for (const review of this._reviews) {
        totalScore += review.score();
    }

    return totalScore / this.reviewsCount();
}
```

```js
bidFor(paper, reviewer) {
    for (const existingBid of this._bids) {
        if (this.isBidFor(existingBid, paper, reviewer)) {
            return existingBid;
        }
    }
}

isBidFor(existingBid, paper, reviewer) {
    return existingBid.paper() === paper && existingBid.reviewer() === reviewer;
}
```

- [ ] **Step 4: Ejecutar el test focalizado y luego la suite completa**

Run: `npm test -- --runInBand tests/Session.test.js`
Expected: PASS

Run: `npm test -- --runInBand`
Expected: todo verde

- [ ] **Step 5: Commit**

```bash
git add src/Paper.js src/Session.js tests/Session.test.js
git commit -m "refactor: align touched production files with project style"
```

### Task 2: Endurecer `Review` y `Paper` como guardianes de invariantes

**Files:**
- Create: `tests/Review.test.js`
- Modify: `tests/Paper.test.js`
- Modify: `src/Review.js`
- Modify: `src/Paper.js`

- [ ] **Step 1: Escribir los tests fallidos de `Review`**

Crear `tests/Review.test.js` con estos casos:

```js
const Review = require("../src/Review");
const User = require("../src/User");

let reviewer;

function buildReviewer() {
    reviewer = new User("Reviewer One", "UNLP", "reviewer@unlp.edu", "123");
}

beforeEach(buildReviewer);

describe("A Review", function reviewSuite() {
    it("should keep reviewer, text and score", function shouldKeepState() {
        const review = new Review(reviewer, "Solid paper", 2);

        expect(review.reviewer()).toBe(reviewer);
        expect(review.text()).toBe("Solid paper");
        expect(review.score()).toBe(2);
    });

    it("should reject scores below -3", function shouldRejectScoreBelowRange() {
        function createInvalidReview() {
            new Review(reviewer, "Too harsh", -4);
        }

        expect(createInvalidReview).toThrow("Score must be an integer between -3 and 3");
    });

    it("should reject scores above 3", function shouldRejectScoreAboveRange() {
        function createInvalidReview() {
            new Review(reviewer, "Too optimistic", 4);
        }

        expect(createInvalidReview).toThrow("Score must be an integer between -3 and 3");
    });

    it("should reject non integer scores", function shouldRejectNonIntegerScore() {
        function createInvalidReview() {
            new Review(reviewer, "Half point", 1.5);
        }

        expect(createInvalidReview).toThrow("Score must be an integer between -3 and 3");
    });
});
```

- [ ] **Step 2: Extender `tests/Paper.test.js` con invariantes necesarias para conflicto y revisiones duplicadas**

Agregar, como minimo:

```js
it("should know whether a user is one of its authors", function shouldKnowItsAuthors() {
    expect(paper.hasAuthor(juan)).toBe(true);
    expect(paper.hasAuthor(julian)).toBe(false);
});

it("should not accept two reviews from the same reviewer", function shouldRejectDuplicateReviewer() {
    paper.addReview(julian, "Paper is bad", -2);

    function duplicateReview() {
        paper.addReview(julian, "Paper is still bad", -1);
    }

    expect(duplicateReview).toThrow("Reviewer already reviewed this paper");
});
```

- [ ] **Step 3: Ejecutar los tests nuevos para confirmar falla util**

Run: `npm test -- --runInBand tests/Review.test.js tests/Paper.test.js`
Expected:
- `Cannot find` para metodos nuevos de `Paper`, o
- `Expected function to throw`, o
- falla por falta de validacion de score

- [ ] **Step 4: Implementar lo minimo en `src/Review.js` y `src/Paper.js`**

Objetivo de `src/Review.js`:

```js
class Review {
    constructor(reviewer, text, score) {
        this.assertValidScore(score);
        this._reviewer = reviewer;
        this._text = text;
        this._score = score;
    }

    assertValidScore(score) {
        if (!Number.isInteger(score) || score < -3 || score > 3) {
            throw new Error("Score must be an integer between -3 and 3");
        }
    }

    reviewer() {
        return this._reviewer;
    }

    text() {
        return this._text;
    }

    score() {
        return this._score;
    }
}
```

Objetivo de `src/Paper.js`:

```js
authors() {
    return this._authors;
}

correspondingAuthor() {
    return this._correspondingAuthor;
}

hasAuthor(user) {
    return this._authors.includes(user);
}

hasReviewFrom(reviewer) {
    for (const existingReview of this._reviews) {
        if (existingReview.reviewer() === reviewer) {
            return true;
        }
    }

    return false;
}

addReview(reviewer, review, score) {
    if (this.hasReviewFrom(reviewer)) {
        throw new Error("Reviewer already reviewed this paper");
    }

    if (this.reviewsCount() >= this.constructor.allowedReviews) {
        throw new Error("Cannot allow any more reviews");
    }

    this._reviews.push(new Review(reviewer, review, score));
}
```

- [ ] **Step 5: Reejecutar tests focalizados y la suite completa**

Run: `npm test -- --runInBand tests/Review.test.js tests/Paper.test.js`
Expected: PASS

Run: `npm test -- --runInBand`
Expected: todo verde

- [ ] **Step 6: Commit**

```bash
git add src/Review.js src/Paper.js tests/Review.test.js tests/Paper.test.js
git commit -m "feat: enforce review and paper invariants"
```

### Task 3: Extraer el algoritmo de asignacion a objetos chicos y testeables

**Files:**
- Create: `src/ReviewAssignment.js`
- Create: `src/ReviewerQuota.js`
- Create: `src/ReviewerAssigner.js`
- Create: `tests/ReviewerAssigner.test.js`

- [ ] **Step 1: Escribir tests puros para el algoritmo, sin involucrar `Session`**

Crear `tests/ReviewerAssigner.test.js` con una fixture repetible de 3 papers y 4 reviewers. Cubrir como minimo:

```js
it("should calculate reviewer quotas using floor plus remainder", function shouldDistributeQuotaFairly() {
    const assigner = new ReviewerAssigner();
    const quotas = assigner.buildQuotas([r1, r2, r3, r4], 3);

    expect(quotas[0].remaining()).toBe(3);
    expect(quotas[1].remaining()).toBe(2);
    expect(quotas[2].remaining()).toBe(2);
    expect(quotas[3].remaining()).toBe(2);
});

it("should prioritize interested before maybe before no bid before not interested", function shouldRespectBidPriority() {
    const assignments = assigner.assign(papers, reviewers, bids);

    expect(reviewerNamesFor(assignments, papers[0])).toEqual([
        "interested-reviewer",
        "maybe-reviewer",
        "no-bid-reviewer"
    ]);
});

it("should never assign an author to review the paper", function shouldSkipConflictedAuthors() {
    const assignments = assigner.assign(papers, reviewers, bids);

    expect(isAssigned(assignments, papers[0], authorReviewer)).toBe(false);
});

it("should fail when a paper cannot reach three non conflicted reviewers", function shouldFailWhenAssignmentIsImpossible() {
    function assignImpossibleCase() {
        assigner.assign(papers, onlyTwoEligibleReviewers, bids);
    }

    expect(assignImpossibleCase).toThrow("Cannot assign 3 reviewers to every paper");
});
```

- [ ] **Step 2: Ejecutar el test para validar fallo util**

Run: `npm test -- --runInBand tests/ReviewerAssigner.test.js`
Expected: `Cannot find module '../src/ReviewerAssigner'`

- [ ] **Step 3: Implementar las clases nuevas con responsabilidad unica**

Objetivo de `src/ReviewAssignment.js`:

```js
class ReviewAssignment {
    constructor(paper, reviewer) {
        this._paper = paper;
        this._reviewer = reviewer;
    }

    paper() {
        return this._paper;
    }

    reviewer() {
        return this._reviewer;
    }

    matches(paper, reviewer) {
        return this._paper === paper && this._reviewer === reviewer;
    }
}
```

Objetivo de `src/ReviewerQuota.js`:

```js
class ReviewerQuota {
    constructor(reviewer, capacity) {
        this._reviewer = reviewer;
        this._capacity = capacity;
        this._remaining = capacity;
    }

    reviewer() {
        return this._reviewer;
    }

    remaining() {
        return this._remaining;
    }

    hasCapacity() {
        return this._remaining > 0;
    }

    consume() {
        if (!this.hasCapacity()) {
            throw new Error("Reviewer quota exhausted");
        }

        this._remaining -= 1;
    }
}
```

Objetivo de `src/ReviewerAssigner.js`:

```js
class ReviewerAssigner {
    buildQuotas(reviewers, paperCount) {
        const totalReviews = paperCount * 3;
        const baseQuota = Math.floor(totalReviews / reviewers.length);
        const remainder = totalReviews % reviewers.length;
        const quotas = [];

        for (let index = 0; index < reviewers.length; index += 1) {
            let reviewerCapacity = baseQuota;

            if (index < remainder) {
                reviewerCapacity += 1;
            }

            quotas.push(new ReviewerQuota(reviewers[index], reviewerCapacity));
        }

        return quotas;
    }

    assign(papers, reviewers, bids) {
        const quotas = this.buildQuotas(reviewers, papers.length);
        const assignments = [];

        for (const paper of papers) {
            this.assignPaper(paper, quotas, bids, assignments);
        }

        return assignments;
    }
}
```

La implementacion completa debe incluir helpers con nombre para:
- detectar conflicto por autoria
- resolver prioridad de bid
- listar candidatos disponibles para un paper
- consumir cuota una vez asignado un reviewer
- cortar con error si no se llega a 3 revisores

- [ ] **Step 4: Ejecutar el test focalizado y ajustar hasta tener el algoritmo estable**

Run: `npm test -- --runInBand tests/ReviewerAssigner.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ReviewAssignment.js src/ReviewerQuota.js src/ReviewerAssigner.js tests/ReviewerAssigner.test.js
git commit -m "feat: extract reviewer assignment algorithm"
```

### Task 4: Integrar asignacion y avance de etapa en `Session`

**Files:**
- Modify: `src/Session.js`
- Create: `tests/SessionAssignment.test.js`
- Modify: `tests/Session.test.js`

- [ ] **Step 1: Escribir tests de integracion de `Session` con el asignador**

Crear `tests/SessionAssignment.test.js` con estos casos:

```js
it("should move from bidding to reviewing and assign exactly three reviewers per paper", function shouldAssignThreeReviewersPerPaper() {
    session.closeSubmissions();
    registerBidsForHappyPath(session, papers, reviewers);

    session.closeBidding();

    expect(session.stage()).toBe("Reviewing");
    expect(session.assignedReviewersFor(papers[0])).toHaveLength(3);
    expect(session.assignedReviewersFor(papers[1])).toHaveLength(3);
});

it("should expose whether a reviewer is assigned to a paper", function shouldExposeAssignmentQueries() {
    session.closeSubmissions();
    registerBidsForHappyPath(session, papers, reviewers);

    session.closeBidding();

    expect(session.isReviewerAssignedTo(papers[0], reviewers[0])).toBe(true);
});

it("should keep the session in bidding when assignment is impossible", function shouldNotAdvanceOnImpossibleAssignment() {
    session.closeSubmissions();
    registerImpossibleBids(session, papers, reviewers);

    function closeBidding() {
        session.closeBidding();
    }

    expect(closeBidding).toThrow("Cannot assign 3 reviewers to every paper");
    expect(session.stage()).toBe("Bidding");
});
```

- [ ] **Step 2: Ejecutar el test para confirmar los metodos faltantes**

Run: `npm test -- --runInBand tests/SessionAssignment.test.js`
Expected: falla por `closeBidding`, `assignedReviewersFor` o `isReviewerAssignedTo` inexistentes

- [ ] **Step 3: Implementar la integracion minima en `src/Session.js`**

Objetivo:

```js
constructor() {
    this._name = "";
    this._programCommittee = [];
    this._papers = [];
    this._bids = [];
    this._assignments = [];
    this._acceptedPapers = [];
    this._stage = "Receiving";
    this._acceptancePercentage = 0;
}

closeBidding() {
    this.assertStage("Bidding");

    const assigner = new ReviewerAssigner();
    const assignments = assigner.assign(this._papers, this._programCommittee, this._bids);

    this._assignments = assignments;
    this._stage = "Reviewing";
}

assignedReviewersFor(paper) {
    const assignedReviewers = [];

    for (const assignment of this._assignments) {
        if (assignment.paper() === paper) {
            assignedReviewers.push(assignment.reviewer());
        }
    }

    return assignedReviewers;
}

isReviewerAssignedTo(paper, reviewer) {
    for (const assignment of this._assignments) {
        if (assignment.matches(paper, reviewer)) {
            return true;
        }
    }

    return false;
}
```

Agregar tambien un helper `assertStage(expectedStage)` para reutilizar guardas de flujo sin duplicacion.

- [ ] **Step 4: Ejecutar tests focalizados y luego baseline completa**

Run: `npm test -- --runInBand tests/SessionAssignment.test.js tests/Session.test.js`
Expected: PASS

Run: `npm test -- --runInBand`
Expected: todo verde

- [ ] **Step 5: Commit**

```bash
git add src/Session.js tests/SessionAssignment.test.js tests/Session.test.js
git commit -m "feat: integrate reviewer assignment into session workflow"
```

### Task 5: Habilitar carga de revisiones solo para revisores asignados

**Files:**
- Modify: `src/Session.js`
- Create: `tests/SessionReviewing.test.js`
- Modify: `src/Paper.js`

- [ ] **Step 1: Escribir tests de la etapa `Reviewing`**

Crear `tests/SessionReviewing.test.js` con estos casos:

```js
it("should allow an assigned reviewer to submit a review during reviewing", function shouldAllowAssignedReviewSubmission() {
    moveSessionToReviewingWithAssignments(session, papers, reviewers);

    session.submitReview(papers[0], reviewers[0], "Clear contribution", 2);

    expect(papers[0].reviews()).toHaveLength(1);
    expect(papers[0].score()).toBe(2);
});

it("should reject reviews from non assigned reviewers", function shouldRejectNonAssignedReviewers() {
    moveSessionToReviewingWithAssignments(session, papers, reviewers);

    function submitUnassignedReview() {
        session.submitReview(papers[0], externalReviewer, "I was not assigned", 1);
    }

    expect(submitUnassignedReview).toThrow("Reviewer is not assigned to this paper");
});

it("should reject reviews outside reviewing stage", function shouldRejectReviewOutsideStage() {
    function submitReviewTooEarly() {
        session.submitReview(papers[0], reviewers[0], "Too early", 1);
    }

    expect(submitReviewTooEarly).toThrow("Session must be at stage Reviewing");
});

it("should not allow the same assigned reviewer to review twice", function shouldRejectDuplicateAssignedReview() {
    moveSessionToReviewingWithAssignments(session, papers, reviewers);
    session.submitReview(papers[0], reviewers[0], "First review", 1);

    function duplicateReview() {
        session.submitReview(papers[0], reviewers[0], "Second review", 0);
    }

    expect(duplicateReview).toThrow("Reviewer already reviewed this paper");
});

it("should not close reviewing until every paper has three reviews", function shouldBlockSelectionUntilReviewsAreComplete() {
    moveSessionToReviewingWithAssignments(session, papers, reviewers);
    submitOnlyPartOfTheRequiredReviews(session, papers, reviewers);

    function closeReviewing() {
        session.closeReviewing();
    }

    expect(closeReviewing).toThrow("Cannot close reviewing before all assigned reviews are submitted");
});
```

- [ ] **Step 2: Ejecutar el test focalizado**

Run: `npm test -- --runInBand tests/SessionReviewing.test.js`
Expected: falla por `submitReview` o `closeReviewing` inexistentes

- [ ] **Step 3: Implementar la minima logica de autorizacion y cierre**

Objetivo en `src/Session.js`:

```js
submitReview(paper, reviewer, text, score) {
    this.assertStage("Reviewing");

    if (!this.isReviewerAssignedTo(paper, reviewer)) {
        throw new Error("Reviewer is not assigned to this paper");
    }

    paper.addReview(reviewer, text, score);
}

closeReviewing() {
    this.assertStage("Reviewing");

    if (!this.allReviewsSubmitted()) {
        throw new Error("Cannot close reviewing before all assigned reviews are submitted");
    }

    this._stage = "Selection";
}

allReviewsSubmitted() {
    for (const paper of this._papers) {
        if (paper.reviewsCount() !== 3) {
            return false;
        }
    }

    return true;
}
```

Si en la practica hace falta un control mas preciso que `reviewsCount() === 3`, agregar un helper `assignedReviewCountFor(paper)` y compararlo con la cantidad de asignaciones reales del paper.

- [ ] **Step 4: Ejecutar tests focalizados y luego suite completa**

Run: `npm test -- --runInBand tests/SessionReviewing.test.js`
Expected: PASS

Run: `npm test -- --runInBand`
Expected: todo verde

- [ ] **Step 5: Commit**

```bash
git add src/Session.js src/Paper.js tests/SessionReviewing.test.js
git commit -m "feat: allow assigned reviewers to submit reviews"
```

### Task 6: Implementar seleccion por corte fijo con desempate deterministico

**Files:**
- Create: `src/FixedAcceptanceSelector.js`
- Create: `tests/SessionSelection.test.js`
- Modify: `src/Session.js`

- [ ] **Step 1: Escribir tests de seleccion**

Crear `tests/SessionSelection.test.js` con estos casos:

```js
it("should accept the top scoring papers up to the configured percentage", function shouldAcceptTopScoringPapers() {
    moveSessionToSelection(session, fourPapers);
    session.setAcceptancePercentage(50);

    const acceptedPapers = session.selectAcceptedPapers();

    expect(acceptedPapers).toHaveLength(2);
    expect(acceptedPapers).toEqual([fourPapers[1], fourPapers[0]]);
});

it("should use floor so the acceptance ratio is never exceeded", function shouldUseFloorOnAcceptanceCutoff() {
    moveSessionToSelection(session, threePapers);
    session.setAcceptancePercentage(50);

    const acceptedPapers = session.selectAcceptedPapers();

    expect(acceptedPapers).toHaveLength(1);
});

it("should preserve submission order when scores tie", function shouldPreserveSubmissionOrderOnTie() {
    moveSessionToSelection(session, papersWithSameScore);
    session.setAcceptancePercentage(50);

    const acceptedPapers = session.selectAcceptedPapers();

    expect(acceptedPapers[0]).toBe(firstSubmittedPaper);
});

it("should reject selection outside selection stage", function shouldRejectSelectionOutsideStage() {
    function selectTooEarly() {
        session.selectAcceptedPapers();
    }

    expect(selectTooEarly).toThrow("Session must be at stage Selection");
});
```

Agregar tambien un test de validacion de porcentaje:

```js
it("should reject invalid acceptance percentages", function shouldRejectInvalidPercentage() {
    function setInvalidPercentage() {
        session.setAcceptancePercentage(120);
    }

    expect(setInvalidPercentage).toThrow("Acceptance percentage must be between 0 and 100");
});
```

- [ ] **Step 2: Ejecutar el test focalizado**

Run: `npm test -- --runInBand tests/SessionSelection.test.js`
Expected: falla por `setAcceptancePercentage`, `selectAcceptedPapers` o modulo selector inexistente

- [ ] **Step 3: Implementar el selector y la integracion con `Session`**

Objetivo de `src/FixedAcceptanceSelector.js`:

```js
class FixedAcceptanceSelector {
    select(papers, percentage) {
        const orderedPapers = this.orderByScoreAndSubmissionOrder(papers);
        const acceptedCount = Math.floor((orderedPapers.length * percentage) / 100);

        return orderedPapers.slice(0, acceptedCount);
    }
}
```

Objetivo de `src/Session.js`:

```js
setAcceptancePercentage(percentage) {
    if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
        throw new Error("Acceptance percentage must be between 0 and 100");
    }

    this._acceptancePercentage = percentage;
}

selectAcceptedPapers() {
    this.assertStage("Selection");

    const selector = new FixedAcceptanceSelector();
    this._acceptedPapers = selector.select(this._papers, this._acceptancePercentage);

    return this._acceptedPapers;
}

acceptedPapers() {
    return this._acceptedPapers;
}
```

La parte no trivial es `orderByScoreAndSubmissionOrder(papers)`: debe ser estable y sin callbacks anonimos nuevos. Si `sort` complica el estilo, resolverlo con insercion ordenada y un helper con nombre.

- [ ] **Step 4: Ejecutar tests focalizados y luego suite completa**

Run: `npm test -- --runInBand tests/SessionSelection.test.js`
Expected: PASS

Run: `npm test -- --runInBand`
Expected: todo verde

- [ ] **Step 5: Commit**

```bash
git add src/FixedAcceptanceSelector.js src/Session.js tests/SessionSelection.test.js
git commit -m "feat: implement fixed cutoff paper selection"
```

### Task 7: Cerrar con workflow completo, cobertura y chequeos finales

**Files:**
- Create: `tests/SessionWorkflow.test.js`
- Modify: `src/Session.js` si aparece algun hueco menor

- [ ] **Step 1: Escribir un test end-to-end del flujo principal**

Crear `tests/SessionWorkflow.test.js` con un escenario que cubra:
- dos tipos de paper (`RegularPaper` y `Poster`)
- bids mixtos (`Interested`, `Maybe`, ausencia de bid, `NotInterested`)
- conflicto de interes por autoria
- tres reviews por paper
- seleccion final con porcentaje configurado y un ranking final conocido de antemano

Base sugerida:

```js
it("should complete the full session workflow from receiving to selection", function shouldCompleteFullWorkflow() {
    const session = buildConferenceSessionWithReviewers();
    const papers = submitValidPapers(session);

    session.closeSubmissions();
    registerMixedBids(session, papers);
    session.closeBidding();

    submitAllAssignedReviews(session, papers);
    session.closeReviewing();
    session.setAcceptancePercentage(50);

    const acceptedPapers = session.selectAcceptedPapers();

    expect(session.stage()).toBe("Selection");
    expect(acceptedPapers).toHaveLength(1);
    expect(acceptedPapers[0]).toBe(papers[0]);
});
```

- [ ] **Step 2: Ejecutar workflow, suite completa y cobertura**

Run: `npm test -- --runInBand tests/SessionWorkflow.test.js`
Expected: PASS

Run: `npm test -- --runInBand`
Expected: todas las suites en verde

Run: `npm test -- --coverage --runInBand`
Expected:
- cobertura global `>= 80%`
- cobertura de `Session.js`, `ReviewerAssigner.js` y `FixedAcceptanceSelector.js` razonablemente alta

- [ ] **Step 3: Hacer el ajuste minimo que aparezca por huecos de integracion**

Solo si falla algo real:
- corregir mensajes de error inconsistentes
- completar un helper faltante
- evitar duplicacion menor surgida entre tests y `Session`

No abrir refactors grandes en este punto.

- [ ] **Step 4: Commit**

```bash
git add src tests
git commit -m "test: cover full conference workflow and validate coverage"
```

## Opcional si queda tiempo

- Soportar `Interests.Conflict` como bid explicito y tratarlo igual que autoria al asignar.
- Agregar tests especificos para el caso "reviewer sin bid pero con cuota disponible" para dejar fija la interpretacion de ausencia de bid.
- Separar constantes de etapas (`Receiving`, `Bidding`, `Reviewing`, `Selection`) en un modulo propio si `Session.js` empieza a crecer mas de lo deseable.

## Criterios de aceptacion del desarrollo

1. Los tests originales siguen en verde.
2. Cada paper queda con exactamente 3 revisores asignados o la asignacion falla atomica y explicitamente.
3. Ningun autor queda asignado a revisar su propio paper.
4. Solo revisores asignados pueden cargar una revision, y cada uno solo una vez por paper.
5. Los scores de `Review` quedan validados entre `-3` y `3`, enteros.
6. La seleccion acepta el maximo permitido sin exceder el porcentaje configurado.
7. La suite completa y la cobertura quedan en verde al finalizar.

## Fuera de esta etapa, pero necesario para la entrega final

- Volcar las decisiones 4, 5, 7 y 8 de este plan al futuro documento de decisiones.
- Actualizar el diagrama de clases con `ReviewAssignment`, `ReviewerQuota`, `ReviewerAssigner`, `FixedAcceptanceSelector` y los nuevos metodos de `Session`/`Paper`.
- Revisar la historia de commits para que muestre contribucion trazable del equipo.
