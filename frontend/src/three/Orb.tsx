import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function DocumentMark() {
  const document = useRef<THREE.Group>(null!);
  const orbit = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    document.current.rotation.y = Math.sin(time * 0.45) * 0.16;
    document.current.rotation.x = Math.sin(time * 0.35) * 0.06;
    orbit.current.rotation.z = time * 0.16;
  });

  return (
    <>
      <group ref={document}>
        <Float speed={1.2} rotationIntensity={0.07} floatIntensity={0.12}>
          <group rotation={[0.02, -0.08, -0.08]}>
            <RoundedBox
              args={[1.24, 1.58, 0.16]}
              radius={0.12}
              smoothness={6}
              position={[-0.13, 0.05, -0.16]}
              rotation={[0, 0, -0.08]}
            >
              <meshStandardMaterial
                color="#55d9d0"
                metalness={0.68}
                roughness={0.24}
              />
            </RoundedBox>

            <RoundedBox
              args={[1.24, 1.58, 0.18]}
              radius={0.12}
              smoothness={6}
              position={[0.02, 0, 0]}
            >
              <meshStandardMaterial
                color="#eaf4ff"
                metalness={0.24}
                roughness={0.25}
              />
            </RoundedBox>

            <mesh position={[0.42, 0.53, 0.096]}>
              <shapeGeometry
                args={[
                  (() => {
                    const fold = new THREE.Shape();
                    fold.moveTo(-0.17, 0.27);
                    fold.lineTo(0.39, 0.27);
                    fold.lineTo(0.39, -0.29);
                    fold.closePath();
                    return fold;
                  })(),
                ]}
              />
              <meshStandardMaterial
                color="#a9d9ff"
                emissive="#428dff"
                emissiveIntensity={0.22}
                metalness={0.2}
                roughness={0.3}
              />
            </mesh>

            <RoundedBox
              args={[0.62, 0.055, 0.025]}
              radius={0.025}
              smoothness={4}
              position={[-0.08, 0.18, 0.103]}
            >
              <meshStandardMaterial
                color="#168fba"
                emissive="#168fba"
                emissiveIntensity={0.24}
              />
            </RoundedBox>

            <RoundedBox
              args={[0.78, 0.055, 0.025]}
              radius={0.025}
              smoothness={4}
              position={[-0.16, -0.03, 0.103]}
            >
              <meshStandardMaterial color="#829bb8" roughness={0.4} />
            </RoundedBox>

            <RoundedBox
              args={[0.55, 0.055, 0.025]}
              radius={0.025}
              smoothness={4}
              position={[-0.27, -0.24, 0.103]}
            >
              <meshStandardMaterial color="#a6b8cc" roughness={0.4} />
            </RoundedBox>

            <mesh position={[0.36, -0.49, 0.12]}>
              <sphereGeometry args={[0.095, 24, 24]} />
              <meshStandardMaterial
                color="#32d6c0"
                emissive="#20cdb8"
                emissiveIntensity={0.8}
                metalness={0.4}
                roughness={0.2}
              />
            </mesh>
          </group>
        </Float>
      </group>

      <group ref={orbit}>
        <mesh rotation={[1.12, 0.18, -0.2]} scale={[1.48, 0.72, 1]}>
          <torusGeometry args={[1, 0.012, 8, 120]} />
          <meshBasicMaterial color="#55e5d1" transparent opacity={0.82} />
        </mesh>
        <mesh rotation={[0.82, -0.35, 0.58]} scale={[1.5, 0.62, 1]}>
          <torusGeometry args={[1, 0.008, 8, 120]} />
          <meshBasicMaterial color="#8274ff" transparent opacity={0.7} />
        </mesh>
        <mesh position={[1.25, 0.28, 0.22]}>
          <sphereGeometry args={[0.055, 20, 20]} />
          <meshBasicMaterial color="#bdff73" />
        </mesh>
      </group>
    </>
  );
}

export default function Orb({ small = false }: { small?: boolean }) {
  return (
    <div
      className={small ? 'orb-small' : 'orb-large'}
      role="img"
      aria-label="DocuMind AI three-dimensional document logo"
    >
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[-3, 4, 5]} intensity={2.2} />
        <pointLight position={[3, -2, 2]} intensity={2.5} color="#43e6d0" />
        <pointLight position={[-3, 0, -2]} intensity={1.4} color="#786bff" />
        <DocumentMark />
      </Canvas>
    </div>
  );
}
