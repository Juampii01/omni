"use client"

import { useEffect } from "react"

/** Maneja el reveal-on-scroll y el nav que se opaca al scrollear. Render: nada. */
export function LandingFx() {
  useEffect(() => {
    const nav = document.getElementById("lp-nav")
    const onScroll = () => nav?.classList.toggle("scrolled", window.scrollY > 30)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in")
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.18 },
    )
    document.querySelectorAll(".lp .reveal:not(.in)").forEach((el) => io.observe(el))

    return () => {
      window.removeEventListener("scroll", onScroll)
      io.disconnect()
    }
  }, [])

  return null
}
