import { Studio } from 'sanity'
import config from '../../sanity/sanity.config'

export default function SanityStudioWrapper() {
  return (
    <div
      style={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 100 }}
    >
      <Studio config={config} />
    </div>
  )
}
