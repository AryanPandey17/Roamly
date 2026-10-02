"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// A dotted globe with a few routes arcing between cities. Decorative only:
// it is hidden from assistive technology and stops moving when the visitor
// prefers reduced motion.

const CITIES: [string, number, number][] = [
  ["Mumbai", 19.08, 72.88],
  ["Tokyo", 35.68, 139.69],
  ["Lisbon", 38.72, -9.14],
  ["Nairobi", -1.29, 36.82],
  ["Singapore", 1.35, 103.82],
  ["New York", 40.71, -74.0],
  ["Sydney", -33.87, 151.21],
];
const ROUTES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 4],
  [2, 5],
  [3, 0],
  [4, 6],
];

function toVector(lat: number, lng: number, radius = 1) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

const ON_PHOTO = { dots: "#ffffff", route: "#ffffff", city: "#ffe1d6" };

function readThemeColours() {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string) => style.getPropertyValue(name).trim() || "#888";
  return { dots: get("--muted"), route: get("--primary"), city: get("--accent") };
}

/** Colours for the globe: white on a gradient panel, otherwise the theme's, re-read when the theme changes. */
function useThemeColours(onPhoto: boolean) {
  const [colours, setColours] = useState(() => (onPhoto ? ON_PHOTO : readThemeColours()));
  useEffect(() => {
    if (onPhoto) return;
    const observer = new MutationObserver(() => setColours(readThemeColours()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [onPhoto]);
  return colours;
}

function Scene({ still, onPhoto }: { still: boolean; onPhoto: boolean }) {
  const group = useRef<THREE.Group>(null);
  const colours = useThemeColours(onPhoto);

  // Evenly spread dots (Fibonacci sphere).
  const dots = useMemo(() => {
    const count = 1600;
    const positions = new Float32Array(count * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = golden * i;
      positions.set([Math.cos(t) * r, y, Math.sin(t) * r], i * 3);
    }
    return positions;
  }, []);

  const arcs = useMemo(
    () =>
      ROUTES.map(([a, b]) => {
        const start = toVector(CITIES[a][1], CITIES[a][2]);
        const end = toVector(CITIES[b][1], CITIES[b][2]);
        // Lift the midpoint off the surface in proportion to the distance.
        const mid = start.clone().add(end).normalize().multiplyScalar(1 + start.distanceTo(end) * 0.28);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        return new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
      }),
    []
  );

  useFrame((_, delta) => {
    if (!still && group.current) group.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={group} rotation={[0.35, -1.9, 0]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dots, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.016} color={colours.dots} transparent opacity={0.85} sizeAttenuation />
      </points>
      {arcs.map((geometry, i) => (
        <primitive
          key={`${i}-${colours.route}`}
          object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: colours.route, transparent: true, opacity: 0.9 }))}
        />
      ))}
      {CITIES.map(([name, lat, lng]) => (
        <mesh key={name} position={toVector(lat, lng, 1.005)}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color={colours.city} />
        </mesh>
      ))}
    </group>
  );
}

export default function Globe({ onPhoto = false }: { onPhoto?: boolean }) {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStill(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div aria-hidden className="h-full w-full">
      <Canvas camera={{ position: [0, 0, 3.1], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <Scene still={still} onPhoto={onPhoto} />
      </Canvas>
    </div>
  );
}
