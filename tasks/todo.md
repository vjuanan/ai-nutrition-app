# Rediseño Editor Nutricional — Block Types

## Fase 1: Preparación del Store y Routing
- [ ] Agregar `autoEnterBuilder()` al store
- [ ] Modificar editor page para auto-enter builder mode

## Fase 2: Eliminar Weekly Grid
- [ ] Modificar `PlanEditor.tsx` para ir directo al builder (sin grid semanal)
- [ ] Limpiar navbar del editor

## Fase 3: Block Type Palette
- [ ] Crear `BlockTypePalette.tsx` — sidebar con 5 tipos de bloque (Desayuno, Colación, Almuerzo, Merienda, Ayuno)
- [ ] Implementar drag desde palette al editor

## Fase 4: Meal Block Cards
- [ ] Crear `MealBlockCard.tsx` — card con color por tipo, drag handle, macros
- [ ] Implementar hover highlights con color del bloque

## Fase 5: Meal Edit Modal
- [ ] Crear `MealEditModal.tsx` — modal de edición estilo reference
- [ ] Integrar `FoodAutocomplete` dentro del modal
- [ ] Campos estilo card: Cantidad, Unidad, Notas/Protocolo
- [ ] Quick-select buttons para cantidades
- [ ] Footer: Eliminar + Listo

## Fase 6: Rediseñar MealBuilderPanel
- [ ] Rehacer layout: palette izquierda + área de bloques derecha
- [ ] Integrar drag-and-drop entre palette y área de bloques
- [ ] Eliminar "Nueva Comida" y "Añadir alimento" en-line

## Fase 7: Verificación
- [ ] Build local exitoso
- [ ] Push a producción
- [ ] Screenshots verificación en producción
- [ ] Fix de bugs detectados
