// Galton board. Values from docs/DESIGN.md sec. 4 and 5.
;(() => {
  const COLOR = {}
  const readColors = () => {
    const css = getComputedStyle(document.documentElement)
    for (const k of ['grid', 'peg', 'path', 'shape']) COLOR[k] = css.getPropertyValue(`--${k}`).trim()
  }
  const RESET_AT = 1000
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

  const binom = (n, k) => {
    let r = 1
    for (let i = 0; i < k; i++) r *= (n - i) / (i + 1)
    return r
  }
  const easeInQuad = t => t * t
  const easeOutSine = t => Math.sin((t * Math.PI) / 2)
  const easeOutCubic = t => 1 - (1 - t) ** 3

  const Board = {
    init(canvas, button) {
      this.cv = canvas
      this.ctx = canvas.getContext('2d')
      this.btn = button
      this.visible = true
      this.running = false
      this._layout()
      this._newRun(this.cfg.batch)

      button.addEventListener('click', () => this.drop(40))
      new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting
        this._wake()
      }).observe(canvas)
      document.addEventListener('visibilitychange', () => this._wake())
      document.addEventListener('themechange', () => {
        this._layout()
        this._draw()
      })
      let resizeTimer
      addEventListener('resize', () => {
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => this._onResize(), 150)
      })
    },

    drop(n) {
      if (this.N + n >= RESET_AT) {
        this.fade = { counts: this.counts, s: this.s, t: 0 }
        this._newRun(n)
        return
      }
      this._setN(this.N + n)
      if (reducedMotion.matches) this._fillExpected()
      else this.queued += n
      this._wake()
    },

    _config() {
      const w = this.btn.clientWidth
      if (innerWidth >= 720) {
        return { w, h: 520, rows: 12, dx: 36, dy: 30, top: 24, grid: 24, r: 3, halo: 7, batch: 240, rate: 25, hop: 110 }
      }
      const rows = 10
      return {
        w, h: innerWidth < 360 ? 280 : 320, rows, dx: Math.min(30, (w - 24) / (rows + 1)), dy: 22, top: 16,
        grid: 20, r: 2.5, halo: 6, batch: 160, rate: 33, hop: 100,
      }
    },

    _layout() {
      readColors()
      const c = (this.cfg = this._config())
      this.dpr = Math.min(devicePixelRatio || 1, 2)
      this.cv.width = Math.round(c.w * this.dpr)
      this.cv.height = Math.round(c.h * this.dpr)
      this.cv.style.width = `${c.w}px`
      this.cv.style.height = `${c.h}px`
      this.cx = c.w / 2
      this.base = c.h
      this.binH = c.h - (c.top + c.rows * c.dy)
      this._paintBackground()
      this._paintSprite()
    },

    _onResize() {
      const oldRows = this.cfg.rows
      this._layout()
      if (this.cfg.rows !== oldRows) this._newRun(this.cfg.batch)
      else this._setN(this.N, true)
      this._draw()
    },

    _newRun(n) {
      this.counts = new Array(this.cfg.rows + 1).fill(0)
      this.balls = []
      this.queued = 0
      this.spawnClock = 0
      this._setN(n, true)
      if (reducedMotion.matches) this._fillExpected()
      else this.queued = n
      this._wake()
      this._draw()
    },

    _scaleFor(N) {
      const r = this.cfg.rows
      return (0.85 * this.binH) / ((N * binom(r, r / 2)) / 2 ** r)
    },

    _setN(N, instant = false) {
      this.N = N
      const target = this._scaleFor(N)
      if (instant || reducedMotion.matches) {
        this.s = target
        this.sAnim = null
      } else {
        this.sAnim = { from: this.s, to: target, t: 0 }
      }
    },

    _fillExpected() {
      const r = this.cfg.rows
      this.counts = this.counts.map((_, k) => Math.round((this.N * binom(r, k)) / 2 ** r))
      this._draw()
    },

    _binX(k) {
      return this.cx + (k - this.cfg.rows / 2) * this.cfg.dx
    },

    _paintBackground() {
      const c = this.cfg
      const bg = (this.bg = document.createElement('canvas'))
      bg.width = this.cv.width
      bg.height = this.cv.height
      const g = bg.getContext('2d')
      g.scale(this.dpr, this.dpr)
      g.strokeStyle = COLOR.grid
      g.lineWidth = 1
      g.beginPath()
      for (let x = 0.5; x < c.w; x += c.grid) g.moveTo(x, 0), g.lineTo(x, c.h)
      for (let y = 0.5; y < c.h; y += c.grid) g.moveTo(0, y), g.lineTo(c.w, y)
      g.stroke()
      g.fillStyle = COLOR.peg
      for (let i = 0; i < c.rows; i++) {
        for (let j = 0; j <= i; j++) {
          g.beginPath()
          g.arc(this.cx + (j - i / 2) * c.dx, c.top + i * c.dy, 1.5, 0, Math.PI * 2)
          g.fill()
        }
      }
    },

    _paintSprite() {
      const { r, halo } = this.cfg
      const sp = (this.sprite = document.createElement('canvas'))
      sp.width = sp.height = Math.ceil(halo * 2 * this.dpr)
      const g = sp.getContext('2d')
      g.scale(this.dpr, this.dpr)
      g.fillStyle = COLOR.path
      g.globalAlpha = 0.22
      g.beginPath()
      g.arc(halo, halo, halo, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 1
      g.beginPath()
      g.arc(halo, halo, r, 0, Math.PI * 2)
      g.fill()
    },

    _spawn() {
      const turns = Array.from({ length: this.cfg.rows }, () => (Math.random() < 0.5 ? -1 : 1))
      const k = (this.cfg.rows + turns.reduce((a, b) => a + b, 0)) / 2
      this.balls.push({ turns, k, t: 0, jitter: (Math.random() - 0.5) * 4 })
    },

    // Where a ball is after t ms: the drop to the first peg, one hop per peg row, then the fall into its bin.
    _ballPos(b) {
      const c = this.cfg
      const spawn = 160
      const land = 180
      if (b.t < spawn) {
        return { x: this.cx + b.jitter * (1 - b.t / spawn), y: c.top - 20 + 20 * easeInQuad(b.t / spawn) }
      }
      const t = b.t - spawn
      const row = Math.floor(t / c.hop)
      let x = this.cx
      for (let i = 0; i < Math.min(row, c.rows - 1); i++) x += (b.turns[i] * c.dx) / 2
      if (row < c.rows - 1) {
        const f = (t - row * c.hop) / c.hop
        return {
          x: x + ((b.turns[row] * c.dx) / 2) * easeOutSine(f),
          y: c.top + row * c.dy + c.dy * easeInQuad(f),
        }
      }
      const f = Math.min((t - (c.rows - 1) * c.hop) / land, 1)
      const fromY = c.top + (c.rows - 1) * c.dy
      const toY = this.base - Math.min(this.counts[b.k] * this.s, this.binH) - c.r
      return {
        x: x + ((b.turns[c.rows - 1] * c.dx) / 2) * easeOutSine(f),
        y: fromY + (toY - fromY) * easeInQuad(f),
        done: f >= 1,
      }
    },

    _busy() {
      return this.queued > 0 || this.balls.length > 0 || this.sAnim || this.fade
    },

    _wake() {
      if (this.running || !this.visible || document.hidden || !this._busy()) return
      this.running = true
      this.last = performance.now()
      requestAnimationFrame(now => this._frame(now))
    },

    _frame(now) {
      if (!this.visible || document.hidden) {
        this.running = false
        return
      }
      const dt = Math.min(now - this.last, 32)
      this.last = now
      this._step(dt)
      this._draw()
      if (this._busy()) requestAnimationFrame(n => this._frame(n))
      else this.running = false
    },

    _step(dt) {
      if (this.queued > 0) {
        this.spawnClock += dt
        while (this.spawnClock >= this.cfg.rate && this.queued > 0) {
          this.spawnClock -= this.cfg.rate
          this.queued--
          this._spawn()
        }
      }
      for (const b of this.balls) {
        b.t += dt
        if (this._ballPos(b).done) {
          this.counts[b.k]++
          b.landed = true
        }
      }
      this.balls = this.balls.filter(b => !b.landed)
      if (this.sAnim) {
        const a = this.sAnim
        a.t = Math.min(a.t + dt / 400, 1)
        this.s = a.from + (a.to - a.from) * easeOutCubic(a.t)
        if (a.t >= 1) this.sAnim = null
      }
      if (this.fade) {
        this.fade.t += dt / 600
        if (this.fade.t >= 1) this.fade = null
      }
    },

    _bars(g, counts, s) {
      const w = this.cfg.dx - 6
      counts.forEach((n, k) => {
        if (!n) return
        const h = Math.min(n * s, this.binH)
        g.fillRect(this._binX(k) - w / 2, this.base - h, w, h)
      })
    },

    _curve(g, heightOf) {
      const r = this.cfg.rows
      const p = Array.from({ length: r + 1 }, (_, k) => [this._binX(k), this.base - heightOf(k)])
      g.beginPath()
      g.moveTo(p[0][0], p[0][1])
      for (let i = 0; i < r; i++) {
        const a = p[Math.max(i - 1, 0)]
        const b = p[i]
        const c = p[i + 1]
        const e = p[Math.min(i + 2, r)]
        g.bezierCurveTo(
          b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6,
          c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6,
          c[0], c[1],
        )
      }
      g.stroke()
    },

    _draw() {
      const g = this.ctx
      const r = this.cfg.rows
      const ideal = k => (this.N * binom(r, k)) / 2 ** r
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, this.cv.width, this.cv.height)
      g.drawImage(this.bg, 0, 0)
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

      g.fillStyle = COLOR.path
      if (this.fade) {
        g.globalAlpha = 0.45 * (1 - this.fade.t)
        this._bars(g, this.fade.counts, this.fade.s)
      }
      g.globalAlpha = 0.45
      this._bars(g, this.counts, this.s)

      g.strokeStyle = COLOR.shape
      g.globalAlpha = 0.4
      g.lineWidth = 1
      g.setLineDash([4, 4])
      this._curve(g, k => ideal(k) * this.s)
      g.setLineDash([])

      g.globalAlpha = 0.6
      g.beginPath()
      g.moveTo(this.cx + 0.5, this.base)
      g.lineTo(this.cx + 0.5, this.base - ideal(r / 2) * this.s - 12)
      g.stroke()

      g.globalAlpha = 1
      if (this.counts.some(n => n > 0)) {
        g.lineWidth = 2
        this._curve(g, k => Math.min(this.counts[k] * this.s, this.binH))
      }

      const half = this.cfg.halo
      for (const b of this.balls) {
        const p = this._ballPos(b)
        g.drawImage(this.sprite, p.x - half, p.y - half, half * 2, half * 2)
      }
    },
  }

  document.documentElement.classList.add('js')
  const canvas = document.getElementById('board')
  const button = document.getElementById('board-btn')
  if (canvas && button) Board.init(canvas, button)
})()
