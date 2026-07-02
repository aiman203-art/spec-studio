import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import type { LocationValue } from '../store/types'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

/**
 * Location picker: Mapbox geocoder search + draggable pin → { address, lat, lng }.
 * Falls back to a plain address text input when VITE_MAPBOX_TOKEN is absent so
 * Project Setup still works without a token (plan: Open Items / Assumptions).
 */
export function MapboxLocationField({
  value,
  disabled,
  onChange,
}: {
  value: LocationValue
  disabled: boolean
  onChange: (next: LocationValue) => void
}) {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  // Keep the latest onChange/value without re-initializing the map
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (!TOKEN || !mapEl.current || mapRef.current) return

    mapboxgl.accessToken = TOKEN
    const start: [number, number] =
      value.lng != null && value.lat != null ? [value.lng, value.lat] : [-0.1276, 51.5072]

    const map = new mapboxgl.Map({
      container: mapEl.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: start,
      zoom: value.lat != null ? 12 : 1.4,
      attributionControl: false,
    })
    mapRef.current = map

    const marker = new mapboxgl.Marker({ color: '#5b8af5', draggable: true })
    if (value.lat != null && value.lng != null) {
      marker.setLngLat(start).addTo(map)
    }
    markerRef.current = marker

    marker.on('dragend', () => {
      const ll = marker.getLngLat()
      onChangeRef.current({ ...valueRef.current, lat: ll.lat, lng: ll.lng })
    })

    const geocoder = new MapboxGeocoder({
      accessToken: TOKEN,
      mapboxgl: mapboxgl as unknown as typeof import('mapbox-gl'),
      marker: false,
      placeholder: 'Search address or place…',
    })
    map.addControl(geocoder)

    geocoder.on('result', (e: { result: { place_name: string; center: [number, number] } }) => {
      const [lng, lat] = e.result.center
      marker.setLngLat([lng, lat]).addTo(map)
      onChangeRef.current({ address: e.result.place_name, lat, lng })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // Init once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!TOKEN) {
    return (
      <div>
        <input
          type="text"
          value={value.address}
          disabled={disabled}
          placeholder="City, country (Mapbox token not configured)"
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-body text-ink placeholder:text-faint focus-visible:ring-focus disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-caption text-faint">
          Set <code className="text-muted">VITE_MAPBOX_TOKEN</code> to enable the
          map picker.
        </p>
      </div>
    )
  }

  return (
    <div className={disabled ? 'pointer-events-none' : ''}>
      {value.address && (
        <p className="mb-2 text-body text-ink">{value.address}</p>
      )}
      <div
        ref={mapEl}
        className="h-56 w-full overflow-hidden rounded-sm border border-border"
      />
      {value.lat != null && value.lng != null && (
        <p className="mt-1 text-caption text-faint">
          {value.lat.toFixed(4)}, {value.lng.toFixed(4)} — drag the pin to adjust.
        </p>
      )}
    </div>
  )
}
