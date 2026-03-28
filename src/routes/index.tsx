import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '../components/Hero'
import { About } from '../components/About'
import { Services } from '../components/Services'
import { Projects } from '../components/Projects'
import { QuoteForm } from '../components/QuoteForm'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <main>
      <Hero />
      <About />
      <Services />
      <Projects />
      <QuoteForm />
    </main>
  )
}
