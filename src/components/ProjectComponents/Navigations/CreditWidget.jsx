import React, { useState, useEffect, useRef, forwardRef } from 'react'
import { useSelector } from 'react-redux'
import { 
  motion, 
  AnimatePresence, 
  animate 
} from 'framer-motion'
import {
  XIcon,
  RefreshCwIcon,
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
  
  // Calculations for Liquid Wave & Color
  const percentageRemaining = Math.max(0, Math.min(100, (remainingCredits / totalTokens) * 100))
  const fillPercentage = 100 - percentageRemaining 
  
  const hue = Math.floor((percentageRemaining / 100) * 144)
  const dynamicColor = `hsl(${hue}, 100%, 50%)`

  // --- SAFELY ANIMATED NUMBER STATES ---
  const [displayPercentage, setDisplayPercentage] = useState(0)
  const [displayQueries, setDisplayQueries] = useState(0)
  const [displayUsed, setDisplayUsed] = useState(0)
  const [displayRemaining, setDisplayRemaining] = useState(0)

  useEffect(() => {
    if (isOpen) {
      animate(0, fillPercentage, { duration: 1.5, ease: "easeOut", delay: 0.1, onUpdate: v => setDisplayPercentage(Math.round(v)) })
      animate(0, totalCreditsUsed, { duration: 1.5, ease: "easeOut", delay: 0.1, onUpdate: v => setDisplayQueries(Math.round(v)) })
      animate(0, totalCreditsUsed, { duration: 1.5, ease: "easeOut", delay: 0.15, onUpdate: v => setDisplayUsed(Math.round(v)) })
      animate(0, remainingCredits, { duration: 1.5, ease: "easeOut", delay: 0.2, onUpdate: v => setDisplayRemaining(Math.round(v)) })
    } else {
      setDisplayPercentage(0)
      setDisplayQueries(0)
      setDisplayUsed(0)
      setDisplayRemaining(0)
    }
  }, [isOpen, fillPercentage, totalCreditsUsed, remainingCredits])

  // --- Click Outside Logic ---
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

  // --- Confetti Claim Handler & API Call ---
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

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { x, y },
        colors: ['#00FF66', '#ffffff', '#a1a1aa'], 
        disableForReducedMotion: true
      })

      setQuotaData(prev => ({
        ...prev,
        canClaimToday: false, 
        remainingCredits: prev.remainingCredits + dailyCredits
      }))

      toast.success(response.message || "10 credits earned!")

    } catch (err) {
      toast.error(err.message || "Something went wrong claiming credits")
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="absolute bottom-[calc(100%+8px)] left-0 w-full z-50 origin-bottom"
        >
          {/* Main card */}
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-b from-zinc-900 to-[#141416] shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.4)] backdrop-blur-xl">
            
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF66]/40 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h3 className="text-[13px] font-semibold text-zinc-300 flex items-center gap-2 tracking-wide uppercase">
                <ZapIcon className="w-3.5 h-3.5" style={{ color: dynamicColor }} />
                Credit Usage
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Close popup"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="px-5 pb-5">
              
              {/* --- LIQUID WAVE LOADER --- */}
              <div className="flex justify-center mb-6 relative">
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] rounded-full blur-2xl pointer-events-none opacity-20 transition-colors duration-500" 
                  style={{ backgroundColor: dynamicColor }} 
                />
                
                <div className="relative w-[160px] h-[160px] rounded-full overflow-hidden shadow-[inset_0_4px_16px_rgba(0,0,0,0.9)] border border-white/[0.05] bg-[#0A0A0C]">
                  
                  <motion.div
                    initial={{ y: 160, x: "-50%" }}
                    animate={{ y: 160 - (160 * (fillPercentage / 100)), x: "-50%" }}
                    transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
                    className="absolute top-0 left-1/2 w-[300px] h-[300px] z-0"
                  >
                    <motion.div
                      className="absolute top-0 left-0 w-full h-full opacity-30 transition-colors duration-500"
                      style={{ backgroundColor: dynamicColor, borderRadius: '42%' }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 4.5, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute top-[8px] left-0 w-full h-full opacity-50 transition-colors duration-500"
                      style={{ backgroundColor: dynamicColor, borderRadius: '45%' }}
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 5.5, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute top-[16px] left-0 w-full h-full opacity-80 transition-colors duration-500"
                      style={{ backgroundColor: dynamicColor, borderRadius: '40%' }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 6.5, ease: "linear" }}
                    />
                  </motion.div>

                  <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.08)] pointer-events-none z-10" />

                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <motion.div
                      className="text-[34px] font-extrabold text-white tracking-tight leading-none"
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
                    >
                      {displayPercentage}%
                    </motion.div>
                    <span 
                      className="text-[10px] text-zinc-200 font-bold mt-1 uppercase tracking-widest" 
                      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
                    >
                      Used
                    </span>
                  </div>
                </div>
              </div>
              {/* --- END LIQUID WAVE LOADER --- */}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} 
                  className="relative rounded-xl p-3 text-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(0,0,0,0.6)] bg-black/50 border border-black/70 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/20 to-transparent" />
                  <FlameIcon className="w-3.5 h-3.5 text-orange-400/60 mx-auto mb-1.5" />
                  <motion.div className="text-[17px] font-bold text-zinc-200 leading-none mb-1">
                    {displayUsed}
                  </motion.div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-medium">Used</div>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} 
                  className="relative rounded-xl p-3 text-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(0,0,0,0.6)] bg-black/50 border border-black/70 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF66]/20 to-transparent" />
                  <SparklesIcon className="w-3.5 h-3.5 text-[#00FF66]/60 mx-auto mb-1.5" />
                  <motion.div className="text-[17px] font-bold text-[#00FF66] leading-none mb-1">
                    {displayRemaining}
                  </motion.div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-medium">Remaining</div>
                </motion.div>
              </div>

              {/* GAMIFIED: Claim Daily Reward */}
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} 
                className={`relative flex items-center justify-between gap-3 rounded-xl p-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(0,0,0,0.6)] bg-black/50 border transition-colors duration-500 overflow-hidden ${
                  isClaimed ? 'border-black/70' : 'border-[#00FF66]/20'
                }`}>
                
                {!isClaimed && (
                  <div className="absolute inset-0 bg-[#00FF66]/5 blur-xl pointer-events-none" />
                )}

                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF66]/10 to-transparent" />
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`p-2 rounded-lg flex-shrink-0 shadow-inner transition-colors duration-300 flex items-center justify-center ${
                    isClaimed ? 'bg-zinc-800/30 border border-zinc-700/30 w-8 h-8' : 'bg-[#00FF66]/[0.08] border border-[#00FF66]/[0.2] w-8 h-8'
                  }`}>
                    {isClaimed ? (
                      <CheckIcon className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <img src="/icons8-wrapped%20gift-emoji-32.png" alt="Gift" className="w-5 h-5 object-contain drop-shadow-md" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-[13px] font-semibold mb-0.5 leading-none transition-colors ${
                      isClaimed ? 'text-zinc-500' : 'text-zinc-200'
                    }`}>
                      Daily Reward
                    </h4>
                    <p className={`text-[11px] font-medium transition-colors ${
                      isClaimed ? 'text-zinc-600' : 'text-[#00FF66]'
                    }`}>
                      +{dailyCredits} <span className={isClaimed ? "text-zinc-600" : "text-zinc-500"}>Credits</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClaim}
                  disabled={isClaimed}
                  className={`relative px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-all duration-300 z-10 ${
                    isClaimed 
                      ? 'bg-zinc-800/40 text-zinc-500 border border-zinc-700/50 cursor-not-allowed shadow-none'
                      : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                  }`}
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
        className={`w-full text-left group transition-all duration-200 rounded-xl border border-white/[0.06] bg-gradient-to-b from-zinc-900 to-[#141416] p-3.5 ${
          isOpen 
            ? 'shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.4)] ring-1 ring-white/10' 
            : 'shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.4)] hover:bg-zinc-800/50'
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center">
            <span className="text-[13px] font-medium text-zinc-300 drop-shadow-sm">Map Credits</span>
            
            <AnimatePresence>
              {!isClaimed && (
                <motion.img 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -3, 0] }}
                  exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                  transition={{ 
                    y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 }
                  }}
                  src="/icons8-wrapped%20gift-emoji-32.png" 
                  alt="Gift waiting" 
                  className="w-4 h-4 ml-2 object-contain drop-shadow-md" 
                />
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1.5">
            <span 
              className="text-[11px] font-bold transition-colors"
              style={{ color: dynamicColor }}
            >
              {Math.round(percentageRemaining)}%
            </span>
            <ArrowUpRightIcon
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                isOpen ? 'text-white rotate-45' : 'text-zinc-500 group-hover:text-zinc-300'
              }`}
            />
          </div>
        </div>
        
        <div className="h-1.5 w-full rounded-full overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(0,0,0,0.6)] bg-black/50 border border-black/70">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentageRemaining}%` }}
            transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
            className="h-full rounded-full relative transition-colors duration-500" 
            style={{ 
              backgroundColor: dynamicColor, 
              boxShadow: dynamicShadow
            }}
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
  
  const [quotaData, setQuotaData] = useState({
    remainingCredits: 0,
    totalCreditsUsed: 0,
    canClaimToday: false,
    premium: false
  })

  useEffect(() => {
    if (userId) {
      getQuotaStatus(userId)
        .then(data => {
          setQuotaData(data)
        })
        .catch(err => console.error("Failed to load quota data:", err))
    }
  }, [userId])

  const isClaimed = !quotaData.canClaimToday

  const buttonRef = useRef(null)

  return (
    <div className="relative w-full">
      <CreditBar 
        ref={buttonRef} 
        isOpen={isOpen} 
        onClick={() => setIsOpen(!isOpen)} 
        isClaimed={isClaimed} 
        quotaData={quotaData}
      />
      <CreditPopup 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        triggerRef={buttonRef} 
        isClaimed={isClaimed} 
        quotaData={quotaData}
        setQuotaData={setQuotaData}
        userId={userId}
      />
    </div>
  )
}