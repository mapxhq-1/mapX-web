import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { cloneProject } from '../../api/project';
import GalaxyCanvas from '../../common/GalaxyCanvas';
const CloneProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { ownerEmail } = useSelector((state) => state.project);

  useEffect(() => {
    const performClone = async () => {
      if (!projectId || !ownerEmail) {
        navigate('/'); // Redirect home if data is missing
        return;
      }
      try {
        // Call the clone API
        const newProjectId = await cloneProject(projectId, ownerEmail);
        
        // If successful, redirect to the new project's map
        if (newProjectId) {
          navigate(`/map/${newProjectId}`);
        } else {
          // If the clone fails, redirect to the projects page
          navigate('/myProjects');
        }
      } catch (error) {
        console.error("Cloning failed:", error);
        navigate('/myProjects');
      }
    };

    performClone();
  }, [projectId, ownerEmail, navigate]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <GalaxyCanvas />
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <h1 className="text-xl text-white">Cloning project, please wait...</h1>
      </div>
    </div>
  );
};

export default CloneProjectPage;