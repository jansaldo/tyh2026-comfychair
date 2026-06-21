_Técnicas y Herramientas de Ingeniería de Software 2026_ 

## **ComfyChair** 

Trabajo Práctico — Parte 2 **Fecha de entrega: 26/06/2026** 

## **1. Introducción** 

En esta segunda parte se busca evolucionar el diseño de ComfyChair sobre la implementación desarrollada en el TP1. El objetivo ya no es únicamente implementar funcionalidad, sino mejorar la extensibilidad, mantenibilidad y claridad del modelo de objetos frente a nuevos requerimientos. La funcionalidad implementada en el TP1 debe seguir funcionando, pero ahora el sistema deberá soportar distintas **políticas de selección de artículos** y un **flujo de sesiones extensible** sin lógica condicional centralizada. 

## **2. Evolución del dominio** 

La implementación desarrollada en el TP1 debe evolucionar para soportar nuevos requerimientos sin modificar significativamente código existente. 

## **2.1 Flujo de sesiones** 

Actualmente las sesiones atraviesan distintas etapas del proceso: 

- recepción de papers; 

- bidding; 

- revisión; 

- selección. 

A partir de esta entrega: 

- cada etapa debe definir claramente qué operaciones están habilitadas; 

- las operaciones inválidas deben producir errores; 

- el sistema debe poder incorporar nuevas etapas futuras con impacto mínimo sobre el resto del código. 

## **2.2 Políticas de aceptación** 

Hasta ahora la aceptación de papers se realizaba mediante un porcentaje fijo. 

_Técnicas y Herramientas de Ingeniería de Software 2026_ 

El sistema deberá soportar distintas políticas configurables de aceptación: 

- **AcceptanceByCount:** acepta una cantidad máxima fija de papers, seleccionándolos en orden decreciente de score. 

- **AcceptanceByScoreThreshold:** acepta todos los papers cuyo score promedio sea mayor o igual a un puntaje mínimo configurable. 

La política utilizada por una sesión debe poder cambiarse independientemente del resto del sistema. 

## **3. Consigna** 

Sobre el código desarrollado en el TP1: 

- ajustar el flujo de sesiones para cumplir los nuevos requerimientos; 

- implementar las nuevas políticas de aceptación; 

- mantener compatibilidad con el comportamiento existente; 

- incorporar tests unitarios adecuados. 

## **4. Entregables** 

La entrega debe realizarse sobre el mismo repositorio GitHub utilizado en el TP1. 

Además de la implementación, se espera: 

- un diagrama de clases actualizado; 

- un breve documento de decisiones de diseño; 

- tests unitarios con al menos 80% de cobertura; 

- una historia de commits que refleje la contribución pareja de los integrantes. 

## **5. Criterios de evaluación** 

Se evaluará la correctitud funcional de la solución, la calidad del diseño orientado a objetos, la claridad en la distribución de responsabilidades y la capacidad del modelo para extenderse frente a nuevos requerimientos. También se considerarán la calidad y significatividad de los tests unitarios, la claridad del documento de decisiones y el historial de commits como evidencia del trabajo colaborativo. 

