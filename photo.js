// Portrait built from falling dots: each dot drops like a Galton ball and stacks, bottom rows first.
;(() => {
  const frame = document.querySelector('.hero .photo-frame')
  const img = frame && frame.querySelector('img')
  if (!img || matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const CELL = 4
  const FALL = 520
  const ROW_GAP = 45
  const easeInQuad = t => t * t

  const Photo = {
    init() {
      this.cv = document.createElement('canvas')
      this.cv.className = 'photo-dots'
      this.cv.setAttribute('aria-hidden', 'true')
      frame.insertBefore(this.cv, img.nextSibling)
      frame.addEventListener('click', () => this.play())
      this.play()
    },

    _sample() {
      const size = frame.clientWidth
      const n = Math.floor(size / CELL)
      const off = document.createElement('canvas')
      off.width = off.height = n
      const g = off.getContext('2d')
      g.drawImage(img, 0, 0, n, n)
      const px = g.getImageData(0, 0, n, n).data
      this.dpr = Math.min(devicePixelRatio || 1, 2)
      this.cv.width = this.cv.height = Math.round(size * this.dpr)
      this.cell = size / n
      this.dots = []
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          const i = (row * n + col) * 4
          this.dots.push({
            x: col * this.cell,
            y: row * this.cell,
            from: -this.cell - Math.random() * 60,
            delay: (n - 1 - row) * ROW_GAP + Math.random() * 160,
            color: `rgb(${px[i]},${px[i + 1]},${px[i + 2]})`,
          })
        }
      }
      this.end = (n - 1) * ROW_GAP + 160 + FALL
    },

    play() {
      this._sample()
      // Hide the real photo at once, only its return fades in.
      img.style.transition = 'none'
      img.classList.add('hidden')
      void img.offsetWidth
      img.style.transition = ''
      this.cv.classList.remove('done')
      this.start = performance.now()
      requestAnimationFrame(now => this._frame(now))
    },

    _frame(now) {
      const t = now - this.start
      const g = this.cv.getContext('2d')
      const r = this.cell / 2 - 0.3
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
      g.clearRect(0, 0, this.cv.width, this.cv.height)
      for (const d of this.dots) {
        const f = Math.min(Math.max((t - d.delay) / FALL, 0), 1)
        if (f === 0) continue
        g.fillStyle = d.color
        g.beginPath()
        g.arc(d.x + this.cell / 2, d.from + (d.y - d.from) * easeInQuad(f) + this.cell / 2, r, 0, Math.PI * 2)
        g.fill()
      }
      if (t < this.end) {
        requestAnimationFrame(n => this._frame(n))
        return
      }
      img.classList.remove('hidden')
      this.cv.classList.add('done')
    },
  }

  if (img.complete && img.naturalWidth) Photo.init()
  else img.addEventListener('load', () => Photo.init(), { once: true })
})()
