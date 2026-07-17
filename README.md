# ComfyChair

Sistema para organizar conferencias científicas: envío, revisión y selección de artículos.

Este repositorio contiene la solución completa de las Partes 1 y 2 del Trabajo Práctico de Técnicas y Herramientas de Ingeniería de Software (Maestría en IS - UNLP, 2026).

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

- **17 suites OK**
- **113 tests OK**
- Cobertura global de código superior al **90%**.

## Demo en vivo

Se incluye un script en la raíz del proyecto, [`demo.js`](./demo.js), que arma una conferencia de ejemplo con datos aleatorios y recorre el flujo completo de una `Session`:

1. crea conferencia, chairs y comité de programa,
2. genera papers regulares y posters,
3. actualiza un paper antes del cierre de recepción mediante `Session.updatePaper`,
4. cierra la recepción y muestra que las correcciones posteriores al deadline son rechazadas por la etapa actual,
5. carga bids,
6. asigna revisores,
7. envía revisiones,
8. ejecuta la selección final con tres políticas: porcentaje fijo, cupo fijo y score mínimo.

Durante la corrida imprime en consola un paso a paso humano de los métodos involucrados, las transiciones de etapa (`Receiving`, `Bidding`, `Reviewing`, `Selection`) y un resumen final con los resultados de cada política de aceptación.

Para correrlo:

```bash
node demo.js
```

O, si preferís dejarlo en `npm`:

```bash
npm run demo
```

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
  AcceptancePolicy.js        # Contrato base para políticas de aceptación
  FixedAcceptanceSelector.js # Política de selección por corte fijo porcentual
  AcceptanceByCount.js       # Política de selección por cantidad máxima
  AcceptanceByScoreThreshold.js # Política de selección por score mínimo
  stages/                    # Estados del flujo de una Session
    ReceivingStage.js
    BiddingStage.js
    ReviewingStage.js
    SelectionStage.js
    SessionStage.js
tests/
  AcceptanceByCount.test.js
  AcceptanceByScoreThreshold.test.js
  Bid.test.js
  Demo.test.js
  FixedAcceptanceSelector.test.js
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
ENUNCIADO_TP1.md              # Enunciado original de la Parte 1
ENUNCIADO_TP2.md              # Enunciado de la Parte 2
docs/DOCUMENTACION_TECNICA.md # Documentación técnica completa
docs/DECISIONES.md            # Decisiones de diseño y resolución de ambigüedades
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
- `AcceptancePolicy`: define el contrato común para políticas de aceptación.
- `FixedAcceptanceSelector`: selecciona por porcentaje fijo y mantiene compatibilidad con `setAcceptancePercentage`.
- `AcceptanceByCount`: selecciona los mejores papers hasta una cantidad máxima.
- `AcceptanceByScoreThreshold`: selecciona todos los papers con score mayor o igual al umbral configurado.
- `Session`: coordina el flujo de etapas y gestiona envíos, actualizaciones, bids, asignaciones, revisiones y selección.

## Flujo de `Session` implementado

El flujo transiciona de forma secuencial y manual a través de las siguientes etapas:

1. `Receiving`: los autores pueden enviar artículos (`submit`) válidos (`paper.isValid()`) y actualizar papers ya enviados con `updatePaper` antes del cierre.
2. `Bidding`: se ingresa tras llamar a `closeSubmissions()` cuando existe al menos un paper. Los revisores registran o actualizan sus intereses (`enterBid`). No se aceptan nuevos artículos.
3. `Reviewing`: se ingresa con `closeBidding()` cuando existe al menos un paper, ejecutando automáticamente el algoritmo de asignación de 3 revisores por artículo (evitando conflictos de interés). Los revisores asignados suben su evaluación mediante `submitReview`.
4. `Selection`: se ingresa mediante `closeReviewing()` cuando todos los artículos tienen sus 3 revisiones completas. Se configura la política con `setAcceptancePolicy()` o, por compatibilidad, con `setAcceptancePercentage()`, y se obtienen los aceptados con `selectAcceptedPapers()`.

## Convenciones del trabajo

- Orientación a objetos como estilo principal.
- No utilizar lambdas ni funciones anónimas en el código de producción.
- Acompañar cada funcionalidad con pruebas unitarias exhaustivas.
- Registrar decisiones de diseño en el documento correspondiente.

## Documentos clave

- Enunciado de la Parte 1: [`ENUNCIADO_TP1.md`](./ENUNCIADO_TP1.md)
- Enunciado de la Parte 2: [`ENUNCIADO_TP2.md`](./ENUNCIADO_TP2.md)
- Documentación técnica y diagramas de clases: [`docs/DOCUMENTACION_TECNICA.md`](./docs/DOCUMENTACION_TECNICA.md)
- Decisiones de diseño y ambigüedades resueltas: [`docs/DECISIONES.md`](./docs/DECISIONES.md)
