export default {
  data() {
    return { windowWidth: window.innerWidth }
  },
  computed: {
    isMobile() { return this.windowWidth <= 768 }
  },
  mounted() {
    this.__onResize = () => { this.windowWidth = window.innerWidth }
    window.addEventListener('resize', this.__onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.__onResize)
  }
}