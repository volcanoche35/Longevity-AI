// GLB doğrulama: three GLTFLoader ile parse
globalThis.self = globalThis
globalThis.window = globalThis
globalThis.document = { createElementNS: () => ({}), createElement: () => ({}) }
if (!globalThis.navigator) globalThis.navigator = { userAgent: 'node' }
globalThis.URL.createObjectURL = globalThis.URL.createObjectURL || (() => '')
import fs from 'node:fs'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
const dir = new URL('../public/anatomy/3d/glb/', import.meta.url).pathname
const loader = new GLTFLoader()
let fail = 0
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.glb')).sort()) {
  const buf = fs.readFileSync(dir + f)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  try {
    const gltf = await new Promise((res, rej) => loader.parse(ab, '', res, rej))
    let meshes = 0, tris = 0
    gltf.scene.traverse(o => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 } })
    const b = new THREE.Box3().setFromObject(gltf.scene)
    console.log(f.padEnd(20), 'meshes', meshes, 'tris', tris, 'size', (buf.length / 1024).toFixed(1) + 'KB', 'box', b.min.toArray().map(n => n.toFixed(0)).join(','), '->', b.max.toArray().map(n => n.toFixed(0)).join(','))
  } catch (e) { fail++; console.log(f, 'HATA', e.message) }
}
process.exit(fail ? 1 : 0)
