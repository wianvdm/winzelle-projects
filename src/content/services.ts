import type { Service } from './types.ts'

// Canonical sources: the six published `service` documents, ordered by
// displayOrder ascending exactly as the frontend GROQ query returns them.
export const services: Service[] = [
  {
    id: 'service-waterproofing',
    title: 'Waterproofing',
    icon: 'Droplets',
    description:
      'Professional waterproofing solutions for roofs, balconies, and foundations using premium materials and proven techniques.',
    details: [
      'Roof waterproofing',
      'Balcony and deck waterproofing',
      'Foundation waterproofing',
      'Below-ground waterproofing',
      'Membrane installation',
    ],
    displayOrder: 1,
  },
  {
    id: 'service-damp-sealing',
    title: 'Damp Sealing',
    icon: 'ShieldCheck',
    description:
      'Expert damp proofing and sealing services to protect your property from moisture damage and rising damp.',
    details: [
      'Rising damp treatment',
      'Liquid latex damp sealing',
      'Moisture barrier installation',
      'Wall damp proofing',
      'Basement sealing',
    ],
    displayOrder: 2,
  },
  {
    id: 'service-bitumen',
    title: 'Bitumen Torch-On',
    icon: 'Flame',
    description:
      'High-quality torch-on waterproofing systems for flat roofs and other surfaces requiring durable protection.',
    details: [
      'Flat roof torch-on systems',
      'Multi-layer applications',
      'Surface preparation and priming',
      'Joint and flashing sealing',
      'Maintenance and re-coating',
    ],
    displayOrder: 3,
  },
  {
    id: 'service-general-repairs',
    title: 'General Repairs',
    icon: 'Wrench',
    description:
      'Comprehensive repair and maintenance services for residential and commercial properties.',
    details: [
      'Paving repairs and re-levelling',
      'Door and window repairs',
      'Interior and exterior painting',
      'Building repairs',
      'Roof painting and repairs',
    ],
    displayOrder: 4,
  },
  {
    id: 'service-maintenance',
    title: 'Maintenance',
    icon: 'Home',
    description:
      'Regular maintenance programs to keep your property in optimal condition and prevent costly repairs.',
    details: [
      'Routine property inspections',
      'Preventative maintenance plans',
      'Roof maintenance',
      'Exterior upkeep',
      'Property handover maintenance',
    ],
    displayOrder: 5,
  },
  {
    id: 'service-structural',
    title: 'Structural Repairs',
    icon: 'Building2',
    description:
      'Specialized structural repair services for foundation cracks, subsidence, and spalling damage.',
    details: [
      'Foundation crack repairs',
      'Subsidence repairs',
      'Spalling concrete repairs',
      'Structural crack stitching',
      'Scaffold erecting and inspections',
      'Roof reports and assessments',
    ],
    displayOrder: 6,
  },
]
