# Plan de Nutrición - Editor Completo

## Investigación y Análisis
- [x] Revisar estructura actual del editor de planes de nutrición
- [x] Identificar componentes existentes y su funcionalidad
- [x] Revisar esquema de base de datos para planes de nutrición
- [x] Analizar la estructura de datos de alimentos

## Poblar Template con Datos Reales
- [x] Crear script para seed de alimentos comunes
- [x] Ejecutar script de seed
- [x] Actualizar template existente con comidas completas
- [x] Verificar que el template tenga alimentos en cada comida
- [/] Ejecutar pruebas manuales en navegador y verificar persistencia


## Funcionalidad de Alternativas Inteligentes
- [ ] Crear componente `SmartAlternativesButton` para cada comida
- [ ] Implementar servidor API route para generación con Gemini
- [ ] Crear componente modal `AlternativesModal` para mostrar opciones
- [ ] Integrar con `MealCard` y `MealEditor`
- [ ] Implementar lógica de reemplazo de alimentos

## Mejoras de UX
- [ ] Mejorar visualización de alimentos en MealCard (lista completa vs truncada)
- [ ] Añadir botón de "Copiar comida" entre días
- [ ] Mejorar feedback visual durante guardado
- [ ] Añadir tooltips y ayudas contextuales

## Asignación de Planes
- [ ] Revisar componente de asignación existente
- [ ] Verificar flujo de asignación a usuarios/clientes
- [ ] Añadir notificación al usuario asignado

## Verificación
- [ ] Abrir template y verificar que tenga alimentos
- [ ] Editar comidas añadiendo/removiendo alimentos
- [ ] Probar generación de alternativas inteligentes
- [ ] Asignar plan a usuario de prueba
- [ ] Screenshots completos de verificación
