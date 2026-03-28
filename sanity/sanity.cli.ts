import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    // TODO: Replace with your actual Sanity project ID and dataset
    projectId: 'your-project-id',
    dataset: 'production',
  },
})
