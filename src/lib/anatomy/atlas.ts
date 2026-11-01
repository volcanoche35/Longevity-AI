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
export const SKIN_COLOR = '#cbb9a8'
export const SKIN_OPACITY = 0.16
export const SELECT_COLOR = '#ffd35c'

export const ATLAS_ORGANS: AtlasOrgan[] = [
  { slug: 'brain', region: null, system: 'nervous', name: 'Beyin', color: '#b9a6c9' },
  { slug: 'lungs', region: 'lungs', system: 'respiratory', name: 'Akciğerler', color: '#9fb0be' },
  { slug: 'heart', region: 'heart', system: 'cardiovascular', name: 'Kalp', color: '#c5a08a' },
  { slug: 'liver', region: 'liver', system: 'digestive', name: 'Karaciğer', color: '#b98f82' },
  { slug: 'gallbladder', region: null, system: 'digestive', name: 'Safra kesesi', color: '#b9a895' },
  { slug: 'stomach', region: 'stomach', system: 'digestive', name: 'Mide', color: '#b9a895' },
  { slug: 'pancreas', region: null, system: 'digestive', name: 'Pankreas', color: '#c5b18e' },
  { slug: 'spleen', region: null, system: null, name: 'Dalak', color: '#aabf91' },
  { slug: 'kidneys', region: null, system: null, name: 'Böbrekler', color: '#9db7b1' },
  { slug: 'adrenals', region: null, system: null, name: 'Adrenal bezler', color: '#c5b18e' },
  { slug: 'small-intestine', region: 'intestine', system: 'digestive', name: 'İnce bağırsak', color: '#b9a895' },
  { slug: 'large-intestine', region: 'intestine', system: 'digestive', name: 'Kalın bağırsak', color: '#b9a895' },
  { slug: 'bladder', region: null, system: null, name: 'Mesane', color: '#9db7b1' },
  { slug: 'prostate', region: null, system: null, name: 'Prostat', color: '#c7a6a1' },
]

/** BodyParts3D erkek modeldir; prostat yalnız erkek/demo varyantında gösterilir. */
export function atlasOrgansForVariant(variant: AnatomyVariant | null): AtlasOrgan[] {
  return ATLAS_ORGANS.filter(organ => organ.slug !== 'prostate' || variant !== 'female')
}
