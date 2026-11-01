'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  SELECT_COLOR,
  SKIN_COLOR,
  SKIN_OPACITY,
  SKIN_SLUG,
  type AtlasOrgan,
} from '@/lib/anatomy/atlas'

const TAP_THRESHOLD = 36
const glb = (slug: string) => `/anatomy/3d/glb/${slug}.glb`

export interface AnatomySceneProps {
  organs: AtlasOrgan[]
  /** vurgulanacak (sarı) organ slug'ları */
  highlighted: string[]
  onPick: (slug: string | null) => void
}

function Skin() {
  const { scene } = useGLTF(glb(SKIN_SLUG))
  const object = useMemo(() => {
    const clone = scene.clone(true)
    const material = new THREE.MeshStandardMaterial({
      color: SKIN_COLOR,
      transparent: true,
      opacity: SKIN_OPACITY,
      depthWrite: false,
      roughness: 0.9,
      metalness: 0,
    })
    clone.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = material
        child.raycast = () => null // silüet dokunmayı engellemez
        child.renderOrder = 2
      }
    })
    return clone
  }, [scene])
  useEffect(() => () => {
    object.traverse(child => {
      if (child instanceof THREE.Mesh) (child.material as THREE.Material).dispose()
    })
  }, [object])
  return <primitive object={object} />
}

function Organ({
  organ,
  state,
  onTap,
}: {
  organ: AtlasOrgan
  state: 'normal' | 'selected' | 'dim'
  onTap: (slug: string) => void
}) {
  const { scene } = useGLTF(glb(organ.slug))
  const down = useRef<{ x: number; y: number } | null>(null)
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: organ.color, roughness: 0.62, metalness: 0.02 }),
    [organ.color],
  )
  const object = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(child => {
      if (child instanceof THREE.Mesh) child.material = material
    })
    return clone
  }, [scene, material])

  useEffect(() => {
    const selected = state === 'selected'
    const dim = state === 'dim'
    material.color.set(selected ? SELECT_COLOR : organ.color)
    material.emissive.set(selected ? SELECT_COLOR : '#000000')
    material.emissiveIntensity = selected ? 0.35 : 0
    material.transparent = dim
    material.opacity = dim ? 0.3 : 1
    material.depthWrite = !dim
    material.needsUpdate = true
  }, [state, material, organ.color])
  useEffect(() => () => material.dispose(), [material])

  return (
    <primitive
      object={object}
      onPointerDown={(event: ThreeEvent<PointerEvent>) => {
        down.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerUp={(event: ThreeEvent<PointerEvent>) => {
        const start = down.current
        down.current = null
        if (!start) return
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_THRESHOLD) return
        event.stopPropagation()
        onTap(organ.slug)
      }}
    />
  )
}

/** GLB'ler asenkron yüklenir: kamera useFrame içinde, kutu boş değilse bir kez oturur. */
function CameraFit({ target }: { target: React.RefObject<THREE.Group | null> }) {
  const camera = useThree(state => state.camera)
  const controls = useThree(state => state.controls) as OrbitControlsImpl | null
  const fitted = useRef(false)
  useFrame(() => {
    const root = target.current
    if (fitted.current || !root) return
    root.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(root)
    if (box.isEmpty()) return
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const persp = camera as THREE.PerspectiveCamera
    const halfFov = THREE.MathUtils.degToRad(persp.fov / 2)
    const fitHeight = (size.y / 2 / Math.tan(halfFov)) * 1.12 + size.z / 2 // tüm boy sığsın
    const distance = Math.max(Math.max(size.x, size.y, size.z) * 1.55, fitHeight)
    camera.position.set(center.x, center.y, center.z + distance)
    camera.near = distance / 100
    camera.far = distance * 10
    camera.updateProjectionMatrix()
    camera.lookAt(center)
    if (controls) {
      controls.target.copy(center)
      controls.minDistance = distance * 0.25
      controls.maxDistance = distance * 1.6
      controls.update()
    }
    fitted.current = true
  })
  return null
}

export default function AnatomyScene({ organs, highlighted, onPick }: AnatomySceneProps) {
  const root = useRef<THREE.Group>(null)
  const active = new Set(highlighted)
  const anySelected = active.size > 0

  return (
    <Canvas
      camera={{ fov: 32, near: 0.5, far: 2000, position: [0, 0, 250] }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => onPick(null)}
      style={{ touchAction: 'none' }}
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#ffffff', '#2a2418', 0.7]} />
      <directionalLight position={[60, 120, 160]} intensity={1.6} />
      <directionalLight position={[-80, 40, -120]} intensity={0.5} />
      {/* BodyParts3D: Z yukarı, -Y ön → Y-yukarı sahneye çevir */}
      <group ref={root} rotation={[-Math.PI / 2, 0, 0]}>
        <Suspense fallback={null}>
          <Skin />
          {organs.map(organ => (
            <Organ
              key={organ.slug}
              organ={organ}
              state={active.has(organ.slug) ? 'selected' : anySelected ? 'dim' : 'normal'}
              onTap={onPick}
            />
          ))}
        </Suspense>
      </group>
      <CameraFit target={root} />
      <OrbitControls makeDefault enableDamping enablePan={false} />
    </Canvas>
  )
}
