import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'winzelle-projects',
  title: 'Winzelle Projects CMS',
  // TODO: Replace with your actual Sanity project ID and dataset
  projectId: 'your-project-id',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
})
