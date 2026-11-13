import { useState } from 'react'
import {
  Droplets,
  ShieldCheck,
  Flame,
  Wrench,
  Home,
  Building2,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react'
import { services, type ServiceIconName } from '../content'

const iconMap: Record<ServiceIconName, LucideIcon> = {
  Droplets,
  ShieldCheck,
  Flame,
  Wrench,
  Home,
  Building2,
}

export function Services() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const displayServices = [...services].sort(
    (first, second) => first.displayOrder - second.displayOrder
  )

  return (
    <section id="services" className="py-20 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-primary">
            Our Services
          </h2>
          <p className="mt-3 text-text-muted">
            Comprehensive solutions for all your construction needs
          </p>
          <div className="section-underline" />
        </div>

        {/* Service cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayServices.map((service) => {
            const isExpanded = expanded === service.id
            const IconComponent = iconMap[service.icon]
            return (
              <div
                key={service.id}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : service.id)}
              >
                <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary text-light">
                  <IconComponent size={24} />
                </div>
                <h3 className="font-heading text-lg font-bold text-primary mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed mb-3">
                  {service.description}
                </p>

                {/* Expand/collapse indicator */}
                <button className="flex items-center gap-1 text-xs font-medium text-accent bg-transparent border-none cursor-pointer p-0">
                  {isExpanded ? 'Show less' : 'View details'}
                  {isExpanded ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>

                {/* Expanded detail list */}
                {isExpanded && service.details.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                    {service.details.map((detail) => (
                      <li
                        key={detail}
                        className="flex items-center gap-2 text-sm text-text-dark"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA below grid */}
        <div className="mt-12 text-center">
          <a
            href="#quote"
            className="inline-flex items-center rounded-full bg-light px-8 py-3 text-base font-semibold text-primary no-underline hover:bg-accent hover:text-white hover:shadow-lg transition-all"
          >
            Request a Free Quote
          </a>
        </div>
      </div>
    </section>
  )
}
