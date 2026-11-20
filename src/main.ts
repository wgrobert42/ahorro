import '@fontsource-variable/inter/wght.css';
import './style.css';
import * as store from './store';
import { createJar } from './jar/scene';
import { initUI, onCoinCount } from './ui';

async function boot() {
  const msg = document.getElementById('msg')!;
  await store.load();
  let jar;
  try {
    jar = createJar(document.getElementById('stage')!, (n) => onCoinCount(n));
  } catch {
    msg.textContent = 'Tu dispositivo no pudo iniciar los gráficos 3D.';
    return;
  }
  initUI(jar);
  if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __jar: unknown; __store: unknown }).__jar = jar, (window as unknown as { __store: unknown }).__store = store;
}
boot();

if ('serviceWorker' in navigator && !(window as unknown as { Capacitor?: unknown }).Capacitor) {
  import('virtual:pwa-register').then((m) => m.registerSW({ immediate: true })).catch(() => {});
}
