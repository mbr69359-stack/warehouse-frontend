export default {
  data() {
    return { _ww: window.innerWidth }
  },
  computed: {
    isMobile() { return this._ww <= 768 }
  },
  mounted() {
    this.__onResize = () => { this._ww = window.innerWidth }
    window.addEventListener('resize', this.__onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.__onResize)
  }
}