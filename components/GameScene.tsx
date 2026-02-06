
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Sky, Environment, ContactShadows, Float, Text, MeshDistortMaterial, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import GabrielModel from './GabrielModel';
import { Milestone } from '../types';

interface SceneProps {
  milestones: Milestone[];
  currentMilestoneIndex: number;
  isMoving: boolean;
  distance: number;
}

const getDisplayYear = (year: number) => {
  const actualYear = year < 100 ? 2025 + year : year;
  return `Final ${actualYear}`;
};

const Landscape: React.FC<{ distance: number }> = ({ distance }) => {
  const mountains = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      position: [(Math.random() - 0.5) * 400, (Math.random() * 25) + 5, -i * 60 - 150] as [number, number, number],
      scale: [30 + Math.random() * 50, 15 + Math.random() * 40, 30 + Math.random() * 50] as [number, number, number],
      color: i % 2 === 0 ? "#1a1a2e" : "#16213e"
    }));
  }, []);

  const structures = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      position: [i % 2 === 0 ? -15 - Math.random() * 10 : 15 + Math.random() * 10, 0, -i * 20] as [number, number, number],
      height: 4 + Math.random() * 12,
      color: i % 4 === 0 ? "#3b82f6" : (i % 7 === 0 ? "#6366f1" : "#0f172a")
    }));
  }, []);

  return (
    <group>
      {mountains.map((m, i) => (
        <mesh key={i} position={m.position} scale={m.scale}>
          <coneGeometry args={[1, 1, 4]} />
          <meshStandardMaterial color={m.color} roughness={0.8} />
        </mesh>
      ))}

      {structures.map((s, i) => (
        <group key={i} position={s.position}>
          <mesh position={[0, s.height / 2, 0]}>
            <boxGeometry args={[2, s.height, 2]} />
            <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={s.color !== "#0f172a" ? 0.3 : 0} />
          </mesh>
          {s.color !== "#0f172a" && (
            <pointLight position={[0, s.height, 0]} intensity={0.5} distance={10} color={s.color} />
          )}
        </group>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, -1000]}>
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial color="#020617" roughness={1} />
      </mesh>
    </group>
  );
};

const Road: React.FC<{ distance: number }> = ({ distance }) => {
  const segments = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => i * 40);
  }, []);

  return (
    <group>
      {segments.map((pos) => (
        <group key={pos} position={[0, 0, -pos]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[14, 40]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} />
          </mesh>
          
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7, 0.08, 0]}>
            <planeGeometry args={[0.4, 40]} />
            <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={3} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7, 0.08, 0]}>
            <planeGeometry args={[0.4, 40]} />
            <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={3} />
          </mesh>

          {[0, 10, 20, 30].map(offset => (
             <mesh key={offset} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, offset - 20]}>
                <planeGeometry args={[0.3, 6]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.5} />
             </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

const MilestoneMarker: React.FC<{ milestone: Milestone; index: number; activeIndex: number }> = ({ milestone, index, activeIndex }) => {
  const zPos = -30 * (index + 1);
  const isActive = index === activeIndex;
  const isPassed = index < activeIndex;

  const color = isActive ? "#60a5fa" : (isPassed ? "#10b981" : "#1e293b");
  const displayYear = getDisplayYear(milestone.year);
  const yearNumber = milestone.year < 100 ? 2025 + milestone.year : milestone.year;

  return (
    <group position={[0, 0, zPos]}>
      <group position={[0, 4, 0]}>
        <RoundedBox args={[0.8, 10, 0.8]} radius={0.15} smoothness={4} position={[-6.5, 0, 0]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 8 : 0.4} />
        </RoundedBox>
        <RoundedBox args={[0.8, 10, 0.8]} radius={0.15} smoothness={4} position={[6.5, 0, 0]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 8 : 0.4} />
        </RoundedBox>
        <RoundedBox args={[13.8, 0.8, 0.8]} radius={0.15} smoothness={4} position={[0, 5, 0]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 8 : 0.4} />
        </RoundedBox>

        {isActive && (
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[12, 10]} />
            <MeshDistortMaterial color="#3b82f6" transparent opacity={0.15} speed={3} distort={0.3} />
          </mesh>
        )}
      </group>

      <Text
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.2, 4]}
        fontSize={4.5}
        color={color}
        fillOpacity={0.08}
      >
        {yearNumber}
      </Text>

      <Float speed={isActive ? 5 : 1} rotationIntensity={0.3} floatIntensity={0.6}>
        <group position={[0, 11, 0]}>
           <Text fontSize={1.8} color="white" anchorX="center" anchorY="middle">
            {displayYear}
          </Text>
          <Text
            position={[0, -1, 0]}
            fontSize={0.6}
            color={isActive ? "#bfdbfe" : "#94a3b8"}
            anchorX="center"
            anchorY="middle"
            maxWidth={10}
            textAlign="center"
          >
            {milestone.title.toUpperCase()}
          </Text>
        </group>
      </Float>
    </group>
  );
};

const GameScene: React.FC<SceneProps> = ({ milestones, currentMilestoneIndex, isMoving, distance }) => {
  const characterRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const targetZ = -distance;
    const lerpSpeed = 0.1;
    
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ + 9, lerpSpeed);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 4.5, lerpSpeed);
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, 0, lerpSpeed);
    
    state.camera.lookAt(0, 2, targetZ - 15);

    if (characterRef.current) {
      characterRef.current.position.z = targetZ;
    }
  });

  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 15, 90]} />
      
      <ambientLight intensity={0.8} />
      <directionalLight position={[20, 30, 20]} intensity={2} color="#8fb9ff" castShadow />
      <pointLight position={[0, 6, -distance]} intensity={5} color="#ffffff" distance={30} />
      <pointLight position={[0, 15, -distance - 50]} intensity={3} color="#3b82f6" distance={150} />

      <Stars radius={200} depth={60} count={8000} factor={5} saturation={0.8} fade speed={2} />
      <Sky distance={450000} sunPosition={[0, 0.1, -1]} inclination={0.1} azimuth={0.25} />

      <group ref={characterRef}>
        <GabrielModel isMoving={isMoving} />
      </group>
      
      <Landscape distance={distance} />
      <Road distance={distance} />

      {milestones && milestones.map((m, i) => (
        <MilestoneMarker 
          key={m.year + '-' + i} 
          milestone={m} 
          index={i} 
          activeIndex={currentMilestoneIndex} 
        />
      ))}

      <ContactShadows opacity={0.5} scale={25} blur={2} far={15} color="#000" />
      <Environment preset="city" />
    </>
  );
};

export default GameScene;
