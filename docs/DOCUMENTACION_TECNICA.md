# ComfyChair - Documentacion tecnica del proyecto

Este documento describe la arquitectura actual del sistema ComfyChair en la Parte 2.

## 1. Proposito

ComfyChair modela la gestion de articulos de una conferencia cientifica. En esta version, el flujo completo de una sesion se organiza con objetos State y la seleccion final se resuelve con politicas intercambiables.

## 2. Estructura del repositorio

```text
src/
  AcceptancePolicy.js
  AcceptanceByCount.js
  AcceptanceByScoreThreshold.js
  Bid.js
  Conference.js
  FixedAcceptanceSelector.js
  Paper.js
  Poster.js
  RegularPaper.js
  Review.js
  ReviewAssignment.js
  ReviewerAssigner.js
  ReviewerQuota.js
  Session.js
  User.js
  stages/
    SessionStage.js
    ReceivingStage.js
    BiddingStage.js
    ReviewingStage.js
    SelectionStage.js
tests/
  AcceptanceByCount.test.js
  AcceptanceByScoreThreshold.test.js
  Bid.test.js
  Paper.test.js
  Poster.test.js
  RegularPaper.test.js
  Review.test.js
  ReviewerAssigner.test.js
  Session.test.js
  SessionAssignment.test.js
  SessionPaperUpdate.test.js
  SessionReviewing.test.js
  SessionSelection.test.js
  SessionStages.test.js
  SessionWorkflow.test.js
README.md
ENUNCIADO_TP1.md
ENUNCIADO_TP2.md
```

## 3. Diagrama de clases

```mermaid
classDiagram
    class User {
        +fullName: String
        +affiliation: String
        +email: String
        +encryptedPassword: String
        +getEncryptedPassword() String
    }

    class Conference {
        -_name: String
        -_chairs: User[]
        -_sessions: Session[]
        +name() String
        +chairs() User[]
        +sessions() Session[]
        +addChair(user: User)
        +addSession(session: Session)
    }

    class Session {
        -_name: String
        -_programCommittee: User[]
        -_papers: Paper[]
        -_bids: Bid[]
        -_assignments: ReviewAssignment[]
        -_acceptedPapers: Paper[]
        -_stage: SessionStage
        -_acceptancePolicy: AcceptancePolicy
        +name() String
        +programCommittee() User[]
        +reviewers() User[]
        +addReviewer(user: User)
        +canSubmit(paper: Paper) Boolean
        +submit(paper: Paper)
        +updatePaper(paper: Paper, author: User, candidatePaper: Paper)
        +papers() Paper[]
        +bids() Bid[]
        +stage() String
        +closeSubmissions()
        +enterBid(paper: Paper, reviewer: User, interest: Symbol)
        +closeBidding()
        +assignedReviewersFor(paper: Paper) User[]
        +isReviewerAssignedTo(paper: Paper, reviewer: User) Boolean
        +submitReview(paper: Paper, reviewer: User, text: String, score: Number)
        +closeReviewing()
        +setAcceptancePolicy(policy: AcceptancePolicy)
        +setAcceptancePercentage(percentage: Number)
        +acceptancePolicy() AcceptancePolicy
        +selectAcceptedPapers() Paper[]
        +acceptedPapers() Paper[]
        +interestFor(paper: Paper, reviewer: User) Symbol
        -_transitionTo(stage: SessionStage)
        -_addPaper(paper: Paper)
        -_containsPaper(paper: Paper) Boolean
        -_addBid(bid: Bid)
        -_replaceAssignments(assignments: ReviewAssignment[])
        -_replaceAcceptedPapers(papers: Paper[])
    }

    class SessionStage {
        -_name: String
        +name() String
        +canSubmit(paper: Paper) Boolean
        +reject(operation: String)
        +submit(session: Session, paper: Paper)
        +updatePaper(session: Session, paper: Paper, author: User, candidatePaper: Paper)
        +closeSubmissions(session: Session)
        +enterBid(session: Session, paper: Paper, reviewer: User, interest: Symbol)
        +closeBidding(session: Session)
        +submitReview(session: Session, paper: Paper, reviewer: User, text: String, score: Number)
        +closeReviewing(session: Session)
        +selectAcceptedPapers(session: Session)
        +acceptedPapers(session: Session)
    }

    class ReceivingStage
    class BiddingStage
    class ReviewingStage
    class SelectionStage

    class AcceptancePolicy {
        +select(papers: Paper[]) Paper[]
        +orderByScoreAndSubmissionOrder(papers: Paper[]) Paper[]
        +insertPaperByScore(orderedPapers: Paper[], paper: Paper)
    }

    class FixedAcceptanceSelector {
        -_percentage: Number
        +select(papers: Paper[]) Paper[]
    }

    class AcceptanceByCount {
        -_maximumCount: Number
        +select(papers: Paper[]) Paper[]
    }

    class AcceptanceByScoreThreshold {
        -_minimumScore: Number
        +select(papers: Paper[]) Paper[]
    }

    class Paper {
        #_title: String
        #_authors: User[]
        #_correspondingAuthor: User
        #_reviews: Review[]
        +title() String
        +reviews() Review[]
        +authors() User[]
        +correspondingAuthor() User
        +hasAuthor(user: User) Boolean
        +isValid() Boolean
        +hasReviewFrom(reviewer: User) Boolean
        +addReview(reviewer: User, review: String, score: Number)
        +reviewsCount() Number
        +score() Number
        +updateFrom(candidatePaper: Paper)
    }

    class RegularPaper {
        -_abstract: String
        +abstract() String
        +setAbstract(abstract: String)
        +abstractWordCount() Number
        +isValid() Boolean
    }

    class Poster {
        -_attachmentUrl: String
        -_sourcesUrl: String
        +attachmentUrl() String
        +sourcesUrl() String
    }

    class Review {
        -_reviewer: User
        -_text: String
        -_score: Number
        +reviewer() User
        +text() String
        +score() Number
    }

    class Bid {
        -_paper: Paper
        -_reviewer: User
        -_interest: Symbol
        +paper() Paper
        +reviewer() User
        +interest() Symbol
        +setInterest(interest: Symbol)
    }

    class ReviewAssignment {
        -_paper: Paper
        -_reviewer: User
        +paper() Paper
        +reviewer() User
        +matches(paper: Paper, reviewer: User) Boolean
    }

    class ReviewerQuota {
        -_reviewer: User
        -_capacity: Number
        -_remaining: Number
        +reviewer() User
        +remaining() Number
        +hasCapacity() Boolean
        +consume()
    }

    class ReviewerAssigner {
        +buildQuotas(reviewers: User[], paperCount: Number) ReviewerQuota[]
        +assign(papers: Paper[], reviewers: User[], bids: Bid[]) ReviewAssignment[]
    }

    Paper <|-- RegularPaper
    Paper <|-- Poster
    Session o--> SessionStage
    SessionStage <|-- ReceivingStage
    SessionStage <|-- BiddingStage
    SessionStage <|-- ReviewingStage
    SessionStage <|-- SelectionStage
    AcceptancePolicy <|-- FixedAcceptanceSelector
    AcceptancePolicy <|-- AcceptanceByCount
    AcceptancePolicy <|-- AcceptanceByScoreThreshold
    Conference *--> Session : contains
    Session *--> Paper : papers
    Session *--> Bid : bids
    Session *--> ReviewAssignment : assignments
    Session o--> Paper : acceptedPapers
    Paper *--> Review : reviews
    Review o--> User : reviewer
    Bid o--> Paper : paper
    Bid o--> User : reviewer
    ReviewAssignment o--> Paper : paper
    ReviewAssignment o--> User : reviewer
    Session ..> ReviewerAssigner : uses
    Session ..> AcceptancePolicy : uses
```

## 4. Resumen de responsabilidad de clases

- `Session` coordina el flujo y delega el comportamiento variable en `SessionStage`.
- `ReceivingStage`, `BiddingStage`, `ReviewingStage` y `SelectionStage` encapsulan las reglas de cada etapa.
- `AcceptancePolicy` define la interfaz comun de seleccion.
- `FixedAcceptanceSelector`, `AcceptanceByCount` y `AcceptanceByScoreThreshold` implementan politicas intercambiables.
- `ReviewerAssigner` sigue manejando la asignacion equitativa de revisores.
- `Paper`, `RegularPaper` y `Poster` conservan las invariantes del dominio.

## 5. Cobertura funcional

Las suites de tests cubren:
- actualizacion de papers durante recepcion,
- transiciones validas e invalidas entre etapas,
- asignacion y revision de papers,
- seleccion por porcentaje, por cantidad y por umbral,
- aislamiento entre politicas de distintas sesiones.
