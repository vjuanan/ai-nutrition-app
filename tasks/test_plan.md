# Plan de Pruebas: Editor de Nutrición

Este documento detalla los casos de prueba para verificar la funcionalidad completa del Editor de Planes de Nutrición desde la perspectiva del usuario.

## 1. Verificación de Visualización (Read)
- [x] **Carga del Plan**: El plan carga correctamente con todos sus días y comidas.
- [x] **Visualización de Alimentos**: Los alimentos aparecen con sus nombres, cantidades y unidades correctas.
- [x] **Cálculo de Macros**: Las calorías y macronutrientes (Proteínas, Carbs, Grasas) se suman correctamente a nivel de comida y día.

## 2. Gestión de Comidas (Meal Management)
- [ ] **Agregar Comida**: Capacidad de insertar un nuevo bloque de comida en un día.
- [ ] **Editar Nombre/Hora**: Modificar el nombre (ej. "Snack") y horario de una comida.
- [ ] **Eliminar Comida**: Quitar una comida entera y verificar que se actualizan los totales del día.

## 3. Gestión de Alimentos (Food Management)
- [ ] **Buscar y Agregar Alimento**:
    - Buscar un alimento en la base de datos (ej. "Manzana").
    - Seleccionarlo y agregarlo a una comida.
    - Verificar que los macros de la comida se actualizan instantáneamente.
- [ ] **Editar Cantidad**:
    - Modificar la cantidad de un alimento existente (ej. cambiar 200g a 250g de Pollo).
    - Verificar actualización de macros.
- [ ] **Eliminar Alimento**:
    - Quitar un alimento de la lista.
    - Verificar que desaparece y se restan sus macros.

## 4. Persistencia y Guardado
- [ ] **Guardado Automático/Manual**: Verificar si los cambios se guardan al realizarlos o al hacer click en "Guardar".
- [ ] **Persistencia tras Recarga**: Recargar la página (F5) y confirmar que los cambios (agregados, ediciones, eliminaciones) se mantienen.

## 5. Experiencia de Usuario (UX)
- [ ] **Manejo de Errores**: Comportamiento cuando falla la red o inputs inválidos.
- [ ] **Feedback Visual**: Indicadores de carga o éxito al guardar.
