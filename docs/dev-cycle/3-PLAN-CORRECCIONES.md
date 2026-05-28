# Plan TDD para corregir errores técnicos de ComfyChair Parte 1

## Resumen

Corregir los 3 errores conceptuales señalados sin ampliar el alcance: proteger la máquina de estados de `Session`, hacer explícito el caso de bid inexistente en `interestFor()`, y desacoplar el cierre de revisión del número mágico `3`.

Trabajaría en una rama nueva desde `main`, por ejemplo `fix/feedback-tecnico-parte-1`, dejando fuera el `package-lock.json` no trackeado que hoy aparece en el workspace.

## Cambios de API y diseño

- `Session.setStage()` deja de ser API pública.
  - Implementar como método privado `#setStage(stage)`.
  - Mantener como públicas solo las transiciones de dominio: `closeSubmissions()`, `closeBidding()`, `closeReviewing()`.

- `Session.interestFor(paper, reviewer)` conserva su API, pero si no existe bid explícito debe lanzar:
  - `"No bid found for paper and reviewer"`
  - No devolver `NotInterested`, porque eso rompería la decisión documentada de distinguir “sin bid” de `NotInterested`.

- `Session.allReviewsSubmitted()` debe verificar revisiones contra `this._assignments`.
  - Para cada asignación `(paper, reviewer)`, el `paper` debe tener una review de ese reviewer.
  - Usar `paper.hasReviewFrom(reviewer)`.
  - No depender de `paper.reviewsCount() === 3`.

## Secuencia de commits TDD

### Commit 1: proteger la máquina de estados

Mensaje sugerido:

```bash
git commit -m "refactor: keep session stage transitions internal"
```

TDD:

1. Agregar en `tests/Session.test.js`:

```js
it("should not expose a public stage mutator", function shouldNotExposePublicStageMutator() {
    expect(asse.setStage).toBeUndefined();
});
```

2. Ejecutar test focalizado:

```bash
npm test -- --runInBand tests/Session.test.js
```

Resultado esperado RED: falla porque `setStage` existe.

3. Implementar en `src/Session.js`:
   - Reemplazar `setStage(stage)` por `#setStage(stage)`.
   - Cambiar `closeSubmissions()` para llamar `this.#setStage("Bidding")`.
   - Cambiar asignaciones directas de `_stage` en transiciones internas por `this.#setStage(...)`.

4. Ejecutar:

```bash
npm test -- --runInBand tests/Session.test.js
npm test -- --runInBand
```

Resultado esperado GREEN: 51 tests pasan.

### Commit 2: hacer explícito el bid inexistente

Mensaje sugerido:

```bash
git commit -m "fix: report missing bid interest explicitly"
```

TDD:

1. Agregar en `tests/Session.test.js`:

```js
it("should fail with a descriptive error when querying missing bid interest", function shouldFailForMissingBidInterest() {
    asse.closeSubmissions();

    function queryMissingInterest() {
        asse.interestFor(paper01, matias);
    }

    expect(queryMissingInterest).toThrow("No bid found for paper and reviewer");
});
```

2. Ejecutar:

```bash
npm test -- --runInBand tests/Session.test.js
```

Resultado esperado RED: falla por `TypeError`.

3. Implementar en `src/Session.js`:

```js
interestFor(paper, reviewer){
    const bid = this.bidFor(paper, reviewer);

    if (typeof(bid) === "undefined") {
        throw new Error("No bid found for paper and reviewer");
    }

    return bid.interest();
}
```

4. Ejecutar suite focalizada y completa.

### Commit 3: cerrar reviewing solo con reviews asignadas

Mensaje sugerido:

```bash
git commit -m "fix: require reviews from assigned reviewers"
```

TDD:

1. Agregar en `tests/SessionReviewing.test.js` un caso que cargue reviews directamente en los papers desde usuarios no asignados y verifique que `closeReviewing()` no lo acepte.

```js
function addThreeDirectReviewsFromUnassignedReviewers(targetPapers) {
    for (const paper of targetPapers) {
        paper.addReview(new User("unassigned-1", "UNLP", "u1@unlp.edu", "123"), "Direct review", 1);
        paper.addReview(new User("unassigned-2", "UNLP", "u2@unlp.edu", "123"), "Direct review", 1);
        paper.addReview(new User("unassigned-3", "UNLP", "u3@unlp.edu", "123"), "Direct review", 1);
    }
}

it("should not close reviewing when reviews were not submitted by assigned reviewers", function shouldRequireAssignedReviewerReviews() {
    moveSessionToReviewingWithAssignments(session, papers, reviewers);
    addThreeDirectReviewsFromUnassignedReviewers(papers);

    function closeReviewing() {
        session.closeReviewing();
    }

    expect(closeReviewing).toThrow("Cannot close reviewing before all assigned reviews are submitted");
});
```

2. Ejecutar:

```bash
npm test -- --runInBand tests/SessionReviewing.test.js
```

Resultado esperado RED: hoy `closeReviewing()` permite avanzar porque solo cuenta 3 reviews por paper.

3. Refactor mínimo en `src/Session.js`:

```js
allReviewsSubmitted(){
    for (const paper of this._papers) {
        if (!this.allAssignedReviewsSubmittedFor(paper)) {
            return false;
        }
    }

    return true;
}

allAssignedReviewsSubmittedFor(paper){
    const assignedReviewers = this.assignedReviewersFor(paper);

    for (const reviewer of assignedReviewers) {
        if (!paper.hasReviewFrom(reviewer)) {
            return false;
        }
    }

    return true;
}
```

4. Ejecutar:

```bash
npm test -- --runInBand tests/SessionReviewing.test.js
npm test -- --runInBand
```

Resultado esperado GREEN: 53 tests pasan.

## Oportunidades de mejora

- `quotasByRemainingCapacity`: posponer. Optimizarlo ahora agrega riesgo sobre el orden determinista de asignación y no hay un problema de performance real para el TP.
- Duplicación `Session.bidFor()` / `ReviewerAssigner.bidFor()`: posponer. Es una duplicación chica; una abstracción compartida podría ser más pesada que el problema.
- `Paper.isValid()`: no requiere acción en este estado del repo; `src/Paper.js` ya define `isValid()`.

## Verificación final

- Ejecutar suite completa:

```bash
npm test -- --runInBand
```

- Confirmar que no se agregó `package-lock.json` al commit salvo decisión explícita.
- Revisar historial esperado:
  - 3 commits chicos.
  - Cada uno contiene test rojo + cambio mínimo.
  - No mezcla oportunidades de mejora ni limpieza de proceso con los errores técnicos.
