import React, { useState, useEffect, useRef, forwardRef } from 'react'
import { useSelector } from 'react-redux'
import { 
  motion, 
  AnimatePresence, 
  animate 
} from 'framer-motion'
import {
  XIcon,
  ZapIcon,
  FlameIcon,
  SparklesIcon,
  ArrowUpRightIcon,
  CheckIcon
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { toast } from 'react-toastify'

// Adjust this import path if your api folder is located elsewhere
import { getQuotaStatus, claimDailyReward } from '../../api/credits'

// Helper to determine the story text based on usage
const getTreasureText = (used) => {
  if (used >= 500) return null; 
  if (used >= 450) return "Almost there, grab your chair… 🪑";
  if (used >= 400) return "Great going! The Treasure Box is glowing ✨";
  if (used >= 350) return "The Treasure Box is loosening… 🔑";
  if (used >= 300) return "Getting closer… can you feel it? 💫";
  if (used >= 200) return "Treasure on the way… ✨";
  if (used >= 150) return "Something's warming up inside 🔥";
  if (used >= 100) return "You're onto something… 👣";
  return "Treasure hunt begins… 🕵️";
};

// --- 1. The Popup Component ---
export function CreditPopup({ 
  isOpen, 
  onClose, 
  triggerRef, 
  isClaimed, 
  quotaData, 
  setQuotaData, 
  userId 
}) {
  const popupRef = useRef(null)
  
  // Destructure dynamic data from API
  const { remainingCredits, totalCreditsUsed } = quotaData
  const totalTokens = remainingCredits + totalCreditsUsed || 1 
  const dailyCredits = 10 
  
  // Color calculation for headers
  const percentageRemaining = Math.max(0, Math.min(100, (remainingCredits / totalTokens) * 100))
  const hue = Math.floor((percentageRemaining / 100) * 144)
  const dynamicColor = `hsl(${hue}, 100%, 50%)`

  // --- TRUE 3D TREASURE CHEST CALCULATION ---
  const maxQueriesForChest = 500;
  const chestProgress = Math.max(0, Math.min(1, totalCreditsUsed / maxQueriesForChest));
  const isFullyOpen = chestProgress >= 1;
  
  // 3D Chest Dimensions
  const w = 110;   // Width
  const h = 45;    // Base Height 
  const d = 65;    // Depth
  const lidH = 35; // Lid Height

  // Animated states for bottom stat cards
  const [displayUsed, setDisplayUsed] = useState(0)
  const [displayRemaining, setDisplayRemaining] = useState(0)

  useEffect(() => {
    if (isOpen) {
      animate(0, totalCreditsUsed, { duration: 1.5, ease: "easeOut", delay: 0.15, onUpdate: v => setDisplayUsed(Math.round(v)) })
      animate(0, remainingCredits, { duration: 1.5, ease: "easeOut", delay: 0.2, onUpdate: v => setDisplayRemaining(Math.round(v)) })
    } else {
      setDisplayUsed(0)
      setDisplayRemaining(0)
    }
  }, [isOpen, totalCreditsUsed, remainingCredits])

  // Click Outside Logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerRef])

  // Confetti Claim Handler
  const handleClaim = async (e) => {
    if (!userId) {
      toast.error("User ID not found")
      return
    }

    const rect = e.target.getBoundingClientRect()
    const x = (rect.left + rect.width / 2) / window.innerWidth
    const y = (rect.top + rect.height / 2) / window.innerHeight
    
    try {
      const response = await claimDailyReward(userId);
      confetti({ particleCount: 60, spread: 60, origin: { x, y }, colors: ['#00FF66', '#ffffff', '#a1a1aa'], disableForReducedMotion: true })
      setQuotaData(prev => ({ ...prev, canClaimToday: false, remainingCredits: prev.remainingCredits + dailyCredits }))
      toast.success(response.message || "10 credits earned!")
    } catch (err) {
      toast.error(err.message || "Something went wrong claiming credits")
    }
  }

  // Common UI styles for the 3D faces
  const woodFace = "absolute bg-amber-700 border-2 border-amber-950 flex flex-col justify-evenly overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]";
  const woodInner = "absolute bg-amber-950 border-2 border-amber-900";
  const woodPlank = <div className="w-full h-[1px] bg-amber-950/60" />;
  const GoldStrap = ({ left }) => <div className={`absolute top-0 bottom-0 w-2.5 bg-gradient-to-b from-yellow-500 to-yellow-600 border-x border-yellow-700 ${left ? 'left-3' : 'right-3'}`} />;

  const currentMessage = getTreasureText(totalCreditsUsed);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.92, x: -12 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.92, x: -12 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="absolute bottom-0 left-[calc(100%+12px)] w-[300px] z-50 origin-bottom-left"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-b from-zinc-900 to-[#141416] shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF66]/40 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h3 className="text-[13px] font-semibold text-zinc-300 flex items-center gap-2 tracking-wide uppercase">
                <ZapIcon className="w-3.5 h-3.5" style={{ color: dynamicColor }} />
                Credit Usage
              </h3>
              <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-colors">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="px-5 pb-5">
              
              <div className="flex justify-center mt-6 mb-2 relative h-[140px]" style={{ perspective: '800px' }}>
                
                {/* Background Ambient Glow */}
                <motion.div
                  animate={{ opacity: chestProgress, scale: 0.8 + chestProgress * 0.4 }}
                  className="absolute top-[60px] left-1/2 -translate-x-1/2 w-[140px] h-[140px] bg-yellow-500/20 rounded-full blur-2xl pointer-events-none"
                />

                {/* 3D Scene Wrapper */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  style={{
                    position: 'relative',
                    top: '25px', 
                    width: w,
                    height: h + lidH,
                    transformStyle: 'preserve-3d',
                    transform: 'rotateX(-20deg) rotateY(-25deg)', 
                  }}
                >
                  {/* --- THE BASE --- */}
                  <div style={{ position: 'absolute', top: lidH, left: 0, width: w, height: h, transformStyle: 'preserve-3d' }}>
                    
                    {/* Inner Floor inside chest */}
                    <div style={{ width: w, height: d, top: h/2 - d/2, left: 0, transform: `translateY(${h/2 - 1}px) rotateX(-90deg)`, position: 'absolute' }}>
                       <div className="w-full h-full bg-yellow-600 shadow-[inset_0_0_30px_rgba(120,53,15,0.8)] border-4 border-amber-950" />
                    </div>

                    {/* Outer Floor sealing the bottom */}
                    <div className={woodInner} style={{ width: w, height: d, top: h/2 - d/2, left: 0, transform: `translateY(${h/2 + 1}px) rotateX(90deg)` }} />
                    
                    {/* Base Walls (Back, Left, Right) */}
                    <div className={woodInner} style={{ width: w, height: h, top: 0, left: 0, transform: `translateZ(-${d/2}px) rotateY(180deg)` }} />
                    <div className={woodInner} style={{ width: d, height: h, top: 0, left: w/2 - d/2, transform: `translateX(-${w/2}px) rotateY(-90deg)` }} />
                    <div className={woodInner} style={{ width: d, height: h, top: 0, left: w/2 - d/2, transform: `translateX(${w/2}px) rotateY(90deg)` }} />
                    
                    {/* 💰 REAL VOLUMETRIC TREASURE MOUND 💰 */}
                    <motion.div 
                      className="absolute" 
                      style={{ width: w, height: h, top: 0, left: 0, transformStyle: 'preserve-3d', transformOrigin: 'bottom center' }}
                      // SIMPLY MOVED EVERYTHING UP using y: -20
                      initial={{ scale: 0.4, opacity: 0, y: -20, z: -10 }}
                      animate={{ 
                        scale: 0.5 + chestProgress * 0.5, 
                        opacity: chestProgress > 0.02 ? 1 : 0,
                        y: -20 - chestProgress * 15, // Starts high (-20) and goes even higher as it opens
                        z: -10 + chestProgress * 15
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      {/* Inner Glowing Core */}
                      <motion.div 
                        className="absolute w-12 h-12 bg-yellow-200/60 blur-xl rounded-full"
                        style={{ bottom: 10, left: 30, transform: 'translateZ(5px)' }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />

                      {/* Topographical Gold Layers */}
                      <div className="absolute bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-t-full border border-yellow-700/50" style={{ width: 90, height: 45, bottom: 4, left: 10, transform: 'translateZ(-10px)' }} />
                      <div className="absolute bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-t-full shadow-[0_0_20px_#facc15] border border-yellow-500/50" style={{ width: 80, height: 35, bottom: 4, left: 15, transform: 'translateZ(2px)' }} />
                      <div className="absolute bg-gradient-to-b from-yellow-300 to-yellow-400 rounded-t-full shadow-[0_0_15px_#fef08a] border border-yellow-300/50" style={{ width: 60, height: 25, bottom: 4, left: 25, transform: 'translateZ(15px)' }} />
                      
                      {/* Individual 3D Gems & Coins */}
                      <div className="absolute w-6 h-6 bg-rose-500 border-2 border-rose-300 shadow-[0_2px_4px_rgba(0,0,0,0.6)] rotate-45" style={{ bottom: 16, left: 30, transform: 'translateZ(18px)' }}>
                         <div className="absolute inset-1 border border-rose-300/50" />
                      </div>
                      <div className="absolute w-5 h-6 bg-emerald-400 border-2 border-emerald-200 shadow-[0_2px_4px_rgba(0,0,0,0.6)] skew-x-12" style={{ bottom: 19, left: 65, transform: 'translateZ(12px)' }}>
                         <div className="absolute inset-0.5 border border-emerald-200/50" />
                      </div>
                      <div className="absolute w-5 h-5 bg-blue-500 border-2 border-blue-300 shadow-[0_2px_4px_rgba(0,0,0,0.6)] rounded-full" style={{ bottom: 29, left: 45, transform: 'translateZ(8px)' }}>
                         <div className="w-2 h-2 bg-blue-300/60 rounded-full ml-1 mt-0.5" />
                      </div>
                      
                      {/* Stacked Coins Right */}
                      <div className="absolute" style={{ bottom: 9, left: 58, transform: 'translateZ(22px)' }}>
                         <div className="w-6 h-6 bg-yellow-400 border border-yellow-600 rounded-full absolute bottom-2 shadow-sm" />
                         <div className="w-6 h-6 bg-yellow-300 border border-yellow-500 rounded-full absolute bottom-1 shadow-sm" />
                         <div className="w-6 h-6 bg-yellow-200 border border-yellow-400 rounded-full absolute bottom-0 flex items-center justify-center shadow-sm">
                             <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                         </div>
                      </div>
                      {/* Stacked Coins Left */}
                      <div className="absolute" style={{ bottom: 6, left: 18, transform: 'translateZ(14px)' }}>
                         <div className="w-5 h-5 bg-yellow-400 border border-yellow-600 rounded-full absolute bottom-1 shadow-sm" />
                         <div className="w-5 h-5 bg-yellow-300 border border-yellow-500 rounded-full absolute bottom-0 flex items-center justify-center shadow-sm">
                             <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                         </div>
                      </div>

                      {/* --- 🎉 EXTRA GOLD INSIDE AT 500 QUERIES 🎉 --- */}
                      <AnimatePresence>
                        {isFullyOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', bounce: 0.6, delay: 0.2 }}
                            className="absolute w-full h-full"
                            style={{ transformStyle: 'preserve-3d' }}
                          >
                            <div className="absolute w-10 h-10 bg-yellow-300 border border-yellow-500 rounded-full shadow-[0_0_20px_#fde047]" style={{ bottom: 10, left: w/2 - 20, transform: 'translateZ(28px)' }}>
                               <div className="absolute inset-1 border-2 border-yellow-400 rounded-full opacity-50" />
                            </div>
                            <div className="absolute w-8 h-8 bg-purple-500 border-2 border-purple-300 rounded-full shadow-[0_0_15px_#c084fc]" style={{ bottom: 15, left: 10, transform: 'translateZ(24px)' }} />
                            <div className="absolute w-7 h-7 bg-blue-400 border-2 border-blue-200 shadow-[0_0_15px_#60a5fa] rotate-12" style={{ bottom: 20, right: 10, transform: 'translateZ(26px)' }} />
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>

                    {/* --- 🎉 SCATTERED GOLD AROUND CHEST AT 500 QUERIES 🎉 --- */}
                    <AnimatePresence>
                      {isFullyOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -40, scale: 0 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', bounce: 0.5, delay: 0.4 }}
                          className="absolute"
                          style={{ width: w, height: h, top: 0, left: 0, transformStyle: 'preserve-3d' }}
                        >
                          {/* Left side spilled coins */}
                          <div className="absolute w-6 h-6 bg-yellow-400 border border-yellow-600 rounded-full drop-shadow-lg" style={{ bottom: -2, left: -30, transform: 'translateZ(10px) rotateX(70deg)' }} />
                          <div className="absolute w-5 h-5 bg-yellow-300 border border-yellow-500 rounded-full drop-shadow-lg" style={{ bottom: 5, left: -45, transform: 'translateZ(-5px) rotateX(75deg)' }} />
                          
                          {/* Right side spilled coins */}
                          <div className="absolute w-7 h-7 bg-yellow-400 border border-yellow-600 rounded-full drop-shadow-lg" style={{ bottom: -5, right: -35, transform: 'translateZ(20px) rotateX(65deg)' }} />
                          <div className="absolute w-4 h-4 bg-yellow-300 border border-yellow-500 rounded-full drop-shadow-lg" style={{ bottom: 15, right: -25, transform: 'translateZ(5px) rotateX(80deg)' }} />

                          {/* Front spilled gems & coins */}
                          <div className="absolute w-6 h-6 bg-yellow-300 border border-yellow-500 rounded-full drop-shadow-lg" style={{ bottom: -15, left: 20, transform: 'translateZ(45px) rotateX(60deg)' }} />
                          <div className="absolute w-6 h-6 bg-emerald-400 border border-emerald-600 rounded-sm drop-shadow-lg" style={{ bottom: -10, left: 50, transform: 'translateZ(50px) rotateX(50deg) rotateZ(30deg)' }} />
                          <div className="absolute w-5 h-5 bg-yellow-400 border border-yellow-600 rounded-full drop-shadow-lg" style={{ bottom: -18, left: 70, transform: 'translateZ(40px) rotateX(70deg)' }} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Sparkles erupting from inside */}
                    <AnimatePresence>
                      {chestProgress > 0 && Array.from({ length: 4 }).map((_, i) => (
                        <motion.div
                          key={`sparkle-${i}`}
                          className="absolute w-2 h-2 bg-yellow-100 rounded-full shadow-[0_0_10px_3px_#fde047] z-50"
                          style={{ left: 20 + i * 20, top: 10, transform: 'translateZ(20px)' }}
                          initial={{ scale: 0, y: -10 }}
                          animate={{ y: -50 - i * 15, scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 + i * 0.2, delay: i * 0.3 }}
                        />
                      ))}
                    </AnimatePresence>

                    {/* Front Base Face (Renders last to properly occlude base of treasure inside) */}
                    <div className={woodFace} style={{ width: w, height: h, top: 0, left: 0, transform: `translateZ(${d/2}px)` }}>
                      {woodPlank}{woodPlank}{woodPlank}
                      <GoldStrap left /><GoldStrap />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-5 bg-gradient-to-b from-yellow-500 to-yellow-600 border-x border-b border-yellow-700 rounded-b flex justify-center pt-1 shadow-md">
                        <div className="w-1.5 h-2.5 bg-amber-950 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* --- THE 3D LID --- */}
                  <motion.div
                    style={{
                      position: 'absolute',
                      top: 0, left: 0,
                      width: w, height: lidH,
                      transformStyle: 'preserve-3d',
                      transformOrigin: `50% 100% -${d/2}px`, 
                    }}
                    initial={{ rotateX: 0 }}
                    animate={{ rotateX: chestProgress * 110 }} 
                  >
                    {/* Lid Inner Ceiling */}
                    <div className={woodInner} style={{ width: w, height: d, top: lidH/2 - d/2, left: 0, transform: `translateY(-${lidH/2}px) rotateX(90deg)` }} />
                    {/* Lid Faces */}
                    <div className={woodInner} style={{ width: w, height: lidH, top: 0, left: 0, transform: `translateZ(-${d/2}px) rotateY(180deg)` }} />
                    <div className={woodInner} style={{ width: d, height: lidH, top: 0, left: w/2 - d/2, transform: `translateX(-${w/2}px) rotateY(-90deg)` }} />
                    <div className={woodInner} style={{ width: d, height: lidH, top: 0, left: w/2 - d/2, transform: `translateX(${w/2}px) rotateY(90deg)` }} />
                    
                    {/* Lid Top Outer Face */}
                    <div className={woodFace} style={{ width: w, height: d, top: lidH/2 - d/2, left: 0, transform: `translateY(-${lidH/2}px) rotateX(90deg)` }}>
                       <div className="absolute inset-0 bg-amber-600/30" />
                       {woodPlank}{woodPlank}{woodPlank}
                       <GoldStrap left /><GoldStrap />
                    </div>

                    {/* Lid Front Face */}
                    <div className={woodFace} style={{ width: w, height: lidH, top: 0, left: 0, transform: `translateZ(${d/2}px)` }}>
                      {woodPlank}{woodPlank}
                      <GoldStrap left /><GoldStrap />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-3 bg-gradient-to-b from-yellow-400 to-yellow-500 border-x border-t border-yellow-600 rounded-t" />
                    </div>
                  </motion.div>

                </motion.div>
              </div>
              {/* --- END TRUE 3D TREASURE CHEST --- */}
              <div className="h-5 relative w-full flex justify-center mb-1 bottom-4">
                <AnimatePresence mode="wait">
                  {currentMessage && (
                    <motion.div
                      key={currentMessage}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.3 }}
                      className="absolute text-xs font-medium text-amber-300/90 tracking-wide text-center drop-shadow-md"
                    >
                      {currentMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} 
                  className="relative rounded-xl p-3 text-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] bg-black/50 border border-black/70 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/20 to-transparent" />
                  <FlameIcon className="w-3.5 h-3.5 text-orange-400/60 mx-auto mb-1.5" />
                  <motion.div className="text-[17px] font-bold text-zinc-200 leading-none mb-1">{displayUsed}</motion.div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-medium">Used</div>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} 
                  className="relative rounded-xl p-3 text-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] bg-black/50 border border-black/70 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF66]/20 to-transparent" />
                  <SparklesIcon className="w-3.5 h-3.5 text-[#00FF66]/60 mx-auto mb-1.5" />
                  <motion.div className="text-[17px] font-bold text-[#00FF66] leading-none mb-1">{displayRemaining}</motion.div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-medium">Remaining</div>
                </motion.div>
              </div>

              {/* GAMIFIED: Claim Daily Reward */}
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} 
                className={`relative flex items-center justify-between gap-3 rounded-xl p-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] bg-black/50 border transition-colors duration-500 overflow-hidden ${isClaimed ? 'border-black/70' : 'border-[#00FF66]/20'}`}>
                {!isClaimed && <div className="absolute inset-0 bg-[#00FF66]/5 blur-xl pointer-events-none" />}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF66]/10 to-transparent" />
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`p-2 rounded-lg flex-shrink-0 shadow-inner transition-colors duration-300 flex items-center justify-center ${isClaimed ? 'bg-zinc-800/30 border border-zinc-700/30 w-8 h-8' : 'bg-[#00FF66]/[0.08] border border-[#00FF66]/[0.2] w-8 h-8'}`}>
                    {isClaimed ? <CheckIcon className="w-4 h-4 text-zinc-500" /> : <img src="/gift.png" alt="Gift" className="w-5 h-5 object-contain drop-shadow-md" />}
                  </div>
                  <div>
                    <h4 className={`text-[13px] font-semibold mb-0.5 leading-none transition-colors ${isClaimed ? 'text-zinc-500' : 'text-zinc-200'}`}>Daily Reward</h4>
                    <p className={`text-[11px] font-medium transition-colors ${isClaimed ? 'text-zinc-600' : 'text-[#00FF66]'}`}>+{dailyCredits} <span className={isClaimed ? "text-zinc-600" : "text-zinc-500"}>Credits</span></p>
                  </div>
                </div>

                <button
                  onClick={handleClaim}
                  disabled={isClaimed}
                  className={`relative px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-all duration-300 z-10 ${isClaimed ? 'bg-zinc-800/40 text-zinc-500 border border-zinc-700/50 cursor-not-allowed shadow-none' : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]'}`}
                >
                  {isClaimed ? 'Claimed' : 'Claim'}
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// --- 2. The Trigger Bar Component ---
export const CreditBar = forwardRef(({ onClick, isOpen, isClaimed, quotaData }, ref) => {
  const { remainingCredits, totalCreditsUsed } = quotaData
  const totalTokens = remainingCredits + totalCreditsUsed || 1 
  const percentageRemaining = Math.max(0, Math.min(100, (remainingCredits / totalTokens) * 100))
  const hue = Math.floor((percentageRemaining / 100) * 144)
  const dynamicColor = `hsl(${hue}, 100%, 50%)`
  const dynamicShadow = `0 0 10px hsla(${hue}, 100%, 50%, 0.4)`
  
  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={onClick}
        className={`w-full text-left group transition-all duration-200 rounded-xl border border-white/[0.06] bg-gradient-to-b from-zinc-900 to-[#141416] px-3 py-2 ${isOpen ? 'shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/10' : 'shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-zinc-800/50'}`}
        aria-expanded={isOpen}
      >
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center">
            <span className="text-[13px] font-medium text-zinc-300 drop-shadow-sm">Map Credits</span>
            <AnimatePresence>
              {!isClaimed && (
                <motion.img 
                  initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1, y: [0, -3, 0] }} exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                  transition={{ y: { duration: 2, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.2 }, scale: { duration: 0.2 } }}
                  src="/gift.png" alt="Gift waiting" className="w-4 h-4 ml-2 object-contain drop-shadow-md" 
                />
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold transition-colors" style={{ color: dynamicColor }}>{Math.round(percentageRemaining)}%</span>
            <ArrowUpRightIcon className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'text-white rotate-45' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] bg-black/50 border border-black/70">
          <motion.div 
            initial={{ width: 0 }} animate={{ width: `${percentageRemaining}%` }} transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
            className="h-full rounded-full relative transition-colors duration-500" style={{ backgroundColor: dynamicColor, boxShadow: dynamicShadow }}
          >
            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/40 rounded-full" />
          </motion.div>
        </div>
      </button>
    </div>
  )
})
CreditBar.displayName = 'CreditBar'

// --- 3. The Main Wrapper ---
export default function CreditWidget() {
  const userId = useSelector((state) => state.project.ownerEmail)
  const [isOpen, setIsOpen] = useState(false)
  const [quotaData, setQuotaData] = useState({ remainingCredits: 0, totalCreditsUsed: 0, canClaimToday: false, premium: false })

  useEffect(() => {
    if (userId) {
      getQuotaStatus(userId).then(data => setQuotaData(data)).catch(err => console.error("Failed to load quota data:", err))
    }
  }, [userId])

  const isClaimed = !quotaData.canClaimToday
  const buttonRef = useRef(null)

  return (
    <div className="relative w-full">
      <CreditBar ref={buttonRef} isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} isClaimed={isClaimed} quotaData={quotaData} />
      <CreditPopup isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={buttonRef} isClaimed={isClaimed} quotaData={quotaData} setQuotaData={setQuotaData} userId={userId} />
    </div>
  )
}