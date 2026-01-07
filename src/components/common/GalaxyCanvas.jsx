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
  gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.8)"); // Harder core
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

export default function DeepSpaceBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.z = 0; 

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x020202, 1); 
    containerRef.current.appendChild(renderer.domElement);

    const universeGroup = new THREE.Group();
    scene.add(universeGroup);

    const texture = createSoftTexture();

    // --- LAYER 1: STAR DUST (Background) ---
    const DUST_COUNT = 8000;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(DUST_COUNT * 3);
    
    for (let i = 0; i < DUST_COUNT; i++) {
        const r = 1000 + Math.random() * 1000;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        dustPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        dustPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        dustPos[i*3+2] = r * Math.cos(phi);
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 3, // Slightly bigger
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
    });
    const starDust = new THREE.Points(dustGeo, dustMat);
    universeGroup.add(starDust);

    // --- LAYER 2: BRIGHT STARS (Foreground) ---
    const STAR_COUNT = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starColors = new Float32Array(STAR_COUNT * 3);
    const starSizes = new Float32Array(STAR_COUNT);

    const starPalette = [
        new THREE.Color(0xffffff), 
        new THREE.Color(0xaaddff), // Blue
        new THREE.Color(0xffddaa), // Gold
    ];

    for (let i = 0; i < STAR_COUNT; i++) {
        const r = 800 + Math.random() * 700;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);

        starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i*3+2] = r * Math.cos(phi);

        const color = starPalette[Math.floor(Math.random() * starPalette.length)];
        starColors[i*3] = color.r;
        starColors[i*3+1] = color.g;
        starColors[i*3+2] = color.b;

        starSizes[i] = Math.random() * 2 + 1; 
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
        map: texture,
        vertexColors: true,
        size: 9, // INCREASED SIZE (Was 5)
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const brightStars = new THREE.Points(starGeo, starMat);
    universeGroup.add(brightStars);

    // --- LAYER 3: NEBULAS ---
    const NEBULA_COUNT = 100;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(NEBULA_COUNT * 3);
    const nebulaColors = new Float32Array(NEBULA_COUNT * 3);
    const nebulaPalette = [ new THREE.Color(0x220066), new THREE.Color(0x001133) ];

    for (let i = 0; i < NEBULA_COUNT; i++) {
        const r = 1200 + Math.random() * 800;
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
        size: 500, // INCREASED SIZE (Was 300)
        transparent: true,
        opacity: 0.12, 
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    universeGroup.add(new THREE.Points(nebulaGeo, nebulaMat));

    // --- LAYER 4: SHOOTING STARS ---
    const shootingStars = [];
    const trailGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([0,0,0, -80,0,0]); // Longer trail
    trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Reduced pool size (from 8 to 3)
    for(let i=0; i<3; i++) { 
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

        const r = 900;
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
        star.speed = 15 + Math.random() * 20; // Faster shooting stars
    };

    // --- ANIMATION LOOP ---
    let rafId;
    let time = 0;

    function animate() {
        rafId = requestAnimationFrame(animate);
        time += 0.005;

        // --- FIXED ROTATION LOGIC ---
        // Increase sensitivity (0.0003 -> 0.0008) for faster reaction
        const targetRotY = mapViewState.lng * 0.0008; 
        const targetRotX = mapViewState.lat * 0.0008;

        // CHECK FOR WRAP-AROUND JUMP
        // If the difference between current and target is massive (e.g. crossing 180/-180)
        // we snap immediately instead of easing, preventing the "rewind spin"
        if (Math.abs(targetRotY - universeGroup.rotation.y) > 0.5) {
            universeGroup.rotation.y = targetRotY;
        } else {
            // Smooth ease
            universeGroup.rotation.y += (targetRotY - universeGroup.rotation.y) * 0.1;
        }

        if (Math.abs(targetRotX - universeGroup.rotation.x) > 0.5) {
            universeGroup.rotation.x = targetRotX;
        } else {
            universeGroup.rotation.x += (targetRotX - universeGroup.rotation.x) * 0.1;
        }

        // FASTER IDLE MOVEMENT
        universeGroup.rotation.z += 0.0005; // Was 0.0001

        // Twinkle
        brightStars.material.opacity = 0.8 + Math.sin(time * 2) * 0.2;

        // Shooting Stars (Reduced frequency 0.03 -> 0.01)
        if (Math.random() < 0.01) spawnShootingStar();
        
        shootingStars.forEach(s => {
            if(s.active) {
                s.mesh.translateX(-s.speed);
                s.life -= 0.02; // Faster fade out
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