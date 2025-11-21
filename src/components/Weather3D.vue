<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const props = defineProps<{ condition: 'clear' | 'clouds' | 'rain' | 'snow' | 'fog', wind?: number | null, code?: number | null }>()

const container = ref<HTMLDivElement | null>(null)
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let composer: EffectComposer
let animId = 0

let particles: THREE.Object3D | null = null
let stars: THREE.Points | null = null

function setup() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.set(0, 1, 3)

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(0xffffff, 1)
  dir.position.set(5, 10, 7)
  scene.add(dir)

  const geometry = new THREE.SphereGeometry(1, 32, 32)
  const material = new THREE.MeshStandardMaterial({ color: 0x87ceeb, metalness: 0.1, roughness: 0.8 })
  const sphere = new THREE.Mesh(geometry, material)
  sphere.position.y = 0.5
  scene.add(sphere)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(300, 300)

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(300, 300), 0.6, 0.4, 0.85)
  composer.addPass(bloom)

  if (container.value) container.value.appendChild(renderer.domElement)
  updateCondition(props.condition)
  animate()
}

function updateCondition(c: 'clear' | 'clouds' | 'rain' | 'snow' | 'fog') {
  if (particles) {
    scene.remove(particles)
    if ((particles as any).geometry) (particles as any).geometry.dispose()
    const mat = (particles as any).material as THREE.Material | THREE.Material[]
    if (Array.isArray(mat)) mat.forEach(m => m.dispose())
    else mat?.dispose()
    particles = null
  }

  if (c === 'clear') {
    scene.background = new THREE.Color(0x0a2540)
    addStars()
  } else if (c === 'clouds') {
    scene.background = new THREE.Color(0xb0c4de)
    particles = makeCloudSprites()
    scene.add(particles)
  } else if (c === 'rain' || c === 'snow') {
    scene.background = new THREE.Color(c === 'rain' ? 0x263238 : 0xe2e8f0)
    particles = c === 'rain' ? makeRain() : makeSnow()
    scene.add(particles)
  } else {
    scene.background = new THREE.Color(0xCBD5E1)
    addFogPlanes()
  }
}

function animate() {
  animId = requestAnimationFrame(animate)
  if (particles) stepParticles()
  composer.render()
}

watch(() => props.condition, (c) => updateCondition(c))

onMounted(setup)
onBeforeUnmount(() => {
  cancelAnimationFrame(animId)
  renderer?.dispose()
})

function makeCloudSprites(): THREE.Group {
  const group = new THREE.Group()
  const tex = circleTexture()
  const mat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, opacity: 0.9 })
  for (let i = 0; i < 25; i++) {
    const s = new THREE.Sprite(mat)
    s.position.set(Math.random() * 4 - 2, 1 + Math.random() * 0.5, Math.random() * 2 - 1)
    s.scale.set(0.6 + Math.random() * 0.6, 0.4 + Math.random() * 0.4, 1)
    group.add(s)
  }
  return group
}

function makeRain(): THREE.LineSegments {
  const count = 800
  const geom = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 6)
  for (let i = 0; i < count; i++) {
    const x = Math.random() * 4 - 2
    const y = Math.random() * 3
    const z = Math.random() * 4 - 2
    positions.set([x, y, z, x, y - 0.2, z], i * 6)
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.LineBasicMaterial({ color: 0x46a9ff, transparent: true, opacity: 0.8 })
  return new THREE.LineSegments(geom, mat)
}

function makeSnow(): THREE.Points {
  const count = 800
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = Math.random() * 4 - 2
    positions[i * 3 + 1] = Math.random() * 3
    positions[i * 3 + 2] = Math.random() * 4 - 2
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.9 })
  return new THREE.Points(geom, mat)
}

function stepParticles() {
  if (!particles) return
  const wind = Math.min(Math.max(props.wind ?? 0, 0), 20)
  if ((particles as THREE.LineSegments).isLineSegments) {
    const arr = ((particles as THREE.LineSegments).geometry.getAttribute('position') as THREE.BufferAttribute)
    for (let i = 0; i < arr.count; i += 2) {
      let x1 = arr.getX(i)
      let y1 = arr.getY(i)
      let z1 = arr.getZ(i)
      let x2 = arr.getX(i+1)
      let y2 = arr.getY(i+1)
      let z2 = arr.getZ(i+1)
      x1 += wind * 0.01
      x2 += wind * 0.01
      y1 -= 0.08
      y2 -= 0.08
      if (y2 < 0) {
        y1 = 3
        y2 = 2.8
        x1 = Math.random() * 4 - 2
        x2 = x1
        z1 = Math.random() * 4 - 2
        z2 = z1
      }
      arr.setXYZ(i, x1, y1, z1)
      arr.setXYZ(i+1, x2, y2, z2)
    }
    arr.needsUpdate = true
  } else if ((particles as THREE.Points).isPoints) {
    const arr = ((particles as THREE.Points).geometry.getAttribute('position') as THREE.BufferAttribute)
    for (let i = 0; i < arr.count; i++) {
      let x = arr.getX(i)
      let y = arr.getY(i)
      let z = arr.getZ(i)
      x += (Math.sin(i * 0.1) * 0.002) + wind * 0.005
      y -= 0.02
      if (y < 0) {
        y = 3
        x = Math.random() * 4 - 2
        z = Math.random() * 4 - 2
      }
      arr.setXYZ(i, x, y, z)
    }
    arr.needsUpdate = true
  }
}

function addStars() {
  if (stars) return
  const count = 300
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    pos[i * 3 + 0] = Math.random() * 6 - 3
    pos[i * 3 + 1] = Math.random() * 3 + 1.5
    pos[i * 3 + 2] = Math.random() * 6 - 3
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03 })
  stars = new THREE.Points(g, m)
  scene.add(stars)
}

function addFogPlanes() {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 1), m)
    p.position.set(0, 0.6 + i * 0.4, -1)
    scene.add(p)
  }
}

function circleTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size/2, size/2, 10, size/2, size/2, size/2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.Texture(canvas)
  tex.needsUpdate = true
  return tex
}
</script>

<template>
  <div ref="container" class="w-[300px] h-[300px] rounded-xl overflow-hidden shadow-lg"></div>
</template>

<style scoped>
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1) }
</style>