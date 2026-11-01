/**
 * 3B atlas organ listesi — BodyParts3D (CC BY 4.0) mesh'lerinden üretilen GLB'ler.
 * GLB'ler: /public/anatomy/3d/glb/<slug>.glb (scripts/build-anatomy-glb.py)
 */
import type { AnatomyVariant, RegionId, SystemId } from '@/lib/anatomy-regions'

export interface AtlasOrgan {
  slug: string
  /** dashboard bölgesi (yoksa yalnız 3B vurgusu) */
  region: RegionId | null
  system: SystemId | null
  name: string
  color: string
}

export const SKIN_SLUG = 'skin'
export const SKIN_COLOR = '#a0907a'
export const SKIN_OPACITY = 0.16
export const SELECT_COLOR = '#f3a257'

export const ATLAS_ORGANS: AtlasOrgan[] = [
  { slug: 'brain', region: null, system: 'nervous', name: 'Beyin', color: '#9a72aa' },
  { slug: 'lungs', region: 'lungs', system: 'respiratory', name: 'Akciğerler', color: '#8fb0d0' },
  { slug: 'heart', region: 'heart', system: 'cardiovascular', name: 'Kalp', color: '#eb7a54' },
  { slug: 'liver', region: 'liver', system: 'digestive', name: 'Karaciğer', color: '#8a6a5a' },
  { slug: 'gallbladder', region: null, system: 'digestive', name: 'Safra kesesi', color: '#a0907a' },
  { slug: 'stomach', region: 'stomach', system: 'digestive', name: 'Mide', color: '#a0907a' },
  { slug: 'pancreas', region: null, system: 'digestive', name: 'Pankreas', color: '#ebd3a2' },
  { slug: 'spleen', region: null, system: null, name: 'Dalak', color: '#96d1aa' },
  { slug: 'kidneys', region: null, system: null, name: 'Böbrekler', color: '#8fb0d0' },
  { slug: 'adrenals', region: null, system: null, name: 'Adrenal bezler', color: '#ebd3a2' },
  { slug: 'small-intestine', region: 'intestine', system: 'digestive', name: 'İnce bağırsak', color: '#a0907a' },
  { slug: 'large-intestine', region: 'intestine', system: 'digestive', name: 'Kalın bağırsak', color: '#a0907a' },
  { slug: 'bladder', region: null, system: null, name: 'Mesane', color: '#8fb0d0' },
  { slug: 'prostate', region: null, system: null, name: 'Prostat', color: '#eb7a54' },
]

/** BodyParts3D erkek modeldir; prostat yalnız erkek/demo varyantında gösterilir. */
export function atlasOrgansForVariant(variant: AnatomyVariant | null): AtlasOrgan[] {
  return ATLAS_ORGANS.filter(organ => organ.slug !== 'prostate' || variant !== 'female')
}
