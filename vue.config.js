module.exports = {
  devServer: {
    port: 8081,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
}