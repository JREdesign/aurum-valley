import "./style.css";
import { Game } from "./core/Game";
new Game().init().catch((error) => {
  console.error(error);
  const loading = document.querySelector("#loading")!;
  loading.innerHTML =
    '<div class="loading-mark">a.</div><p>No se ha podido abrir el valle.<span>Comprueba que la aceleración gráfica esté activa y recarga la página.</span></p><button onclick="location.reload()">Volver a intentar</button>';
});
