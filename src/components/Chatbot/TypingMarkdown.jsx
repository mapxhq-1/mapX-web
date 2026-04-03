import { useState, useEffect } from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TypingMarkdown = ({ content, isNew, components }) => {
  const [displayedContent, setDisplayedContent] = useState(isNew ? "" : content);

  useEffect(() => {
    // If it's an old message, render the whole thing immediately
    if (!isNew) {
      setDisplayedContent(content);
      return;
    }

    let currentIndex = 0;
    
    const interval = setInterval(() => {
      // Slicing 3 characters at a time simulating the token-by-token speed
      currentIndex += 3; 
      
      if (currentIndex >= content.length) {
        setDisplayedContent(content);
        clearInterval(interval);
      } else {
        setDisplayedContent(content.slice(0, currentIndex));
      }
    }, 10); // Ultra-fast 10ms tick

    return () => clearInterval(interval);
  }, [content, isNew]);

  return (
    <div 
      // Triggers the fade-in only on new messages
      style={{
        animation: isNew ? "ai-reveal 0.6s ease-out forwards" : "none"
      }}
    >
      {/* Inline CSS keyframe for the fade + slight blur. 
        It softens the harshness of the rapid text slicing.
      */}
      <style>{`
        @keyframes ai-reveal {
          0% { opacity: 0; filter: blur(4px); transform: translateY(4px); }
          100% { opacity: 1; filter: blur(0px); transform: translateY(0px); }
        }
      `}</style>
      
      <ReactMarkdown
        children={displayedContent}
        remarkPlugins={[remarkGfm]}
        components={components}
      />
    </div>
  );
};

export default TypingMarkdown;