# App de ahorro (APK Android)

## Qué es
App personal (quizá venta futura) SOLO de ahorros y metas. Sin registro de gastos ni finanzas.
Usuario emigrante en Uzbekistán: cobra y ahorra en sum uzbeco (UZS); cada vez que junta el equivalente a 100 USD
compra 100 USD en el banco. Metas en USD, por prioridad:
1. Billete de avión a casa (ejemplo $700)
2. Multa de salida (ejemplo $400)
Cada bloque de $100 llena la primera meta incompleta, luego la siguiente. Se podrán añadir más metas, reordenables.
Tipo de cambio de ejemplo: 12.500 sum/USD (debe ser editable).

## Mecánica
- Añadir ahorro en sum (entrada muy rápida: atajos +50.000/+100.000/+250.000 y teclado).
- Cada 1 USD equivalente = 1 moneda en el frasco. 100 monedas = bloque completo.
- Al completar: botón "Ya compré mis $100" -> las monedas desaparecen, el bloque se asigna a la meta activa.
- Sobrante en sum se conserva para el siguiente bloque.

## Visual (MUY importante)
- Estilo fintech verde claro: fondo #F3F9F6, primario #0F6B4F, menta #DFF3EA, fuente Plus Jakarta Sans.
- Frasco ilustrado plano (vidrio azul con brillos blancos, tapa dorada, monedas doradas planas) con FÍSICA REAL
  (monedas que caen y se apilan por gravedad, sin líquido). Etiqueta curva con el nombre de la meta activa.
- Referencia funcional y visual: `prototipo-frasco.html` (Three.js r160 + cannon-es). Reutilizar su escena,
  materiales toon, shader de vidrio, etiqueta y física tal cual; está validada (0 monedas fuera, pila estable).
- Pantallas: Inicio, Metas, Futuro (hecho en el prototipo) + las que faltan abajo. Barra inferior de pestañas.

## Funciones elegidas
Hecho en prototipo: frasco/metas, simulador "yo del futuro" (fecha según ahorro semanal).
Por hacer: retos y rachas (gamificación), precio de cada meta en horas de trabajo (según sueldo/hora),
persistencia local, ajustes (tipo de cambio, sueldo por hora, moneda de entrada: sum/USD).

## Técnica propuesta
- Vite + TypeScript, Three.js + cannon-es (valorar Rapier WASM si el rendimiento en móviles baja).
- Empaquetar con Capacitor para Android (APK/AAB). Almacenamiento: @capacitor/preferences o IndexedDB.
- Sin dependencia de CDN en producción (todo empaquetado, fuente incluida). Funciona sin conexión.
- Rendimiento: monedas dormidas al reposar, pixel ratio dinámico, máx. 100 cuerpos.
- Opcional futuro: acelerómetro para agitar el frasco.

## Reglas de trabajo
- Responder en español. Probar en emulador/dispositivo antes de dar algo por terminado.
- Los números del prototipo son ejemplos; nunca tratarlos como datos reales.

---
# INSTRUCCIONES DE EJECUCIÓN (léelas y actúa sin pedir más indicaciones)

Cuando el usuario diga "empieza" (o cualquier saludo), construye la app completa por fases, sin esperar más órdenes.
Haz preguntas solo si algo bloquea de verdad. Al terminar cada fase: probar, resumir en 2-3 líneas en español y seguir con la siguiente.
El usuario trabaja SOLO desde su teléfono Android: nunca le pidas instalar nada en un ordenador; usa la nube (GitHub Actions) para compilar.

## Fases
1. Proyecto: Vite + TypeScript en esta carpeta. Paquetes en local (three, cannon-es, fuente Plus Jakarta Sans), sin CDN.
   Pasar `prototipo-frasco.html` a módulos (escena del frasco, física, etiqueta, pantallas) conservando aspecto y física.
2. Datos: estado persistente local (metas, bloques comprados, sum en el frasco, ajustes). Probar que sobrevive a recargar.
3. Ajustes: tipo de cambio editable, sueldo por hora, pantalla de ajustes.
4. Metas: crear/editar/reordenar/borrar metas (nombre, monto en USD). La etiqueta del frasco sigue a la meta activa.
5. Precio en horas de trabajo: en cada meta y en Inicio ("tu billete = X horas de trabajo").
6. Retos y rachas: racha de días/semanas ahorrando, retos semanales con progreso, insignias sencillas, animación al lograrlos.
7. Pulido visual: transiciones, vacíos con indicaciones claras, modo accesible (contraste, objetivos táctiles 48px), rendimiento en móvil.
8. Android SIN ordenador: el usuario solo tiene un teléfono Android. No pedirle Android Studio ni terminal local.
   Añadir Capacitor y un workflow de GitHub Actions (.github/workflows/apk.yml) que compile el APK en la nube
   (Node + Java 17 + Android SDK, `./gradlew assembleDebug`) y lo publique como artefacto descargable y como Release.
   Explicarle en pasos cortos cómo descargar e instalar el APK desde el móvil. Firma de release: solo si lo pide.
   Mientras tanto, mantener la app también como PWA instalable (manifest + service worker) como plan B.
9. Final: README corto en español con cómo ejecutar, probar y generar el APK.

## Criterios de "hecho"
- Sin errores de consola, funciona sin internet, el frasco mantiene 60 fps razonables con 100 monedas.
- Las monedas nunca salen del frasco y se duermen al reposar.
