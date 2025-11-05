// ShareAccept.jsx
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";

const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/project-management-service";

export default function ShareAccept() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const {ownerEmail:derivedEmail} = useSelector((state)=>state.project);

  useEffect(() => {
    const goHome = () => navigate("/myprojects", { replace: true });
    const token = localStorage.getItem('bearerToken');
    if(!token){
      navigate('/'); // Redirect home if data is missing
      return;
    }
    if (!projectId) {
      toast.error("Invalid link.");
      goHome();
      return;
    }
    (async () => {
      try {
        const res = await axios.patch(
          `${BASE_URL}/update-accessor_list/${encodeURIComponent(projectId)}`,
          null,
          {
            params: { email: derivedEmail },
            headers: {
              "client_name": "mapx",
              Authorization: `Bearer ${token}`,
            },
            // if your gateway needs withCredentials, add it:
            // withCredentials: true,
          }
        );

        // Success (200 with no error message)
        toast.success("Access granted. Opening project!!");
        navigate(`/map/${projectId}`, { replace: true });
      } catch (err) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message;

        // mirror your controller’s switch
        if (status === 404 || msg === "Project not found") {
          toast.error("Project not found.");
          goHome();
          return;
        }
        if (
          status === 400 &&
          (msg === "Invalid or missing userEmail" ||
           msg === "Invalid or missing projectId")
        ) {
          toast.error("Invalid link or account.");
          goHome();
          return;
        }
        if (status === 400 && msg === "useremail is already in accessor list") {
          toast.info("You already have access. Opening project…");
          navigate(`/map/${projectId}`, { replace: true });
          return;
        }
        if (status === 400 && msg === "owner email and user email is same") {
          // Owner clicked their own link—just open.
          toast.info("You're the owner. Opening project!!");
          navigate(`/map/${projectId}`, { replace: true });
          return;
        }

        toast.error("Could not accept the share. Please try again.");
        goHome();
      }
    })();
  }, [projectId, derivedEmail, navigate]);

  // A minimal inline status page (optional)
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <p>Processing your access…</p>
    </div>
  );
}
