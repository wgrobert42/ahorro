# Ahorro

App personal para ahorrar en sum uzbeco y comprar dólares en bloques de $100, con un frasco 3D de monedas con física real.
Funciona sin conexión (todo está empaquetado, incluida la fuente) y guarda los datos solo en el teléfono.

## Funciones
Frasco con metas (la etiqueta sigue a la meta activa) · metas creables, editables, reordenables y borrables ·
horas de trabajo por meta · "Yo del futuro" (fecha según ahorro semanal) · retos semanales, rachas e insignias ·
historial de ahorros editable (todo se refleja en el frasco) · moneda de ahorro por meta (sum o USD, con el equivalente en pequeño) ·
ajustes (tipo de cambio, sueldo por hora, objetivo semanal, alto contraste).
Los importes iniciales (tipo de cambio 12.500, metas $700 y $400) son ejemplos editables.

## Ejecutar y probar (con ordenador)
```bash
npm install
npm run dev      # servidor local
npm test         # reglas de negocio
npm run build    # compilación de producción en dist/
```

## Instalar en tu Android (sin ordenador)
1. En GitHub abre **Actions → Compilar APK** y espera a que termine (≈5 min). Se ejecuta sola en cada cambio; también con **Run workflow**.
2. Abre la pestaña **Releases** del repositorio desde el móvil y descarga `ahorro.apk` (o, en la ejecución, el artefacto `ahorro-apk`).
3. Ábrelo. Si Android lo pide, permite "instalar apps de esta fuente" para tu navegador. Es un APK de depuración, sin firma de release.

Plan B: abre la web publicada en Chrome del móvil → menú → **Instalar aplicación** (PWA con service worker).

## Estructura
`src/state.ts` reglas (puras, con tests) · `src/store.ts` persistencia (@capacitor/preferences) ·
`src/jar/` escena 3D, física y etiqueta · `src/ui.ts` pantallas · `android/` proyecto Capacitor.
Nota: Capacitor 8 requiere Java 21 para compilar; el workflow ya lo configura.
