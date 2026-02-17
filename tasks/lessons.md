# Lecciones Aprendidas

## 2026-02-17: Planes de Nutrición Vacíos

### Problema
Se creó un template de plan de nutrición pero no tiene funcionalidad para añadir alimentos, cantidades, ni calcular valores nutricionales.

### Lección
- Nunca crear una estructura de datos sin implementar la UI completa para editarla
- Siempre verificar que los componentes permitan CRUD completo antes de marcar como completo
- Los templates deben ser completamente funcionales, no solo estructuras vacías

## 2026-02-17: Verificación en Producción sin Desplegar

### Problema
Se verificaron cambios locales mirando la URL de producción (https://aicoach.epnstore.com.ar) sin haber realizado el despliegue (git push), resultando en un falso positivo donde se creyó que los cambios estaban aplicados.

### Lección
- SIEMPRE desplegar cambios (git push) antes de verificar en una URL de producción.
- Las ediciones locales NO se reflejan en el sitio en vivo inmediatamente.
- Verificar contra localhost primero si es posible, o esperar explícitamente al despliegue.
