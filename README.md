# ComfyChair

Sistema para organizar conferencias científicas: envío, revisión y selección de artículos.

Este repositorio contiene la solución completa de la Parte 1 del Trabajo Práctico de Técnicas y Herramientas de Ingeniería de Software (Maestría en IS - UNLP, 2026).

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Instalación

```bash
npm install
```

## Ejecución de tests

Comando general:

```bash
npm test
```

En algunos entornos Windows puede aparecer `spawn EPERM` con Jest al usar procesos hijos. Si pasa eso, ejecutar en modo secuencial:

```bash
npx jest --runInBand
```

Estado validado localmente en este repositorio:

- **11 suites OK**
- **50 tests OK**
- Cobertura global de código superior al **90%**.

## Estructura del proyecto

```text
src/
  User.js                     # Registro y representación de usuarios
  Conference.js               # Conferencia general
  Session.js                  # Agregado raíz del track y orquestador del flujo
  Paper.js                    # Clase base de artículo (validaciones y reviews)
  RegularPaper.js             # Artículo regular (valida abstract < 300 palabras)
  Poster.js                   # Artículo tipo Poster
  Review.js                   # Evaluación individual de un revisor
  Bid.js                      # Expresión de interés y enum de Interests (Symbol)
  ReviewAssignment.js        # Asociación inmutable de asignación
  ReviewerQuota.js           # Cuota/capacidad laboral de revisores
  ReviewerAssigner.js        # Algoritmo de asignación equitativo por prioridades
  FixedAcceptanceSelector.js # Algoritmo de selección por corte fijo porcentual
tests/
  Bid.test.js
  Paper.test.js
  Poster.test.js
  RegularPaper.test.js
  Review.test.js
  ReviewerAssigner.test.js
  Session.test.js
  SessionAssignment.test.js
  SessionReviewing.test.js
  SessionSelection.test.js
  SessionWorkflow.test.js
ENUNCIADO.md                  # Enunciado original de la Parte 1
PLAN.md                       # Plan de implementación original
DOCUMENTACION_TECNICA.md      # Documentación técnica completa (con diagrama de clases)
DECISIONES.md                 # Decisiones de diseño y resolución de ambigüedades
```

## Modelo de dominio implementado

- `User`: representa un usuario registrado (nombre, afiliación, email, password hasheada SHA-256 en base64).
- `Conference`: contiene nombre, chairs y sesiones.
- `Paper`: clase base de artículo con título, autores, autor corresponsal, revisiones y score promedio.
- `RegularPaper`: extiende `Paper`, agrega abstract y valida máximo 300 palabras.
- `Poster`: extiende `Paper`, agrega URL de adjunto principal y URL de fuentes.
- `Review`: guarda revisor, texto y puntaje (entre -3 y +3).
- `Bid`: expresa interés de un revisor por un paper (`Interested`, `Maybe`, `NotInterested`, `Conflict`).
- `ReviewAssignment`: registra la asignación de un revisor a un paper.
- `ReviewerQuota`: rastrea y gestiona la carga de revisiones asignada a cada revisor.
- `ReviewerAssigner`: encapsula el algoritmo de asignación de revisores.
- `FixedAcceptanceSelector`: realiza el filtrado de aceptación por corte fijo.
- `Session`: coordina el flujo de etapas y gestiona envíos, bids, asignaciones y selección.

## Flujo de `Session` implementado

El flujo transiciona de forma secuencial y manual a través de las siguientes etapas:

1. `Receiving`: los autores pueden enviar artículos (`submit`) válidos (`paper.isValid()`).
2. `Bidding`: se ingresa tras llamar a `closeSubmissions()`. Los revisores registran o actualizan sus intereses (`enterBid`). No se aceptan nuevos artículos.
3. `Reviewing`: se ingresa con `closeBidding()`, ejecutando automáticamente el algoritmo de asignación de 3 revisores por artículo (evitando conflictos de interés). Los revisores asignados suben su evaluación mediante `submitReview`.
4. `Selection`: se ingresa mediante `closeReviewing()` cuando todos los artículos tienen sus 3 revisiones completas. Se establece el porcentaje máximo mediante `setAcceptancePercentage()` y se realiza el corte fijo a través de `selectAcceptedPapers()`.

## Convenciones del trabajo

- Orientación a objetos como estilo principal.
- No utilizar lambdas ni funciones anónimas en el código de producción.
- Acompañar cada funcionalidad con pruebas unitarias exhaustivas.
- Registrar decisiones de diseño en el documento correspondiente.

## Documentos clave

- Especificación completa del enunciado: [`ENUNCIADO.md`](./ENUNCIADO.md)
- Planificación de la implementación: [`PLAN.md`](./PLAN.md)
- Documentación técnica y diagramas de clases: [`DOCUMENTACION_TECNICA.md`](./DOCUMENTACION_TECNICA.md)
- Decisiones de diseño y ambigüedades resueltas: [`DECISIONES.md`](./DECISIONES.md)
