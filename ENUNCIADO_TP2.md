# ComfyChair — Trabajo Práctico, Parte 2

**Técnicas y Herramientas de Ingeniería de Software · Maestría · 2026**

| | |
|---|---|
| **Asignatura** | Técnicas y Herramientas de Ingeniería de Software |
| **Proyecto** | ComfyChair |
| **Entrega** | Trabajo Práctico — Parte 2 |
| **Fecha de entrega** | 26 de junio de 2026 |

---

## 1. Introducción

En esta segunda parte se busca evolucionar el diseño de ComfyChair sobre la implementación desarrollada en el TP1.

El objetivo ya no es únicamente implementar funcionalidad, sino mejorar la **extensibilidad**, **mantenibilidad** y **claridad del modelo de objetos** frente a nuevos requerimientos. La funcionalidad implementada en el TP1 debe seguir funcionando, pero ahora el sistema deberá soportar distintas políticas de selección de artículos y un flujo de sesiones extensible, sin lógica condicional centralizada.

---

## 2. Evolución del dominio

La implementación desarrollada en el TP1 debe evolucionar para soportar nuevos requerimientos sin modificar significativamente el código existente.

### 2.1. Flujo de sesiones

Actualmente, las sesiones atraviesan las siguientes etapas del proceso, en orden:

1. recepción de papers;
2. bidding;
3. revisión;
4. selección.

A partir de esta entrega:

- cada etapa debe definir claramente qué operaciones están habilitadas;
- las operaciones inválidas para la etapa actual deben producir errores descriptivos;
- las transiciones deben preservar las reglas e invariantes del flujo implementado en el TP1;
- el sistema debe poder incorporar nuevas etapas futuras con impacto mínimo sobre el resto del código;
- el comportamiento de cada etapa no debe resolverse mediante una lógica condicional centralizada en `Session`.

#### 2.1.1. Operaciones esperadas por etapa

La siguiente tabla resume las responsabilidades principales de cada etapa. Los nombres concretos de las operaciones pueden adaptarse al diseño, siempre que el comportamiento observable se conserve.

| Etapa | Operaciones habilitadas | Operación de avance |
|---|---|---|
| **Recepción** | Enviar papers y actualizar papers ya enviados | Cerrar la recepción e iniciar el bidding |
| **Bidding** | Registrar o actualizar bids | Cerrar el bidding, asignar revisores e iniciar la revisión |
| **Revisión** | Enviar revisiones de los revisores asignados | Cerrar la revisión cuando todas las revisiones requeridas estén completas |
| **Selección** | Aplicar la política de aceptación configurada y consultar los papers aceptados | No se exige una etapa posterior en esta entrega |

Una operación correspondiente a otra etapa debe fallar sin modificar el estado de la sesión ni dejar cambios parciales.

#### 2.1.2. Actualización de trabajos hasta el deadline

Una vez enviado un trabajo, cualquiera de sus autores debe poder actualizarlo mientras la sesión permanezca en la etapa de **Recepción**.

Para esta entrega, el deadline de envío se considera alcanzado cuando se cierra manualmente la etapa de Recepción. No se requiere implementar un reloj, scheduler ni cierre automático por fecha.

La actualización de un trabajo debe cumplir las siguientes reglas:

- solo un autor del trabajo puede solicitar su actualización;
- el trabajo debe haber sido enviado previamente a esa sesión;
- pueden actualizarse los datos editables del paper, incluidos los datos específicos de su tipo;
- el trabajo actualizado debe volver a satisfacer las mismas validaciones exigidas para su envío;
- una actualización inválida debe producir un error y conservar intacta la última versión válida;
- la actualización debe conservar la identidad del envío y su posición relativa de presentación;
- después del deadline —es decir, desde la etapa de Bidding en adelante— toda actualización debe producir un error y no modificar el paper.

### 2.2. Políticas de aceptación

Hasta ahora, la aceptación de papers se realizaba mediante un porcentaje fijo. El sistema deberá soportar políticas configurables e intercambiables de aceptación.

Cada sesión debe delegar la selección de papers en una política de aceptación. La política utilizada por una sesión debe poder configurarse o reemplazarse independientemente del resto del sistema, sin modificar el flujo de etapas ni las demás políticas.

Se deben implementar, como mínimo, las siguientes políticas:

#### `AcceptanceByCount`

Acepta una cantidad máxima fija de papers, seleccionándolos en orden decreciente de score promedio.

- La cantidad máxima debe ser configurable.
- Si la cantidad configurada supera el total de papers, se aceptan todos.
- Una cantidad máxima igual a cero no acepta ningún paper.

#### `AcceptanceByScoreThreshold`

Acepta todos los papers cuyo score promedio sea mayor o igual a un puntaje mínimo configurable.

- El puntaje mínimo debe ser configurable.
- La cantidad final de papers aceptados no está limitada: depende de cuántos alcancen el umbral.
- Un paper cuyo score sea exactamente igual al umbral debe ser aceptado.

#### Compatibilidad con el TP1

La selección por porcentaje fijo implementada en el TP1 debe continuar disponible y conservar su comportamiento observable. En particular, debe seguir aceptando papers en orden decreciente de score sin superar el porcentaje máximo configurado.

Para todas las políticas:

- la selección solo puede ejecutarse en la etapa de Selección;
- deben utilizarse los scores promedio calculados a partir de las revisiones;
- los empates deben resolverse de manera determinista y compatible con el comportamiento existente;
- cambiar la política de una sesión no debe modificar la configuración ni el resultado de otras sesiones.

---

## 3. Consigna

Sobre el código desarrollado en el TP1 se deberá:

- ajustar el flujo de sesiones para cumplir los nuevos requerimientos de extensibilidad;
- distribuir las operaciones y validaciones según la etapa correspondiente;
- rechazar con errores las operaciones no habilitadas en la etapa actual;
- permitir que los autores actualicen sus trabajos hasta el cierre de la recepción;
- implementar las nuevas políticas de aceptación;
- permitir que cada sesión utilice una política de aceptación configurable;
- mantener compatibilidad con el comportamiento existente;
- incorporar tests unitarios adecuados para el nuevo comportamiento y para las regresiones del TP1.

La solución debe mantener a `Session` como responsable de coordinar el proceso, evitando concentrar en ella los detalles variables de cada etapa o de cada algoritmo de aceptación.

---

## 4. Entregables

La entrega debe realizarse sobre el mismo repositorio de GitHub utilizado en el TP1.

Además de la implementación, se espera:

- un diagrama de clases actualizado;
- un breve documento de decisiones de diseño;
- tests unitarios con al menos **80 % de cobertura**;
- una historia de commits que refleje la contribución pareja de los integrantes.

El diagrama y el documento de decisiones deben reflejar tanto el diseño extensible del flujo de sesiones como la separación entre las distintas políticas de aceptación.

---

## 5. Criterios de evaluación

Se evaluará:

- la correctitud funcional de la solución;
- la preservación del comportamiento implementado en el TP1;
- la calidad del diseño orientado a objetos;
- la claridad en la distribución de responsabilidades;
- la ausencia de lógica condicional centralizada para resolver el comportamiento de las etapas;
- la capacidad del modelo para incorporar nuevas etapas y políticas con cambios mínimos;
- la calidad, cobertura y significatividad de los tests unitarios;
- la claridad del documento de decisiones;
- el historial de commits como evidencia del trabajo colaborativo.

---

## 6. Criterios mínimos de aceptación funcional

La implementación deberá demostrar mediante tests, como mínimo, los siguientes escenarios:

### Flujo y etapas

- cada operación válida funciona en su etapa correspondiente;
- cada operación ejecutada en una etapa inválida produce un error;
- una transición fallida conserva la etapa y el estado previo de la sesión;
- incorporar una nueva etapa no requiere modificar condicionales distribuidos por `Session`.

### Actualización de trabajos

- un autor puede actualizar un paper enviado durante Recepción;
- el paper actualizado queda disponible en la sesión con sus nuevos datos;
- un usuario que no es autor no puede actualizarlo;
- no puede actualizarse un paper que no pertenece a la sesión;
- una actualización que vuelve inválido al paper es rechazada sin perder la versión válida anterior;
- al cerrar Recepción, el mismo intento de actualización es rechazado sin producir cambios.

### Políticas de aceptación

- `AcceptanceByCount` acepta los papers con mayor score hasta alcanzar el máximo configurado;
- `AcceptanceByCount` contempla correctamente cero, un máximo mayor al total y empates;
- `AcceptanceByScoreThreshold` acepta scores mayores e iguales al umbral y rechaza los menores;
- dos sesiones pueden utilizar políticas y configuraciones diferentes sin interferirse;
- la política porcentual del TP1 conserva sus resultados anteriores;
- ninguna política puede ejecutar la selección fuera de la etapa de Selección.
