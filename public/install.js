// Installation is offered by the browser; no custom prompt or instructions.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'})
      .catch(error => console.warn('Service worker registration failed.', error));
  });
}
