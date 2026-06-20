# ComfyChair — Trabajo Práctico, Parte 1
**Técnicas y Herramientas de Ingeniería de Software · Maestría · 2026**

---

## 1. Introducción

Se quiere desarrollar un sistema llamado ComfyChair para organizar conferencias científicas, particularmente el proceso de envío y revisión de artículos.

El sistema permite crear conferencias, cada una con sus chairs (organizadores) y su comité de programa (grupo de revisores). También estarán los autores de los artículos. Todos ellos —chairs, revisores y autores— son usuarios registrados en ComfyChair con la misma información: pueden ocupar diferentes roles en distintas conferencias.

De cada usuario se conoce: nombre completo, afiliación, email y contraseña.

---

## 2. Dominio del sistema

### 2.1 Conferencias y sesiones

Una conferencia agrupa a sus chairs y a una o más sesiones (también llamadas _tracks_). Cada sesión aborda un tema particular —por ejemplo, en una conferencia de Informática podría haber sesiones de Ingeniería de Software, IA o Big Data.

### 2.2 Artículos

A cada sesión se envían artículos de dos tipos. Los **regulares** tienen título, un archivo adjunto (URL) y un abstract (resumen). Los **posters** tienen título, un archivo adjunto principal (URL) y un segundo archivo de fuentes (URL). En ambos casos se conoce el grupo completo de autores y en particular cuál es el autor encargado de las notificaciones, todos usuarios registrados en ComfyChair.

### 2.3 Flujo de una sesión

Toda sesión pasa secuencialmente por cuatro etapas. Estas etapas se avanzan *manualmente*, es decir que debe haber método/s en la clase Session para progresar de una etapa a la siguiente. En el futuro se manejarán de forma automática con deadlines, pero en este trabajo solo debe quedar preparado el código para poder avanzar etapa a etapa:

#### Recepción
Los autores pueden enviar artículos. Al momento del envío se valida el formato: los regulares deben tener título, al menos un autor y un abstract de menos de 300 palabras; los posters se validan igual pero sin considerar el abstract. Si no se cumplen los requisitos el artículo es rechazado y no avanza. Los envíos pueden modificarse hasta el cierre de la etapa.

#### Bidding
Los revisores expresan su interés en cada artículo: _interesado_, _quizás_, o _no interesado_. Un revisor puede cambiar su bid en cualquier momento durante esta etapa. No se aceptan nuevos envíos.

#### Asignación y Revisión
Se asignan revisores a artículos y cada revisor emite una revisión con texto y puntaje. No se aceptan nuevos envíos.

#### Selección
Se seleccionan los artículos aceptados a partir de las revisiones. No se aceptan nuevos envíos.

### 2.4 Bidding — detalle

Los revisores no están obligados a expresar interés en todos los artículos. Un revisor puede cambiar su bid en cualquier momento mientras la etapa de bidding esté abierta. Por defecto, para cada artículo un revisor está _no interesado_.

### 2.5 Asignación — detalle

Al cerrarse el bidding siempre debe haber exactamente 3 revisores asignados por artículo. El número de revisiones que le corresponde a cada revisor se calcula así: dado un total de artículos **A** y un total de revisores **R**, cada revisor debe hacer `⌈3A/R⌉` revisiones, distribuyendo el resto entre los primeros revisores.

> **Ejemplo:** 10 artículos, 7 revisores → 30 revisiones necesarias. 30 / 7 = 4 con resto 2. Entonces 2 revisores harán 5 revisiones y 5 revisores harán 4.

Para cada artículo se buscan revisores disponibles (que no hayan alcanzado su límite). De esos se asignan primero los que se marcaron _interesado_; si no se llega a 3, se incorporan los _quizás_; si aún falta, los que no expresaron ningún interés, y por último los _no interesados_. Se llega a 3 revisores por artículo combinando categorías en ese orden.

### 2.6 Revisión — detalle

Cada revisión tiene un texto y un puntaje entero entre −3 y +3 (inclusive el 0). Un artículo no admite más de 3 revisiones. El score de un artículo es el promedio de los puntajes de sus revisiones.

### 2.7 Selección — detalle

Una vez cargadas todas las revisiones, cada sesión selecciona los artículos aceptados por **corte fijo**: se define un porcentaje máximo de aceptación y se aceptan los artículos en orden decreciente de score hasta completar ese porcentaje del total enviado.

---

## 3. Código base provisto

Se entrega un proyecto Node.js con las siguientes clases ya implementadas. No deben modificarse salvo para corregir defectos que se justifiquen en el documento de decisiones.

| Clase | Descripción |
|---|---|
| `User` | Nombre, afiliación, email, contraseña. Sin lógica de negocio. |
| `Paper` | Clase base: título, autores, autor correspondiente, reviews y score promedio. |
| `RegularPaper` | Extiende `Paper`. Agrega abstract y valida el límite de 300 palabras en `isValid()`. |
| `Poster` | Extiende `Paper`. Agrega URL de adjunto principal y URL de fuentes. |
| `Review` | Texto y puntaje (−3 a +3). Asociada a un reviewer (`User`). |
| `Bid` | Expresa el interés de un revisor en un artículo. Valores: `Interested`, `Maybe`, `NotInterested`. |
| `Conference` | Nombre, lista de chairs y lista de sesiones. Sin lógica adicional. |
| `Session` | Gestiona el flujo `Receiving → Bidding`. Acepta envíos, valida formato y registra bids. |

Los tests provistos cubren el comportamiento de `Paper`, `RegularPaper`, `Poster`, `Bid` y la etapa de Receiving/Bidding de `Session`.

---

## 4. Consigna — lo que deben implementar

Sobre el código base, deben implementar los siguientes bloques de funcionalidad. Cada uno debe estar acompañado de tests unitarios.

### 4.1 Asignación de revisores

Al cerrar el bidding, la `Session` debe poder asignar revisores a artículos según el algoritmo descripto en la sección 2.5. Esto implica calcular cuántas revisiones le corresponden a cada revisor respetando la distribución con resto, respetar el orden de prioridad de bids, garantizar exactamente 3 revisores por artículo, y excluir a cualquier revisor que sea autor del artículo en cuestión (conflicto de interés). **La implementación de todo lo relacionado al bidding con conflicto de interés es opcional, pero se valorará**.

### 4.2 Carga de revisiones

Una vez asignados los revisores, cada uno puede cargar su revisión para los artículos que le fueron asignados. La revisión tiene texto y puntaje entre −3 y +3. Un artículo no puede tener más de 3 revisiones y solo los revisores asignados al mismo pueden revisarlo.

### 4.3 Selección de artículos

Finalizadas todas las revisiones, la `Session` selecciona los artículos aceptados por corte fijo: dado un porcentaje máximo configurado en la sesión, se aceptan los artículos en orden decreciente de score hasta completar ese porcentaje del total enviado.

---

## 5. Entregables

**Fecha de entrega: 29 de mayo de 2026. Grupos de 2 o 3 personas.**

Se espera un diagrama de clases actualizado que refleje la solución completa, y un documento de decisiones que registre cualquier decisión de diseño tomada sobre el enunciado, ambigüedades resueltas y su justificación. El código debe estar en Node.js con orientación a objetos, sin lambdas ni funciones anónimas excepto en la API de colecciones. Los tests unitarios deben cubrir al menos el 80% del código. Todo debe estar en un repositorio GitHub con historia de commits que refleje la contribución de cada integrante.

---

## 6. Criterios de evaluación

Se evaluará la correctitud funcional según los tests, la calidad del modelo de objetos (coherencia, responsabilidades bien asignadas, ausencia de código duplicado), la claridad y completitud del documento de decisiones, la cobertura y significatividad de los tests, y el historial de commits como evidencia del trabajo colaborativo.
