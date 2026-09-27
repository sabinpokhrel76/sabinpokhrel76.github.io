// Timeline intervals draw once when the plot is 30% in view (DESIGN.md sec. 5).
;(() => {
  const section = document.querySelector('.timeline')
  if (!section || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const all = []
  for (const svg of section.querySelectorAll('svg.tl-h, svg.tl-v')) {
    if (!svg.getBoundingClientRect().width) continue
    const start = svg.classList.contains('tl-v') ? 'y1' : 'x1'
    const lines = [...svg.querySelectorAll('line[pathLength]')].sort(
      (a, b) => parseFloat(a.getAttribute(start)) - parseFloat(b.getAttribute(start)),
    )
    lines.forEach((line, i) => {
      // Chrome ignores pathLength on <line>, so dash by the real length.
      const len = line.getTotalLength()
      line.style.strokeDasharray = `${len}`
      line.style.strokeDashoffset = `${len}`
      line.style.transitionDelay = `${i * 120}ms`
      all.push(line)
    })
    for (const dot of svg.querySelectorAll('circle')) dot.style.transitionDelay = `${lines.length * 120 + 180}ms`
  }
  section.classList.add('undrawn')
  new IntersectionObserver(
    ([e], obs) => {
      if (!e.isIntersecting) return
      section.classList.remove('undrawn')
      for (const line of all) line.style.strokeDashoffset = '0'
      // Lengths were measured at load; drop the dash once drawn so a resize cannot cut a line short.
      setTimeout(() => all.forEach(line => (line.style.strokeDasharray = 'none')), all.length * 120 + 800)
      obs.disconnect()
    },
    { threshold: 0.3 },
  ).observe(section)
})()
