'use client'

import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three-stdlib'
import { OrbitControls } from 'three-stdlib'

const MODELS = [
  {
    label: 'Case',
    description: 'Main body — houses the ESP32, eInk display, NFC module, and NeoPixel ring. Includes the NFC pass-through area for scanning.',
    url: 'https://raw.githubusercontent.com/Nikorag/Jellybox-Firmware/main/models/Jellybox%20Case.stl',
    filename: 'Jellybox Case.stl',
    color: '#00A4DC',
  },
  {
    label: 'Lid',
    description: 'Top panel — screws onto the case body to enclose the electronics.',
    url: 'https://raw.githubusercontent.com/Nikorag/Jellybox-Firmware/main/models/Jellybox%20Lid.stl',
    filename: 'Jellybox Lid.stl',
    color: '#AA5CC3',
  },
]

export default function StlModelViewer() {
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const model = MODELS[active]

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setLoading(true)

    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)

    // Renderer — transparent so CSS background shows through
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const key = new THREE.DirectionalLight(0xffffff, 1.2)
    key.position.set(2, 3, 4)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.4)
    fill.position.set(-2, -1, -2)
    scene.add(fill)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.5

    // Load STL
    const loader = new STLLoader()
    loader.load(model.url, (geometry) => {
      geometry.computeVertexNormals()
      geometry.center()

      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: model.color, roughness: 0.45, metalness: 0.1 }),
      )

      // Orient flat onto the ground plane (STLs are often Z-up)
      mesh.rotation.x = -Math.PI / 2
      scene.add(mesh)

      // Fit camera
      const box = new THREE.Box3().setFromObject(mesh)
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      camera.position.set(0, maxDim * 0.6, maxDim * 1.0)
      camera.lookAt(0, 0, 0)
      controls.update()

      setLoading(false)
    })

    // Animate
    let raf: number
    const animate = () => {
      raf = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [model.url])

  return (
    <div className="rounded-xl border border-jf-border bg-jf-surface overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-jf-border bg-jf-elevated">
        <div className="flex gap-1">
          {MODELS.map((m, i) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setActive(i)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                active === i
                  ? 'bg-jf-primary text-white'
                  : 'text-jf-text-muted hover:text-jf-text-primary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <a
          href={model.url}
          download={model.filename}
          className="flex items-center gap-1.5 text-xs text-jf-text-muted hover:text-jf-primary transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </a>
      </div>

      {/* Canvas */}
      <div className="relative bg-white" style={{ height: 340 }}>
        <div ref={containerRef} className="w-full h-full" />
        {loading && (
          <div className="absolute inset-0 bg-white flex flex-col items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-jf-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-jf-text-muted">Loading model…</p>
          </div>
        )}
        <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-black pointer-events-none select-none">
          Drag to rotate · scroll to zoom
        </p>
      </div>

      {/* Caption */}
      <div className="px-4 py-3 border-t border-jf-border">
        <p className="text-xs text-jf-text-secondary">{model.description}</p>
      </div>
    </div>
  )
}
