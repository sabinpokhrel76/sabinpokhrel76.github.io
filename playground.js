// "A class of 40": move the average and the spread, watch the curve, the dots and the box plot follow.
;(() => {
  const svg = document.getElementById('pg')
  const mu = document.getElementById('pg-mu')
  const sigma = document.getElementById('pg-sigma')
  const shuffle = document.getElementById('pg-new')
  const stat = id => document.getElementById(id)
  const band = document.getElementById('pg-band')
  if (!svg || !mu || !sigma) return

  const NS = 'http://www.w3.org/2000/svg'
  let W, L, R, STEP
  const BASE = 230
  const K = 4200 // curve height scale: peak 210px at σ = 8, the area stays the same
  const X = score => L + (score / 100) * (R - L)
  const pdf = (x, m, s) => Math.exp(-(((x - m) / s) ** 2) / 2) / (s * Math.sqrt(2 * Math.PI))
  // 40 evenly spread normal quantiles: a perfectly "normal" class to start with.
  let z = [
    -2.241, -1.78, -1.534, -1.356, -1.213, -1.092, -0.984, -0.887, -0.798, -0.714, -0.636, -0.561, -0.489, -0.419,
    -0.352, -0.286, -0.221, -0.157, -0.094, -0.031, 0.031, 0.094, 0.157, 0.221, 0.286, 0.352, 0.419, 0.489, 0.561,
    0.636, 0.714, 0.798, 0.887, 0.984, 1.092, 1.213, 1.356, 1.534, 1.78, 2.241,
  ]

  const el = (name, attrs, parent = svg) => {
    const node = document.createElementNS(NS, name)
    for (const k in attrs) node.setAttribute(k, attrs[k])
    parent.appendChild(node)
    return node
  }
  const quantile = (sorted, q) => {
    const i = (sorted.length - 1) * q
    const lo = Math.floor(i)
    return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo)
  }
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random())
  const r1 = v => Math.round(v * 10) / 10

  let shade, dots, curve, muLine, box

  // Phones get a narrower drawing so the chart keeps a readable size.
  const build = () => {
    const phone = innerWidth < 720
    W = phone ? 440 : 760
    L = phone ? 12 : 40
    R = W - L
    STEP = phone ? 20 : 10
    svg.replaceChildren()
    svg.setAttribute('viewBox', `0 ${BASE - 225} ${W} 325`)
    el('line', { x1: L, y1: BASE, x2: R, y2: BASE, stroke: '#95a2bf' })
    for (let s = 0; s <= 100; s += STEP) {
      el('line', { x1: X(s), y1: BASE, x2: X(s), y2: BASE + 6, stroke: '#95a2bf' })
      el('text', { x: X(s), y: BASE + 24, 'text-anchor': 'middle', class: 'pg-tick' }).textContent = s
    }
    shade = el('path', { fill: '#86e1ee', 'fill-opacity': 0.12 })
    dots = el('g', { fill: '#ffb35c', 'fill-opacity': 0.85 })
    curve = el('path', { fill: 'none', stroke: '#86e1ee', 'stroke-width': 2 })
    muLine = el('line', { stroke: '#86e1ee', 'stroke-opacity': 0.6 })
    box = el('g', { stroke: '#efe3bf', 'stroke-width': 1.5, fill: 'none' })
  }

  const draw = () => {
    const m = +mu.value
    const s = +sigma.value
    const scores = z.map(v => Math.min(100, Math.max(0, m + s * v)))

    let d = ''
    let a = ''
    for (let x = 0; x <= 100; x += 0.5) {
      const y = BASE - pdf(x, m, s) * K
      d += `${x ? 'L' : 'M'}${X(x).toFixed(1)} ${y.toFixed(1)}`
      if (x >= m - s && x <= m + s) a += `${a ? 'L' : 'M'}${X(x).toFixed(1)} ${y.toFixed(1)}`
    }
    curve.setAttribute('d', d)
    const lo = Math.max(0, m - s)
    const hi = Math.min(100, m + s)
    shade.setAttribute('d', a ? `${a}L${X(hi)} ${BASE}L${X(lo)} ${BASE}Z` : '')
    muLine.setAttribute('x1', X(m))
    muLine.setAttribute('x2', X(m))
    muLine.setAttribute('y1', BASE)
    muLine.setAttribute('y2', BASE - pdf(m, m, s) * K - 12)

    // Dot plot: one dot per student, stacked in 2.5-point bins.
    dots.replaceChildren()
    const stack = {}
    for (const v of scores) {
      const bin = Math.round(v / 2.5) * 2.5
      stack[bin] = (stack[bin] || 0) + 1
      el('circle', { cx: X(bin), cy: BASE - 6 - (stack[bin] - 1) * 10, r: W < 700 ? 3.5 : 4.5 }, dots)
    }

    // Box plot under the axis, from the class's own scores.
    const sorted = [...scores].sort((p, q) => p - q)
    const [q1, med, q3] = [0.25, 0.5, 0.75].map(q => quantile(sorted, q))
    const y = BASE + 62
    box.replaceChildren()
    el('line', { x1: X(sorted[0]), y1: y, x2: X(q1), y2: y }, box)
    el('line', { x1: X(q3), y1: y, x2: X(sorted.at(-1)), y2: y }, box)
    el('rect', { x: X(q1), y: y - 14, width: X(q3) - X(q1), height: 28 }, box)
    el('line', { x1: X(med), y1: y - 14, x2: X(med), y2: y + 14, 'stroke-width': 2.5 }, box)
    for (const v of [sorted[0], sorted.at(-1)]) el('line', { x1: X(v), y1: y - 8, x2: X(v), y2: y + 8 }, box)

    const mean = scores.reduce((p, q) => p + q, 0) / scores.length
    const sd = Math.sqrt(scores.reduce((p, q) => p + (q - mean) ** 2, 0) / (scores.length - 1))
    band.textContent = `About 68% of the class scores between ${Math.round(lo)} and ${Math.round(hi)}.`
    stat('pg-mean').textContent = r1(mean)
    stat('pg-median').textContent = r1(med)
    stat('pg-sd').textContent = r1(sd)
    stat('pg-iqr').textContent = `${Math.round(q1)} to ${Math.round(q3)}`
    document.getElementById('pg-mu-v').textContent = m
    document.getElementById('pg-sigma-v').textContent = s
  }

  mu.addEventListener('input', draw)
  sigma.addEventListener('input', draw)
  shuffle.addEventListener('click', () => {
    z = Array.from({ length: 40 }, gauss)
    draw()
  })
  let resizeTimer
  let wasPhone = innerWidth < 720
  addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if ((innerWidth < 720) === wasPhone) return
      wasPhone = !wasPhone
      build()
      draw()
    }, 150)
  })
  build()
  draw()
})()
