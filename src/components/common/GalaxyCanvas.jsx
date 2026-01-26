import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mapViewState } from "../map/utils/mapViewState";

function createSoftTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.15, "rgba(255, 255, 255, 0.9)"); 
  gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.2)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

export default function DeepSpaceBackground() {
  const containerRef = useRef(null);
  
  const prevMapState = useRef({ 
      lng: mapViewState.lng, 
      lat: mapViewState.lat, 
      zoom: mapViewState.zoom 
  });

  useEffect(() => {
    if (!containerRef.current) return;
    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 8000);
    camera.position.z = 1200; 

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x020202, 1); 
    containerRef.current.appendChild(renderer.domElement);

    const universeGroup = new THREE.Group();
    scene.add(universeGroup);

    const texture = createSoftTexture();

    // --- LAYER 1: STAR DUST (Fixed Squares) ---
    const DUST_COUNT = 8000;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(DUST_COUNT * 3);
    
    for (let i = 0; i < DUST_COUNT; i++) {
        const r = 2000 + Math.random() * 2000;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        dustPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        dustPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        dustPos[i*3+2] = r * Math.cos(phi);
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    
    // FIX: Added 'map: texture' and 'blending' to make them round and glowing
    const dustMat = new THREE.PointsMaterial({
        color: 0x888899,
        size: 5,
        map: texture, // <--- This removes the squares
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    universeGroup.add(new THREE.Points(dustGeo, dustMat));

    // --- LAYER 2: BRIGHT STARS ---
    const STAR_COUNT = 2500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starColors = new Float32Array(STAR_COUNT * 3);
    
    const palette = [
        new THREE.Color(0xffffff), 
        new THREE.Color(0xaaddff), 
        new THREE.Color(0xffddaa), 
    ];

    for (let i = 0; i < STAR_COUNT; i++) {
        const r = 1000 + Math.random() * 2500;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);

        starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i*3+2] = r * Math.cos(phi);

        const color = palette[Math.floor(Math.random() * palette.length)];
        starColors[i*3] = color.r;
        starColors[i*3+1] = color.g;
        starColors[i*3+2] = color.b;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
        map: texture,
        vertexColors: true,
        size: 15,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const brightStars = new THREE.Points(starGeo, starMat);
    universeGroup.add(brightStars);

    // --- LAYER 3: NEBULAS ---
    const NEBULA_COUNT = 60;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(NEBULA_COUNT * 3);
    const nebulaColors = new Float32Array(NEBULA_COUNT * 3);
    const nebulaPalette = [ new THREE.Color(0x110044), new THREE.Color(0x002233) ];

    for (let i = 0; i < NEBULA_COUNT; i++) {
        const r = 2500 + Math.random() * 1000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        nebulaPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        nebulaPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        nebulaPos[i*3+2] = r * Math.cos(phi);
        const color = nebulaPalette[Math.floor(Math.random() * nebulaPalette.length)];
        nebulaColors[i*3] = color.r; nebulaColors[i*3+1] = color.g; nebulaColors[i*3+2] = color.b;
    }
    nebulaGeo.setAttribute("position", new THREE.BufferAttribute(nebulaPos, 3));
    nebulaGeo.setAttribute("color", new THREE.BufferAttribute(nebulaColors, 3));
    
    const nebulaMat = new THREE.PointsMaterial({
        map: texture,
        vertexColors: true,
        size: 800,
        transparent: true,
        opacity: 0.15, 
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    universeGroup.add(new THREE.Points(nebulaGeo, nebulaMat));

    // --- LAYER 4: SHOOTING STARS ---
    const shootingStars = [];
    const trailGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([0,0,0, -200,0,0]); 
    trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    for(let i=0; i<4; i++) { 
        const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
        const mesh = new THREE.Line(trailGeo, mat);
        universeGroup.add(mesh);
        shootingStars.push({ mesh, active: false, speed: 0, life: 0 });
    }

    const spawnShootingStar = () => {
        const star = shootingStars.find(s => !s.active);
        if(!star) return;

        star.active = true;
        star.life = 1;
        star.mesh.material.opacity = 1;

        const r = 1500;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        star.mesh.position.set(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
        star.mesh.lookAt(0,0,0);
        star.mesh.rotateY(Math.random() * Math.PI);
        star.mesh.rotateZ(Math.random() * Math.PI);
        star.speed = 35 + Math.random() * 15; 
    };

    // --- ANIMATION LOOP ---
    let rafId;
    let time = 0;
    let universeZVelocity = 0;
    const degToRad = Math.PI / 180;

    function animate() {
        rafId = requestAnimationFrame(animate);
        time += 0.005;

        // 1. INPUT PROCESSING
        const currentLng = mapViewState.lng;
        const currentLat = mapViewState.lat;
        
        let rawZoom = mapViewState.zoom;
        const currentZoom = Math.round(rawZoom * 10) / 10;

        let dLng = currentLng - prevMapState.current.lng;
        let dLat = currentLat - prevMapState.current.lat;
        let dZoom = currentZoom - prevMapState.current.zoom;

        if (dLng > 180) dLng -= 360;
        if (dLng < -180) dLng += 360;

        // 2. ROTATION
        universeGroup.rotation.y += dLng * degToRad;
        universeGroup.rotation.x += dLat * degToRad;

        // 3. ZOOM
        if (Math.abs(dZoom) >= 0.1) {
             universeZVelocity += dZoom * 60; 
        }

        universeZVelocity *= 0.93; 
        universeGroup.position.z += universeZVelocity;

        // Light Bloom
        const speedFactor = Math.abs(universeZVelocity);
        brightStars.material.size = 15 + (speedFactor * 0.5) + Math.sin(time * 3) * 2;

        // 4. INFINITE LOOP
        if (universeGroup.position.z > 3000) universeGroup.position.z -= 3000;
        else if (universeGroup.position.z < -3000) universeGroup.position.z += 3000;

        // Update Refs
        prevMapState.current.lng = currentLng;
        prevMapState.current.lat = currentLat;
        prevMapState.current.zoom = currentZoom;


        // Shooting stars logic
        if (Math.random() < 0.008) spawnShootingStar();
        shootingStars.forEach(s => {
            if(s.active) {
                s.mesh.translateX(-s.speed);
                s.life -= 0.02;
                s.mesh.material.opacity = s.life;
                if(s.life <= 0) s.active = false;
            }
        });

        renderer.render(scene, camera);
    }

    animate();

    function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", handleResize);

    return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", handleResize);
        renderer.dispose();
        dustGeo.dispose(); dustMat.dispose();
        starGeo.dispose(); starMat.dispose();
        nebulaGeo.dispose(); nebulaMat.dispose();
        trailGeo.dispose();
        containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        background: "#020202",
        pointerEvents: "none"
      }}
    />
  );
}