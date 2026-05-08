import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Video, VideoOff, Mic, MicOff, Monitor, MessageSquare,
  ExternalLink, ChevronDown, Settings,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

/**
 * Google Meet-style prejoin lobby.
 * Shows a live camera preview, mic/camera toggles, then opens the call in a new tab.
 */
export default function VideoCallModal({ roomUrl, callTitle, onClose }) {
  const { user } = useAuth();
  const videoRef        = useRef(null);
  const streamRef       = useRef(null);
  const [camOn,  setCamOn]    = useState(true);
  const [micOn,  setMicOn]    = useState(true);
  const [joined, setJoined]   = useState(false);
  const [camErr, setCamErr]   = useState(false);

  // Build the final meeting URL (Jitsi with mic/cam state baked in)
  const rawRoom = roomUrl
    .replace('https://meet.jit.si/', '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '');

  const meetUrl = `https://meet.jit.si/${rawRoom}`
    + `#config.prejoinPageEnabled=false`
    + `&config.startWithVideoMuted=${!camOn}`
    + `&config.startWithAudioMuted=${!micOn}`
    + `&config.disableDeepLinking=true`
    + `&config.disableVirtualBackground=true`
    + `&interfaceConfig.MOBILE_APP_PROMO=false`
    + `&interfaceConfig.SHOW_JITSI_WATERMARK=false`
    + `&interfaceConfig.DEFAULT_BACKGROUND=%23202124`;

  // ── Camera preview ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!camOn) {
      stopStream();
      return;
    }
    startStream();
    return stopStream;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOn]);

  function startStream() {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamErr(false);
      })
      .catch(() => setCamErr(true));
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  // ── Join: stop preview, open call ──────────────────────────────────────────
  const handleJoin = () => {
    stopStream();
    window.open(meetUrl, '_blank', 'noopener,noreferrer');
    setJoined(true);
  };

  // ── Initials fallback ───────────────────────────────────────────────────────
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'You';
  const initials    = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => () => stopStream(), []); // eslint-disable-line

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-4xl bg-[#202124] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
        style={{ minHeight: 480 }}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{ scale: 0.94,    opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        {/* ── Close ── */}
        <button
          onClick={() => { stopStream(); onClose(); }}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#3c4043] hover:bg-[#5f6368] text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ══ LEFT — Camera Preview ══════════════════════════════════════════ */}
        <div className="relative flex-1 bg-[#1a1a1e] flex items-center justify-center min-h-[280px] md:min-h-[480px]">
          {camOn && !camErr ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' /* mirror */ }}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: avatarColor(displayName) }}
              >
                {initials}
              </div>
              {camErr && (
                <p className="text-[#9aa0a6] text-xs text-center px-4">
                  Camera not available
                </p>
              )}
            </div>
          )}

          {/* Name bar */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-white text-sm font-medium">{displayName}</p>
          </div>

          {/* Bottom controls row (mic + cam toggles) */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
            {/* Mic */}
            <button
              onClick={() => setMicOn((v) => !v)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                micOn ? 'bg-[#3c4043] hover:bg-[#5f6368]' : 'bg-[#ea4335] hover:bg-[#d33426]'
              }`}
              title={micOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micOn ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
            </button>

            {/* Camera */}
            <button
              onClick={() => setCamOn((v) => !v)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                camOn ? 'bg-[#3c4043] hover:bg-[#5f6368]' : 'bg-[#ea4335] hover:bg-[#d33426]'
              }`}
              title={camOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {camOn ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
            </button>

            {/* Background / settings (decorative) */}
            <button
              className="w-12 h-12 rounded-full bg-[#3c4043] hover:bg-[#5f6368] flex items-center justify-center transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* ══ RIGHT — Join Panel ═════════════════════════════════════════════ */}
        <div className="w-full md:w-80 bg-[#202124] flex flex-col items-center justify-center gap-6 px-8 py-10">
          <AnimatePresence mode="wait">
            {!joined ? (
              <motion.div
                key="prejoin"
                className="flex flex-col items-center gap-5 w-full"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <div>
                  <h2 className="text-white text-2xl font-normal text-center">Ready to join?</h2>
                  <p className="text-[#9aa0a6] text-sm text-center mt-1">No one else is here</p>
                </div>

                {/* Meeting title badge */}
                <div className="w-full px-3 py-2 bg-[#303134] rounded-xl text-center">
                  <p className="text-white text-sm font-medium truncate">{callTitle}</p>
                  <p className="text-[#9aa0a6] text-xs mt-0.5">
                    {rawRoom.slice(0, 12) + (rawRoom.length > 12 ? '…' : '')}
                  </p>
                </div>

                {/* Feature chips */}
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { icon: <Video className="h-3 w-3" />,          label: 'Video'        },
                    { icon: <Mic className="h-3 w-3" />,            label: 'Audio'        },
                    { icon: <Monitor className="h-3 w-3" />,        label: 'Screen Share' },
                    { icon: <MessageSquare className="h-3 w-3" />,  label: 'Chat'         },
                  ].map(({ icon, label }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#303134] text-[#9aa0a6] text-xs rounded-full"
                    >
                      {icon} {label}
                    </span>
                  ))}
                </div>

                {/* Join now */}
                <button
                  onClick={handleJoin}
                  className="w-full py-3 rounded-full bg-[#1a73e8] hover:bg-[#1765cc] text-white font-medium text-base transition-colors shadow-lg"
                >
                  Join now
                </button>

                {/* Other ways */}
                <button
                  className="w-full py-2.5 rounded-full border border-[#5f6368] text-[#8ab4f8] font-medium text-sm flex items-center justify-center gap-1.5 hover:bg-[#303134] transition-colors"
                  onClick={handleJoin}
                >
                  Other ways to join <ChevronDown className="h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="joined"
                className="flex flex-col items-center gap-5 w-full"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-16 h-16 rounded-full bg-[#1a73e8] flex items-center justify-center">
                  <Video className="h-8 w-8 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-white text-lg font-medium">Call opened!</h3>
                  <p className="text-[#9aa0a6] text-sm mt-1">
                    The call has opened in a new tab.<br />
                    Microphone & camera: {micOn ? 'on' : 'muted'} / {camOn ? 'on' : 'off'}
                  </p>
                </div>

                {/* Re-open */}
                <a
                  href={meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-full bg-[#1a73e8] hover:bg-[#1765cc] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open call again
                </a>

                <button
                  onClick={() => { stopStream(); onClose(); }}
                  className="w-full py-2.5 rounded-full border border-[#5f6368] text-[#9aa0a6] hover:bg-[#303134] font-medium text-sm transition-colors"
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#1a73e8', '#34a853', '#ea4335', '#fbbc05', '#9334e6',
  '#00bfa5', '#e67c00', '#c2185b',
];

function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

