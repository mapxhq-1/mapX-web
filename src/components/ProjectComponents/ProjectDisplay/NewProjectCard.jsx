import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useRef, useState } from "react";

const NewProjectCard = () => {
  const { ownerEmail } = useSelector((state) => state.project);
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/project-management-service";

  const btnRef = useRef(null);
  const [spot, setSpot] = useState({ x: 0, y: 0 });
  const [isHover, setIsHover] = useState(false);

  async function createNewProj() {
    try {
      const token = localStorage.getItem("bearerToken");
      const res = await axios.post(
        BASE_URL + "/create-new-project",
        {
          ownerEmail: ownerEmail,
          projectName: "New project",
        },
        {
          headers: {
            client_name: "mapx",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("New project created!!");
      navigate("/map/" + res.data.projectId);
    } catch (err) {
      console.log(err);
      toast.error(err?.response?.data?.message || "Creation failed");
    }
  }

  const handleMove = (e) => {
    const el = btnRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSpot({ x, y });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="w-full h-full min-h-[70vh] z-1 flex flex-col justify-center items-center p-8 text-center"
    >
      <h3 className="text-zinc-400 text-lg font-light tracking-wide mb-10 max-w-lg">
        Create your first project to start exploring amazing things
      </h3>

      <button
        ref={btnRef}
        onClick={createNewProj}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onMouseMove={handleMove}
        style={{
          "--mx": `${spot.x}px`,
          "--my": `${spot.y}px`,
        }}
        className="
          relative group overflow-hidden rounded-full
          px-10 py-3
          border border-white/10
          bg-gradient-to-b from-white/10 to-white/5
          text-white
          transition-all duration-300
          shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_30px_rgba(0,0,0,0.55)]
          hover:-translate-y-[2px]
          hover:border-white/20
          hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_18px_45px_rgba(0,0,0,0.65)]
          active:translate-y-[0px]
          active:scale-[0.98]
          focus:outline-none
        "
      >
        {/* Cursor-follow spotlight glow (Pastel Green) */}
        <span
          className={`
            pointer-events-none absolute inset-0
            transition-opacity duration-200
            ${isHover ? "opacity-100" : "opacity-0"}
          `}
          style={{
            background: `
              radial-gradient(
                160px circle at var(--mx) var(--my),
                rgba(178, 255, 137, 0.25),
                rgba(178, 255, 137, 0.12) 35%,
                rgba(0, 0, 0, 0) 70%
              )
            `,
            filter: "blur(10px)",
          }}
        />

        {/* Stronger “core” glow (small + intense, Pastel Green) */}
        <span
          className={`
            pointer-events-none absolute inset-0
            transition-opacity duration-200
            ${isHover ? "opacity-100" : "opacity-0"}
          `}
          style={{
            background: `
              radial-gradient(
                90px circle at var(--mx) var(--my),
                rgba(178, 255, 137, 0.35),
                rgba(178, 255, 137, 0.10) 55%,
                rgba(0, 0, 0, 0) 75%
              )
            `,
            filter: "blur(6px)",
            mixBlendMode: "screen",
          }}
        />

        <span
          className={`
            pointer-events-none absolute left-0 right-0 bottom-0 h-1/2
            transition-opacity duration-300
            ${isHover ? "opacity-100" : "opacity-0"}
          `}
          style={{
            background:
              "linear-gradient(to top, rgba(178,255,137,0.55), rgba(178,255,137,0.18), rgba(0,0,0,0))",
            filter: "blur(18px)",
          }}
        />

        <span
          className={`
            pointer-events-none absolute -left-[60%] top-[-30%]
            h-[160%] w-[60%]
            bg-gradient-to-r from-transparent via-white/20 to-transparent
            blur-md rotate-[18deg]
            transition-all ease-out
            ${isHover ? "opacity-100 translate-x-[260%]" : "opacity-0 translate-x-0"}
          `}
          style={{ transitionDuration: "650ms" }}
        />

        {/* Top thin glass line */}
        <span
          className={`
            pointer-events-none absolute inset-x-4 top-[1px] h-[1px]
            bg-gradient-to-r from-transparent via-white/40 to-transparent
            transition-opacity duration-300
            ${isHover ? "opacity-70" : "opacity-40"}
          `}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-3">
          <span className="text-xl font-light leading-none pb-0.5 opacity-90 group-hover:opacity-100 transition-opacity duration-300">
            +
          </span>
          <span className="text-sm font-semibold tracking-widest uppercase">
            New Project
          </span>
        </span>
      </button>
    </motion.div>
  );
};

export default NewProjectCard;
