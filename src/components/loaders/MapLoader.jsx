import { Globe } from 'lucide-react';

const MapLoader = () => {
  return (
    <div className="absolute top-4 right-4 pointer-events-none" style={{ 
      zIndex: 999,
    }}>
      <div className="relative pointer-events-auto">
        {/* Main glass container - more compact */}
        <div className="relative bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/20 overflow-hidden">
          
          {/* Subtle radar scanner */}
          <div className="flex items-center space-x-3">
            {/* Radar circle with globe */}
            <div className="relative w-12 h-12 flex-shrink-0">
              
              {/* Single radar ring */}
              <div
                className="absolute inset-0 border border-cyan-400/30 rounded-full"
                style={{
                  animation: 'radarPulse 3s ease-out infinite',
                }}
              />
              
              {/* Subtle scanning beam */}
              <div 
                className="absolute inset-0 rounded-full overflow-hidden"
                style={{
                  background: 'conic-gradient(from 0deg, transparent, rgba(34, 211, 238, 0.3), transparent 20%)',
                  animation: 'radarScan 4s linear infinite',
                }}
              />
              
              {/* Center globe */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe 
                  className="w-6 h-6 text-white/80"
                  strokeWidth={2}
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.4))',
                  }}
                />
              </div>
              
              {/* Single blinking dot */}
              <div
                className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full"
                style={{
                  top: '30%',
                  left: '60%',
                  animation: 'blink 2s ease-in-out infinite',
                  boxShadow: '0 0 6px rgba(34, 211, 238, 0.8)',
                }}
              />
            </div>
            
            {/* Text section with new cool loader */}
            <div className="flex-1">
              <div className="text-white/90 text-sm font-medium mb-2">
                Loading Empires
              </div>
              
              {/* New cool loader: Morphing dots with wave effect */}
              <div className="flex items-center space-x-1">
                {/* Animated wave dots */}
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="relative"
                  >
                    
                    {/* Energy trail effect */}
                    
                  </div>
                ))}
                
                {/* Connecting energy beam */}
                <div 
                  className="absolute h-0.5 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
                  style={{
                    width: '60px',
                    animation: 'energyBeam 2s ease-in-out infinite',
                    filter: 'blur(1px)',
                  }}
                />
                
            
              </div>
            </div>
          </div>
          
          {/* Very subtle shimmer overlay */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%)',
              backgroundSize: '200% 200%',
              animation: 'shimmer 4s linear infinite',
            }}
          />
          
          {/* Glass reflection */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent rounded-2xl pointer-events-none" />
        </div>
        
        {/* Subtle outer glow */}
        <div 
          className="absolute inset-0 -z-10 rounded-2xl"
          style={{
            background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.1), transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
        
        {/* Add CSS animations */}
        <style jsx>{`
          @keyframes radarScan {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes radarPulse {
            0%, 100% { 
              opacity: 0; 
              transform: scale(1);
              border-color: rgba(34, 211, 238, 0.6);
            }
            50% { 
              opacity: 1; 
              transform: scale(1.3);
              border-color: rgba(34, 211, 238, 0.2);
            }
          }
          
          @keyframes blink {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          
          @keyframes morphDot {
            0%, 100% { 
              transform: translateY(0) scale(1);
              opacity: 0.3;
            }
            25% { 
              transform: translateY(-8px) scale(1.5);
              opacity: 1;
            }
            50% { 
              transform: translateY(0) scale(0.8);
              opacity: 0.6;
            }
            75% { 
              transform: translateY(4px) scale(1.2);
              opacity: 0.9;
            }
          }
          
          @keyframes trail {
            0%, 100% { 
              transform: translateY(0) scale(1);
              opacity: 0;
            }
            25% { 
              transform: translateY(-8px) scale(2);
              opacity: 0.3;
            }
            50% { 
              transform: translateY(0) scale(1);
              opacity: 0;
            }
          }
          
          @keyframes energyBeam {
            0%, 100% { 
              opacity: 0;
              transform: scaleX(0);
            }
            50% { 
              opacity: 1;
              transform: scaleX(1);
            }
          }
          
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          @keyframes numberScroll {
            0% { content: '47.62'; }
            10% { content: '47.58'; }
            20% { content: '47.64'; }
            30% { content: '47.61'; }
            40% { content: '47.59'; }
            50% { content: '47.63'; }
            60% { content: '47.60'; }
            70% { content: '47.65'; }
            80% { content: '47.57'; }
            90% { content: '47.66'; }
            100% { content: '47.62'; }
          }
          
          @keyframes numberScroll2 {
            0% { content: '122.33'; }
            10% { content: '122.31'; }
            20% { content: '122.35'; }
            30% { content: '122.32'; }
            40% { content: '122.34'; }
            50% { content: '122.30'; }
            60% { content: '122.36'; }
            70% { content: '122.33'; }
            80% { content: '122.37'; }
            90% { content: '122.31'; }
            100% { content: '122.33'; }
          }
          
          @keyframes coordinates {
            0%, 90% { opacity: 1; }
            95%, 100% { opacity: 0.6; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default MapLoader;