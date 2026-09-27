// Forest plot of adjusted odds ratios from the stunting project (Table 3, final model).
;(() => {
  const svg = document.getElementById('forest')
  const caption = document.getElementById('forest-say')
  if (!svg || !caption) return

  // label, compared with, adjusted OR, CI low, CI high
  const ROWS = [
    ['Age 0 to 11 months', 'age 24 to 35 months', 0.34, 0.22, 0.51],
    ['Average or larger at birth', 'very small at birth', 0.18, 0.09, 0.35],
    ['Smaller than average at birth', 'very small at birth', 0.45, 0.21, 0.97],
    ['Birth gap under 24 months', 'a gap of 48 months or more', 1.75, 1.03, 2.98],
    ['Birth gap 24 to 47 months', 'a gap of 48 months or more', 2.19, 1.41, 3.39],
    ['Mother with no education', 'mothers with higher education', 3.32, 1.1, 10.02],
    ['Mother with basic education', 'mothers with higher education', 2.61, 0.9, 7.6],
    ['Poorest homes', 'the richest homes', 2.14, 1.11, 4.12],
    ['Household of 4 or fewer', 'households of 8 or more', 0.65, 0.42, 0.99],
    ['Unimproved toilet', 'an improved toilet', 1.35, 0.85, 2.14],
    ['Boys', 'girls', 1.15, 0.86, 1.54],
    ['Urban home', 'a rural home', 0.83, 0.6, 1.13],
  ]
  const TICKS = [0.1, 0.25, 0.5, 1, 2, 4, 10]
  const NS = 'http://www.w3.org/2000/svg'
  const ROW_H = 30
  const TOP = 8
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const color = ([, , or, lo, hi]) => (lo > 1 ? '#ffb35c' : hi < 1 ? '#86e1ee' : '#95a2bf')

  const el = (name, attrs, parent = svg) => {
    const node = document.createElementNS(NS, name)
    for (const k in attrs) node.setAttribute(k, attrs[k])
    parent.appendChild(node)
    return node
  }

  const say = ([label, ref, or, lo, hi]) => {
    const ci = `95% CI ${lo.toFixed(2)} to ${hi.toFixed(2)}`
    if (lo <= 1 && hi >= 1) return `${label}: odds ratio ${or} compared with ${ref} (${ci}). The interval crosses 1, so no clear effect once the other factors are taken into account.`
    if (or > 1) return `${label}: ${or} times the odds of stunting compared with ${ref} (${ci}).`
    return `${label}: ${Math.round((1 - or) * 100)}% lower odds of stunting than ${ref} (${ci}).`
  }

  let rows = []
  const build = () => {
    const phone = innerWidth < 720
    const W = phone ? 380 : 1000
    const LABEL = phone ? 178 : 280
    const R = W - 12
    const H = TOP + ROWS.length * ROW_H + 34
    const X = v => LABEL + ((Math.log(v) - Math.log(0.1)) / (Math.log(10) - Math.log(0.1))) * (R - LABEL)
    svg.replaceChildren()
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    const axisY = TOP + ROWS.length * ROW_H + 4
    for (const t of phone ? [0.1, 0.5, 1, 2, 10] : TICKS) {
      el('line', { x1: X(t), y1: TOP, x2: X(t), y2: axisY, stroke: t === 1 ? '#95a2bf' : '#1a2540', 'stroke-dasharray': t === 1 ? '4 4' : '' })
      el('text', { x: X(t), y: axisY + 18, 'text-anchor': 'middle', class: 'f-tick' }).textContent = t
    }
    rows = ROWS.map((row, i) => {
      const y = TOP + i * ROW_H + ROW_H / 2
      const g = el('g', { class: 'f-row', tabindex: 0, role: 'button', 'aria-label': say(row) })
      el('rect', { x: 0, y: y - ROW_H / 2, width: W, height: ROW_H, class: 'f-hit' }, g)
      el('text', { x: 0, y: y + 5, class: 'f-label' }, g).textContent = row[0]
      const c = color(row)
      const line = el('line', { x1: X(1), y1: y, x2: X(1), y2: y, stroke: c, 'stroke-width': 2 }, g)
      const dot = el('rect', { x: X(1) - 5, y: y - 5, width: 10, height: 10, fill: c }, g)
      const pick = () => {
        caption.textContent = say(row)
        for (const r of rows) r.g.classList.toggle('on', r.g === g)
      }
      g.addEventListener('click', pick)
      g.addEventListener('focus', pick)
      return { g, line, dot, row, X }
    })
  }

  // Each interval grows out from 1 to its ends, and the square slides to the odds ratio.
  const reveal = () => {
    rows.forEach(({ line, dot, row, X }, i) => {
      const [, , or, lo, hi] = row
      const set = f => {
        line.setAttribute('x1', X(1) + (X(lo) - X(1)) * f)
        line.setAttribute('x2', X(1) + (X(hi) - X(1)) * f)
        dot.setAttribute('x', X(1) + (X(or) - X(1)) * f - 5)
      }
      if (reduced) return set(1)
      const start = performance.now() + i * 80
      const step = now => {
        const f = Math.min(Math.max((now - start) / 600, 0), 1)
        set(1 - (1 - f) ** 3)
        if (f < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
  }

  build()
  let shown = false
  new IntersectionObserver(
    ([e], obs) => {
      if (!e.isIntersecting) return
      shown = true
      reveal()
      obs.disconnect()
    },
    { threshold: 0.3 },
  ).observe(svg)
  let wasPhone = innerWidth < 720
  let timer
  addEventListener('resize', () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if ((innerWidth < 720) === wasPhone) return
      wasPhone = !wasPhone
      build()
      if (shown) reveal()
    }, 150)
  })
})()
