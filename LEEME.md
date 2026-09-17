# Aurum · Valle de los gigantes

Un juego 3D de vida rural y cría de dinosaurios, en español. Primera versión jugable construida como una porción vertical del briefing: una finca, una camioneta, trabajo rural y una especie con identidad persistente. No pretende implementar de golpe las nueve fases del documento original.

## Jugar en Windows

Abre **JUGAR.cmd**. La primera ejecución instala las dependencias si faltan y abre el juego en tu navegador. Necesitas Node.js 22.12 o posterior. Mantén abierta la ventana del servidor mientras juegas. Para detenerlo, pulsa Ctrl+C en esa ventana.

También puedes abrir una terminal en esta carpeta y ejecutar:

```sh
npm install
npm run dev
```

Después visita **http://127.0.0.1:5173/**. Usa siempre el mismo navegador y la misma dirección para acceder a tu guardado. No abras `index.html` con doble clic: el juego necesita su servidor local.

## Tu primer día

1. Recoge la chatarra del patio con **E**. Acércate a la camioneta y repárala: 4 unidades de chatarra y 35 monedas.
2. Camina hasta los árboles del oeste. Pulsa **E** tres veces para talar; recoge los tres troncos del suelo. El hacha no se gasta.
3. Abre la camioneta con **E**, deposita troncos en la caja y elige **Subir y conducir**. El aserradero está al suroeste de tu finca, junto al camino principal. Aparca cerca de Tomás, baja y vende la carga.
4. Reúne madera y dinero para restaurar el corral (6 troncos + 45 monedas) y la incubadora (3 unidades de chatarra + 55 monedas).
5. Busca un huevo en la **estación Olmo**, al noreste. El mapa permite marcar destinos, sin teletransporte. El estuche protegido admite dos huevos fuera de la incubadora.
6. Incuba el huevo, conoce a tu Psittacosaurus y ponle nombre. Repón el comedero y el bebedero; también puedes alimentarlo y acariciarlo de cerca.
7. Un segundo huevo, de sexo complementario, espera al noroeste de la laguna. Dos adultos sin parentesco pueden tener descendencia con genes heredados.
8. Construye rincones en tu finca, cultiva hortalizas y restaura tu casa. Dormir adelanta ocho horas de juego: deja comida y agua para tus dinosaurios.

Un día dura 24 minutos reales; la incubación, un minuto; la madurez, aproximadamente seis minutos, según los genes. Los menús, el cartel de nacimiento y la pestaña oculta pausan la simulación. El juego no avanza mientras está cerrado.

## Controles

| Acción | Control |
|---|---|
| Caminar | WASD o flechas |
| Caminar a un punto cercano | Clic sobre el suelo; camina en línea recta y se detiene ante obstáculos |
| Correr | Mayús + movimiento |
| Girar cámara | Arrastrar con botón derecho |
| Zoom | Rueda del ratón |
| Interactuar / salir de la camioneta | E |
| Conducir | W/S acelerar o retroceder, A/D girar |
| Frenar | Espacio |
| Mochila / mapa | I / M |
| Construcción | B |
| Girar pieza / colocar / retirar | R / clic / Supr, en construcción |
| Rancho / diario | R / J |
| Ayuda / cerrar o pausar | F1 / Esc |

Las piezas encajan en una cuadrícula de dos metros. La vista previa verde indica una posición válida; la roja explica el impedimento. Construye a menos de 18 metros, dentro de tu propiedad. Para retirar una pieza, apunta con el cursor y pulsa Supr; la madera vuelve al almacén compartido. Los tejados requieren una tarima debajo. Los huertos producen cinco hortalizas tras tres horas de juego.

## Guardado

Guardado versionado en **IndexedDB**, automático cada 30 segundos de juego, después de cambios importantes y al ocultar la pestaña. El botón del disquete permite guardar manualmente. El menú Pausa permite descargar una copia JSON e importarla más adelante; importar pide confirmación antes de sustituir tu partida.

Se conservan el dinero, los inventarios, la posición, el vehículo, el combustible, las reparaciones, los árboles talados, los objetos del suelo, la finca, las construcciones, los cultivos, los huevos, las necesidades, los nombres, los genes y la genealogía. Cada criatura conserva su identificador único.

El guardado depende del navegador y del origen (dirección y puerto). Exporta una copia antes de cambiar de navegador, dirección, puerto o borrar los datos de navegación. No hay nube ni cuentas.

## Alcance de esta versión

Implementado: mundo de 500 × 500 metros con actividades concentradas, cámara en tercera persona con giro y zoom, colisiones Rapier, tala con caída animada, recogida y objetos persistentes, inventario limitado por peso, comercio, conducción sencilla, combustible, reparación, carga visible, construcción modular, almacén, cultivos, una especie de dinosaurio, dos huevos por exploración, incubación, nombres, cuidados, crecimiento, seguimiento, comportamiento autónomo, necesidades, cría básica y genealogía. Interfaz, ayuda, diario y textos íntegramente en español.

Las criaturas comen y beben por sí mismas cuando hay reservas y descansan por la noche. El corral inicial se valida con su reparación; cerrar su puerta limita la posición de los dinosaurios. Las vallas que construyas tienen colisión para el jugador y la camioneta, pero **esta versión todavía no calcula recintos arbitrarios para dinosaurios**. Los comederos construidos acceden a la reserva compartida del corral. La salud baja por falta de cuidados, pero no hay muerte ni combate.

Pendiente para futuras fases: más especies, venta y transporte de dinosaurios, recintos personalizados con navegación completa, NPC con horarios y relaciones, taller con piezas desmontables, vehículos adicionales, genética recesiva avanzada, mapas expandidos y clima. Los modelos y las animaciones son procedurales; todavía no se utilizan modelos GLB con animación esquelética importada. La conducción es cinemática, no una simulación de suspensión por ruedas.

## Desarrollo y publicación

TypeScript + Vite + Three.js + Rapier. Sin React, servicios externos, cuentas, imágenes descargadas ni recursos gráficos remotos. La vegetación usa instancias; los modelos comparten materiales. El estado está separado de sus representaciones visuales y los eventos comunican simulación e interfaz.

```sh
npm test        # Pruebas de ciclos de juego, genética, construcción, persistencia y colisiones
npm run build  # Comprobación de TypeScript y aplicación estática en dist/
npm run preview
```

Puedes publicar el contenido de `dist/` en cualquier alojamiento estático HTTPS. Las rutas de recursos son relativas. La compilación incluye las bibliotecas y la física; no necesita conexión a un CDN para funcionar. No se ha publicado automáticamente en ningún servidor externo.

### Organización

- `src/core`: estado, tipos, eventos, controles y coordinación del juego.
- `src/data`: artículos, precios, construcciones, especie y puntos del mapa.
- `src/systems`: simulación, inventario, física, sonido y persistencia.
- `src/rendering`: mundo, modelos, cámara, animaciones e instancias.
- `src/ui`: interfaz y iconos.
- `tests`: pruebas automatizadas de los ciclos de aceptación.

Para ampliar una especie, separa primero sus reglas específicas en definiciones adicionales y aporta su representación visual. Conserva los identificadores al modificar nombres. Añade una migración explícita al cambiar el formato de guardado.

La ejecución de pruebas usa una base de datos IndexedDB en memoria independiente: no modifica tu partida del navegador. Rapier puede mostrar una advertencia de inicialización obsoleta procedente de su propio envoltorio WASM; no afecta a sus pruebas de colisión.

Referencias técnicas: [Three.js](https://threejs.org/docs/), [controlador de personajes de Rapier](https://rapier.rs/docs/user_guides/javascript/character_controller/).
