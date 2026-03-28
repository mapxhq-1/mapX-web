import {useState,useEffect} from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
const TypingMarkdown = ({ content, isNew, components, scrollToBottom }) => {
  const [displayedContent, setDisplayedContent] = useState(isNew ? "" : content);
  const [isTyping, setIsTyping] = useState(isNew);

  useEffect(() => {
    // If it's an old message from history, just show it instantly
    if (!isNew) {
      setDisplayedContent(content);
      setIsTyping(false);
      return;
    }

    let i = 0;
    setIsTyping(true);
    
    const interval = setInterval(() => {
      // Reveal 2 characters at a time for smoother rendering
      setDisplayedContent(content.slice(0, i));
      i += 2; 
      
      if (i > content.length) {
        setDisplayedContent(content);
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 15); // 15ms per tick creates a natural, fast typing speed

    return () => clearInterval(interval);
  }, [content, isNew]);

  useEffect(() => {
    // Auto-scroll as the text expands the container
    if (isTyping) {
      scrollToBottom("auto"); // "auto" prevents the jitter caused by "smooth" during rapid updates
    }
  }, [displayedContent, isTyping, scrollToBottom]);

  // Add the classic AI blinking cursor block while typing
  const renderContent = isTyping ? displayedContent + " ▍" : displayedContent;

  return (
    <ReactMarkdown
      children={renderContent}
      remarkPlugins={[remarkGfm]}
      components={components}
    />
  );
};

export default TypingMarkdown;