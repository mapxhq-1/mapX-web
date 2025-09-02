import React, { useEffect, useRef } from "react";

const GalaxyCanvas = () => {
  const canvasRef = useRef(null);
  const stars = useRef([]);
  const mouse = useRef({ x: null, y: null });

  // Galaxy background effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let rafId;
    let nebulaCanvas = null;
    let nebulaCtx = null;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      recreateNebula();
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // ---------- STARS ----------
    function createStars() {
      const total = 400;
      const arr = [];
      for (let i = 0; i < total; i++) {
        let brightnessType;
        if (i < total * 0.3) brightnessType = "bright";
        else if (i < total * 0.5) brightnessType = "mid";
        else brightnessType = "faint";

        let shapeType;
        const shapeRand = Math.random();
        if (shapeRand < 0.5) shapeType = "round";
        else if (shapeRand < 0.7) shapeType = "oval";
        else shapeType = "fourpoint";

        let color;
        if (brightnessType === "bright") {
          color = [220 + Math.random() * 20, 220 + Math.random() * 20, 255, 1];
        } else if (brightnessType === "mid") {
          color = [180 + Math.random() * 40, 180 + Math.random() * 40, 255, 0.7];
        } else {
          const faintRand = Math.random();
          if (faintRand < 0.5) color = [160 + Math.random() * 40, 170 + Math.random() * 40, 220 + Math.random() * 35, 0.4];
          else if (faintRand < 0.8) color = [180 + Math.random() * 30, 160 + Math.random() * 30, 200 + Math.random() * 40, 0.3];
          else color = [220 + Math.random() * 20, 210 + Math.random() * 30, 170 + Math.random() * 30, 0.3];
        }

        let radius = (i < total * 0.3 ? (Math.random() * 0.7 + 0.5) : (Math.random() * 1.1 + 0.7)) * 0.7;
        let ovalRatio = shapeType === "oval" ? 0.5 + Math.random() * 0.5 : 1;

        let flickerSpeed = 0, canBlink = false, canDrift = false;
        if (i < total * 0.1) {
          flickerSpeed = (Math.random() * 0.003 + 0.001);
          canBlink = true;
          canDrift = true;
        }

        arr.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius,
          ovalRatio,
          baseDx: canDrift ? (Math.random() - 0.5) * 0.05 : 0,
          baseDy: canDrift ? (Math.random() - 0.5) * 0.05 : 0,
          vx: 0,
          vy: 0,
          opacity: color[3],
          flickerSpeed,
          canBlink,
          canDrift,
          brightnessType,
          shapeType,
          color,
        });
      }

      return arr;
    }
    stars.current = createStars();

    const handleMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // ---------- NEBULA / DUST (offscreen canvas) ----------
    function createNebulaLayer() {
      nebulaCanvas = document.createElement("canvas");
      nebulaCanvas.width = canvas.width;
      nebulaCanvas.height = canvas.height;
      nebulaCtx = nebulaCanvas.getContext("2d");
      nebulaCtx.clearRect(0, 0, nebulaCanvas.width, nebulaCanvas.height);
      nebulaCtx.globalCompositeOperation = "lighter";

      const cx = nebulaCanvas.width * 0.55;
      const cy = nebulaCanvas.height * 0.45;
      const rxBase = nebulaCanvas.width * 0.504;
      const ryBase = nebulaCanvas.height * 0.105;
      const angle = -Math.PI / 5;

      const layers = [
        { spread: 1.00, alpha0: 0.25, alpha1: 0.10, blur: 24 },
        { spread: 0.85, alpha0: 0.18, alpha1: 0.08, blur: 36 },
        { spread: 0.70, alpha0: 0.12, alpha1: 0.06, blur: 48 },
        { spread: 0.55, alpha0: 0.08, alpha1: 0.04, blur: 64 },
      ];

      nebulaCtx.save();
      nebulaCtx.translate(cx, cy);
      nebulaCtx.rotate(angle);

      layers.forEach((layer) => {
        const rx = rxBase * layer.spread;
        const ry = ryBase * layer.spread;
        const grad = nebulaCtx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
        grad.addColorStop(0.0, `rgba(120,80,180,${layer.alpha0.toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(120,80,180,${(layer.alpha1 * 0.7).toFixed(3)})`);
        grad.addColorStop(1.0, `rgba(120,80,180,0.0)`);

        nebulaCtx.save();
        nebulaCtx.filter = `blur(${Math.round(layer.blur)}px)`;
        nebulaCtx.beginPath();
        nebulaCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        nebulaCtx.closePath();
        nebulaCtx.fillStyle = grad;
        nebulaCtx.globalAlpha = 1.0;
        nebulaCtx.fill();
        nebulaCtx.restore();
      });

      nebulaCtx.restore();
    }

    function recreateNebula() {
      createNebulaLayer();
    }
    recreateNebula();

    function drawStarShape(s) {
      ctx.save();
      ctx.beginPath();
      ctx.globalAlpha = s.opacity;
      ctx.shadowColor = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${s.opacity * 0.7})`;
      ctx.shadowBlur = s.brightnessType === "bright" ? 12 : s.brightnessType === "mid" ? 6 : 2;
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${s.opacity})`;

      if (s.shapeType === "round") {
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.shapeType === "oval") {
        const rotation = (s.baseDx + s.baseDy) * 3;
        ctx.translate(s.x, s.y);
        ctx.rotate(rotation);
        ctx.ellipse(0, 0, s.radius, s.radius * s.ovalRatio, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const r = s.radius;
        ctx.translate(s.x, s.y);
        const rot = (s.baseDx + s.baseDy) * 5;
        ctx.rotate(rot);
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(r * 0.35, -r * 0.35, r, 0);
        ctx.quadraticCurveTo(r * 0.35, r * 0.35, 0, r);
        ctx.quadraticCurveTo(-r * 0.35, r * 0.35, -r, 0);
        ctx.quadraticCurveTo(-r * 0.35, -r * 0.35, 0, -r);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    function animate() {
      ctx.fillStyle = "#000009";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (nebulaCanvas) ctx.drawImage(nebulaCanvas, 0, 0, canvas.width, canvas.height);

      stars.current.forEach((star) => {
        if (star.canBlink && star.flickerSpeed !== 0) {
          star.opacity += star.flickerSpeed;
          if (star.opacity > 1) { star.opacity = 1; star.flickerSpeed *= -1; }
          if (star.opacity < 0.25) { star.opacity = 0.25; star.flickerSpeed *= -1; }
        } else {
          star.opacity += (Math.random() - 0.5) * 0.002;
          star.opacity = Math.max(0.15, Math.min(1, star.opacity));
        }

        if (mouse.current.x && mouse.current.y) {
          const dx = star.x - mouse.current.x;
          const dy = star.y - mouse.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = 130 / 4;
          if (dist < minDist && dist > 0.1) {
            const force = (minDist - dist) / minDist;
            const angle = Math.atan2(dy, dx);
            star.vx += Math.cos(angle) * force * 0.10;
            star.vy += Math.sin(angle) * force * 0.10;
          }
        }

        if (star.canDrift) {
          star.vx += star.baseDx * 0.04;
          star.vy += star.baseDy * 0.04;
        }

        star.x += star.vx;
        star.y += star.vy;
        star.vx *= 0.95;
        star.vy *= 0.95;

        if (star.x < -40) star.x = canvas.width + 40;
        if (star.x > canvas.width + 40) star.x = -40;
        if (star.y < -40) star.y = canvas.height + 40;
        if (star.y > canvas.height + 40) star.y = -40;

        drawStarShape(star);
      });

      rafId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: "absolute", 
        top: 0, 
        left: 0, 
        width: "100%", 
        height: "100%", 
        zIndex: 0
      }} 
    />
  );
};

export default GalaxyCanvas;
