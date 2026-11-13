import { useState } from 'react'
import { MapPin, Star, X } from 'lucide-react'
import { facebookBanner, projects, siteSettings } from '../content'

export function Projects() {
  const [lightboxProject, setLightboxProject] = useState<number | null>(null)
  const facebookUrl = siteSettings.facebookUrl

  const displayProjects = projects

  return (
    <section id="projects" className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="text-center mb-4">
          <span className="section-badge">Our Work</span>
          <h2 className="mt-4 font-heading text-3xl sm:text-4xl font-bold text-primary">
            Recent Projects
          </h2>
          <p className="mt-3 text-text-muted">
            See our quality workmanship in action across Port Elizabeth
          </p>
        </div>

        {/* Project cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayProjects.map((project, index) => (
            <div
              key={project.id}
              className="group rounded-2xl border border-gray-200 bg-white overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
              onClick={() => setLightboxProject(index)}
            >
              {/* Cover image or placeholder */}
              <div className="h-48 bg-gradient-to-br from-surface to-light flex items-center justify-center overflow-hidden">
                {project.coverImagePath ? (
                  <img
                    src={project.coverImagePath}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-16 h-16 text-accent/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                )}
              </div>

              <div className="p-5">
                <h3 className="font-heading text-lg font-bold text-primary">
                  {project.title}
                </h3>
                {project.location && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-text-muted">
                    <MapPin size={14} />
                    {project.location}
                  </div>
                )}
                <p className="mt-3 text-sm text-text-muted leading-relaxed">
                  {project.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: project.rating ?? 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className="fill-accent text-accent"
                      />
                    ))}
                  </div>
                  {project.status && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      {project.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Facebook integration card */}
        <div className="mt-12 rounded-2xl border border-accent bg-gradient-to-br from-primary to-secondary p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg
              className="w-6 h-6 text-light"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <h4 className="font-heading text-lg font-bold text-white">
              {facebookBanner.heading}
            </h4>
          </div>
          <p className="text-light mb-4">{facebookBanner.subtitle}</p>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-light px-6 py-2.5 text-sm font-semibold text-primary no-underline hover:bg-accent hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Visit Facebook Page
          </a>
        </div>
      </div>

      {/* Lightbox modal */}
      {lightboxProject !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxProject(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxProject(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-dark bg-transparent border-none cursor-pointer"
            >
              <X size={24} />
            </button>
            <h3 className="font-heading text-xl font-bold text-primary mb-2">
              {displayProjects[lightboxProject].title}
            </h3>
            {displayProjects[lightboxProject].location && (
              <div className="flex items-center gap-1 text-sm text-text-muted mb-4">
                <MapPin size={14} />
                {displayProjects[lightboxProject].location}
              </div>
            )}
            <div className="aspect-video rounded-xl bg-gradient-to-br from-surface to-light flex items-center justify-center mb-4 overflow-hidden">
              {displayProjects[lightboxProject].coverImagePath ? (
                <img
                  src={displayProjects[lightboxProject].coverImagePath}
                  alt={displayProjects[lightboxProject].title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <p className="text-text-muted text-sm">
                  Project photos will be displayed here
                </p>
              )}
            </div>
            <p className="text-text-muted">
              {displayProjects[lightboxProject].description}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
