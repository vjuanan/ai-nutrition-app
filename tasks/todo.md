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

## Fase 6: Rediseño Premium Ultra-Compacto e Iconografía (UX/UI de Lujo)
- [ ] Rediseñar cabecera del Builder a una sola fila horizontal ultra-compacta (eliminar títulos `3xl` y subtítulos descriptivos).
- [ ] Reemplazar botones de texto por botones de iconos interactivos estilizados (Exportar, Guardar, etc.).
- [ ] Eliminar etiquetas textuales redundantes ("Asignar a:", "Consultorio:") a favor de iconos limpios integrados.
- [ ] Rediseñar biblioteca lateral y panel de macronutrientes para maximizar el área útil del canvas del planificador.
- [ ] Limpiar aclaraciones y textos auxiliares en todas las secciones del dashboard.

## Fase 7: Verificación
- [ ] Build local exitoso
- [ ] Push a producción
- [ ] Screenshots verificación en producción
- [ ] Fix de bugs detectados
