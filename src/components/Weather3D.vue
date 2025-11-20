<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps<{ condition: 'clear' | 'clouds' | 'rain' | 'snow' | 'fog', wind?: number }>()

const container = ref<HTMLDivElement | null>(null)
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let animId = 0

let particles: THREE.Points | null = null
let cloudGroup: THREE.Group | null = null
let sun: THREE.Mesh | null = null
let angle = 0
let windFactor = 0

function setup() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.set(0, 1, 3)

  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(0xffffff, 1)
  dir.position.set(5, 10, 7)
  scene.add(dir)

  const geometry = new THREE.SphereGeometry(1, 32, 32)
  const material = new THREE.MeshStandardMaterial({ color: 0x87ceeb, metalness: 0.1, roughness: 0.8 })
  const sphere = new THREE.Mesh(geometry, material)
  sphere.position.y = 0.5
  scene.add(sphere)
  const sunGeo = new THREE.SphereGeometry(0.2, 16, 16)
  const sunMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.8 })
  sun = new THREE.Mesh(sunGeo, sunMat)
  sun.position.set(1.5, 1.2, 0)
  scene.add(sun)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(300, 300)

  if (container.value) container.value.appendChild(renderer.domElement)
  updateCondition(props.condition)
  animate()
}

function updateCondition(c: 'clear' | 'clouds' | 'rain' | 'snow' | 'fog') {
  if (particles) {
    scene.remove(particles)
    particles.geometry.dispose()
    ;(particles.material as THREE.Material).dispose()
    particles = null
  }
  if (cloudGroup) {
    scene.remove(cloudGroup)
    cloudGroup = null
  }
  windFactor = Math.max(0, Math.min(props.wind ?? 0, 20))

  if (c === 'clear') {
    scene.background = new THREE.Color(0x87ceeb)
  } else if (c === 'clouds') {
    scene.background = new THREE.Color(0xb0c4de)
    const cloudGeo = new THREE.SphereGeometry(0.2, 8, 8)
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff })
    cloudGroup = new THREE.Group()
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(cloudGeo, cloudMat)
      m.position.set(Math.random() * 4 - 2, 1 + Math.random() * 0.5, Math.random() * 2 - 1)
      cloudGroup.add(m)
    }
    scene.add(cloudGroup)
  } else if (c === 'rain' || c === 'snow') {
    scene.background = new THREE.Color(c === 'rain' ? 0x4a5568 : 0xe2e8f0)
    const count = 500
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = Math.random() * 4 - 2
      positions[i * 3 + 1] = Math.random() * 3
      positions[i * 3 + 2] = Math.random() * 4 - 2
    }
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({ color: c === 'rain' ? 0x00aaff : 0xffffff, size: c === 'rain' ? 0.03 : 0.06 })
    particles = new THREE.Points(geom, mat)
    scene.add(particles)
  } else {
    scene.background = new THREE.Color(0xCBD5E1)
  }
}

function animate() {
  animId = requestAnimationFrame(animate)
  if (particles) {
    const arr = (particles.geometry.getAttribute('position') as THREE.BufferAttribute)
    const c = props.condition
    for (let i = 0; i < arr.count; i++) {
      let y = arr.getY(i)
      y -= c === 'rain' ? 0.05 : 0.015
      if (y < 0) y = 3
      let x = arr.getX(i)
      x += windFactor * 0.01
      if (x > 2) x = -2
      arr.setX(i, x)
      arr.setY(i, y)
    }
    arr.needsUpdate = true
  }
  if (cloudGroup) {
    cloudGroup.children.forEach((m) => {
      m.position.x += 0.01 + windFactor * 0.005
      if (m.position.x > 2.2) m.position.x = -2.2
    })
  }
  if (sun) {
    angle += 0.01
    const r = 1.5
    sun.position.x = Math.cos(angle) * r
    sun.position.y = 1 + Math.sin(angle) * 0.5
  }
  renderer.render(scene, camera)
}

watch(() => props.condition, (c) => updateCondition(c))

onMounted(setup)
onBeforeUnmount(() => {
  cancelAnimationFrame(animId)
  renderer?.dispose()
})
</script>

<template>
  <div ref="container" class="w-[300px] h-[300px] rounded-xl overflow-hidden shadow-lg"></div>
</template>

<style scoped>
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1) }
</style>