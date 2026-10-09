import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ObloSculptureCanvas({ className = "" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 550;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 1.8, 8.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    container.appendChild(renderer.domElement);

    // Group to hold all objects for rotation/parallax
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // --- MATERIALS (Tactile matte agency aesthetic inspired by reference) ---
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xF3EDE2,
      roughness: 0.55,
      metalness: 0.05
    });

    const coralArchMat = new THREE.MeshStandardMaterial({
      color: 0xF27A65, // Terracotta coral
      roughness: 0.45,
      metalness: 0.05
    });

    const navyStairsMat = new THREE.MeshStandardMaterial({
      color: 0x1B3D8F, // Rich studio navy blue
      roughness: 0.4,
      metalness: 0.05
    });

    const yellowAccentMat = new THREE.MeshStandardMaterial({
      color: 0xF5C738, // Warm canary/mustard
      roughness: 0.35,
      metalness: 0.08
    });

    const whiteClayMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.3,
      metalness: 0.05
    });

    const softPinkMat = new THREE.MeshStandardMaterial({
      color: 0xEB96B0,
      roughness: 0.5,
      metalness: 0.05
    });

    const electricBlueSphereMat = new THREE.MeshStandardMaterial({
      color: 0x1E4FD8,
      roughness: 0.3,
      metalness: 0.1
    });

    // 1. BASE PEDESTAL (Cylinder podium)
    const baseGeo = new THREE.CylinderGeometry(2.3, 2.35, 0.55, 64);
    const baseMesh = new THREE.Mesh(baseGeo, pedestalMat);
    baseMesh.position.set(0, -1.2, 0);
    baseMesh.receiveShadow = true;
    mainGroup.add(baseMesh);

    // 2. CORAL ARCHWAY (Extruded or combined half-ring & pillars)
    const archGroup = new THREE.Group();
    const pillarGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.6, 32);
    const pillarL = new THREE.Mesh(pillarGeo, coralArchMat);
    pillarL.position.set(-0.7, 0.4, 0);
    pillarL.castShadow = true;

    const pillarR = new THREE.Mesh(pillarGeo, coralArchMat);
    pillarR.position.set(0.7, 0.4, 0);
    pillarR.castShadow = true;

    const archTopGeo = new THREE.TorusGeometry(0.7, 0.24, 24, 48, Math.PI);
    const archTop = new THREE.Mesh(archTopGeo, coralArchMat);
    archTop.position.set(0, 1.2, 0);
    archTop.castShadow = true;

    archGroup.add(pillarL, pillarR, archTop);
    archGroup.position.set(-0.25, -0.9, -0.2);
    mainGroup.add(archGroup);

    // 3. WHITE SPHERE ON ARCH TOP
    const sphereTopGeo = new THREE.SphereGeometry(0.38, 36, 36);
    const sphereTop = new THREE.Mesh(sphereTopGeo, whiteClayMat);
    sphereTop.position.set(-0.25, 1.45, -0.2);
    sphereTop.castShadow = true;
    mainGroup.add(sphereTop);

    // 4. NAVY BLUE STAIRS (Step block composition)
    const stairsGroup = new THREE.Group();
    const stepCount = 4;
    for (let i = 0; i < stepCount; i++) {
      const stepWidth = 0.85;
      const stepHeight = 0.32;
      const stepDepth = 0.85 - (i * 0.18);
      const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
      const stepMesh = new THREE.Mesh(stepGeo, navyStairsMat);
      stepMesh.position.set(0, (i * stepHeight) + (stepHeight / 2), (i * 0.12));
      stepMesh.castShadow = true;
      stairsGroup.add(stepMesh);
    }
    stairsGroup.position.set(0.75, -0.9, 0.2);
    mainGroup.add(stairsGroup);

    // 5. YELLOW ARCH/DISC SLICE
    const yellowDiscGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.3, 40, 1, false, 0, Math.PI);
    const yellowDisc = new THREE.Mesh(yellowDiscGeo, yellowAccentMat);
    yellowDisc.rotation.z = Math.PI / 2;
    yellowDisc.rotation.y = 0.3;
    yellowDisc.position.set(1.15, 0.8, -0.5);
    yellowDisc.castShadow = true;
    mainGroup.add(yellowDisc);

    // 6. FLOATING WHITE TORUS / RING
    const torusGeo = new THREE.TorusGeometry(0.48, 0.16, 24, 48);
    const torusMesh = new THREE.Mesh(torusGeo, whiteClayMat);
    torusMesh.position.set(1.5, -0.3, 0.6);
    torusMesh.rotation.x = 0.4;
    torusMesh.rotation.y = -0.6;
    torusMesh.castShadow = true;
    mainGroup.add(torusMesh);

    // 7. YELLOW CONE / PYRAMID
    const coneGeo = new THREE.ConeGeometry(0.32, 0.72, 32);
    const coneMesh = new THREE.Mesh(coneGeo, yellowAccentMat);
    coneMesh.position.set(0.4, -0.55, 0.7);
    coneMesh.castShadow = true;
    mainGroup.add(coneMesh);

    // 8. PINK ARCH / QUARTER CYLINDER on left
    const pinkShapeGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.5, 32, 1, false, 0, Math.PI / 2);
    const pinkShape = new THREE.Mesh(pinkShapeGeo, softPinkMat);
    pinkShape.position.set(-1.05, -0.7, 0.3);
    pinkShape.rotation.x = Math.PI / 2;
    pinkShape.rotation.z = 0.4;
    pinkShape.castShadow = true;
    mainGroup.add(pinkShape);

    // 9. FLOATING SPHERES (Small decorative floating accents)
    const floatingSphere1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), electricBlueSphereMat);
    floatingSphere1.position.set(0.05, -0.75, 1.1);
    floatingSphere1.castShadow = true;
    mainGroup.add(floatingSphere1);

    const floatingSphere2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 24), coralArchMat);
    floatingSphere2.position.set(-1.3, 0.4, -0.3);
    mainGroup.add(floatingSphere2);

    const floatingSphere3 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), electricBlueSphereMat);
    floatingSphere3.position.set(1.65, 1.2, -0.1);
    mainGroup.add(floatingSphere3);

    const floatingPyramid = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 4), softPinkMat);
    floatingPyramid.position.set(1.7, 0.45, 0.1);
    floatingPyramid.rotation.z = 0.4;
    floatingPyramid.rotation.x = -0.2;
    mainGroup.add(floatingPyramid);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    // Key directional light with warm soft shadow
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.4);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Cool rim light from right/back
    const rimLight = new THREE.DirectionalLight(0x7da4ff, 1.5);
    rimLight.position.set(-6, 4, -4);
    scene.add(rimLight);

    // Subtle bottom fill
    const fillLight = new THREE.PointLight(0xfff3d0, 0.8, 10);
    fillLight.position.set(0, -2, 3);
    scene.add(fillLight);

    // Mouse parallax tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;

    const handleMouseMove = (e) => {
      if (prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
      targetRotationY = mouseX * 0.4;
      targetRotationX = -mouseY * 0.2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        // Smooth mouse damping
        mainGroup.rotation.y += (targetRotationY - mainGroup.rotation.y) * 0.05;
        mainGroup.rotation.x += (targetRotationX - mainGroup.rotation.x) * 0.05;

        // Subtle floating breathing effect
        floatingSphere1.position.y = -0.75 + Math.sin(elapsedTime * 2.1) * 0.04;
        floatingSphere2.position.y = 0.4 + Math.sin(elapsedTime * 1.8 + 1) * 0.05;
        floatingSphere3.position.y = 1.2 + Math.cos(elapsedTime * 2.4) * 0.06;
        torusMesh.rotation.z += 0.005;
        torusMesh.position.y = -0.3 + Math.sin(elapsedTime * 1.5) * 0.03;
        floatingPyramid.rotation.y += 0.008;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      // Dispose geometries & materials
      baseGeo.dispose();
      pillarGeo.dispose();
      archTopGeo.dispose();
      sphereTopGeo.dispose();
      yellowDiscGeo.dispose();
      torusGeo.dispose();
      coneGeo.dispose();
      pinkShapeGeo.dispose();

      pedestalMat.dispose();
      coralArchMat.dispose();
      navyStairsMat.dispose();
      yellowAccentMat.dispose();
      whiteClayMat.dispose();
      softPinkMat.dispose();
      electricBlueSphereMat.dispose();

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div 
        ref={mountRef} 
        className="w-full h-[440px] sm:h-[480px] lg:h-[520px] max-w-[620px] mx-auto cursor-grab active:cursor-grabbing"
        title="Interactive 3D Agency Sculpture - Move cursor to tilt"
      />
      {/* Subtle indicator pill */}
      <div className="absolute bottom-2 right-4 pointer-events-none flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-[11px] font-mono tracking-wider text-white/80 border border-white/10">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FFE600] animate-pulse"></span>
        3D TACTILE ENGINE • INTERACTIVE
      </div>
    </div>
  );
}
