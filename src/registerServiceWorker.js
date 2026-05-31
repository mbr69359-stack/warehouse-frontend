if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${process.env.BASE_URL}service-worker.js`)
      .catch(err => console.error('Service worker registration failed:', err))
  })
}