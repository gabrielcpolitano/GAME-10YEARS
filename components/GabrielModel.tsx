
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GabrielProps {
  isMoving: boolean;
}

const GabrielModel: React.FC<GabrielProps> = ({ isMoving }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();
    
    if (isMoving) {
      // Bobbing animation
      groupRef.current.position.y = Math.sin(t * 10) * 0.05;
      
      // Leg movement
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(t * 10) * 0.5;
        rightLegRef.current.rotation.x = Math.cos(t * 10) * 0.5;
      }

      // Slight body lean
      if (bodyRef.current) {
        bodyRef.current.rotation.x = Math.sin(t * 10) * 0.1;
      }
    } else {
      // Idle breath
      groupRef.current.position.y = Math.sin(t * 2) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={[0, 1, 0]}>
      {/* Head */}
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
      
      {/* Hair - Stylized */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.25, 0.15, 0.25]} />
        <meshStandardMaterial color="#4a2c2a" />
      </mesh>

      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.4, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.2]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.3, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>

      {/* Right Arm */}
      <mesh position={[0.3, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>

      {/* Left Leg */}
      <mesh ref={leftLegRef} position={[-0.15, 0, 0]}>
        <boxGeometry args={[0.15, 0.6, 0.15]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>

      {/* Right Leg */}
      <mesh ref={rightLegRef} position={[0.15, 0, 0]}>
        <boxGeometry args={[0.15, 0.6, 0.15]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
    </group>
  );
};

export default GabrielModel;
