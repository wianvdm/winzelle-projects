export function FacebookBanner() {
  return (
    <section className="py-12 bg-gradient-to-r from-navy via-navy-light to-steel">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
              <svg
                className="w-7 h-7 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <h3 className="font-heading text-xl font-bold text-white">
                Follow Us on Facebook
              </h3>
            </div>
            <p className="text-sm text-gray-300 mb-1">
              Stay updated with our latest projects and receive exclusive
              insights
            </p>
            <p className="text-sm text-gray-400">
              We regularly update our Facebook page with photos and details of
              our completed projects. See our work in progress and finished
              results from locations across Port Elizabeth.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-6 py-2.5 text-sm font-semibold text-white no-underline hover:bg-white/10 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Visit Our Facebook Page
            </a>
            <a
              href="#projects"
              className="inline-flex items-center rounded-full border-2 border-white/10 px-6 py-2.5 text-sm font-semibold text-gray-300 no-underline hover:bg-white/5 transition-colors"
            >
              View Project Gallery
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
