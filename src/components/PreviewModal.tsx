/**
 * PreviewModal Component
 * Live Web & Project Preview session supporting any URL, localhost ports, HTML/React apps, and external projects
 * Features:
 * - Address bar with URL editing & Go button
 * - Responsive device modes: Desktop, Tablet (iPad), Mobile (iPhone)
 * - Reload / Refresh iframe button
 * - Open in new tab fallback
 * - Fullscreen toggle & sleek browser frame
 */

import React, { useState, useRef } from 'react';
import {
  Globe,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  X,
  Maximize2,
  Minimize2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  initialUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
}) => {
  const [url, setUrl] = useState<string>(initialUrl);
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const handleNavigate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let target = inputUrl.trim();
    if (!target) return;
    if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('/')) {
      target = 'https://' + target;
    }
    setUrl(target);
    setIsLoading(true);
  };

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  // Dimensions based on device emulation
  const getContainerStyles = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'w-[375px] h-[667px] max-h-[90vh] rounded-3xl border-[6px] border-[#333] shadow-2xl';
      case 'tablet':
        return 'w-[768px] h-[900px] max-h-[90vh] rounded-2xl border-[4px] border-[#333] shadow-2xl';
      default:
        return 'w-full h-full rounded-b-xl border border-t-0 border-[#333]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 md:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full bg-[#181818] border border-[#3c3c3c] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans transition-all duration-200 ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-7xl h-[97vh] sm:h-[96vh]'
        }`}
      >
        {/* Top Browser Bar */}
        <div className="h-12 bg-[#212121] px-3 sm:px-4 border-b border-[#333] flex items-center justify-between gap-2 select-none">
          {/* Left: Window Controls & Title */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-1.5 mr-2">
              <div
                className="w-3 h-3 rounded-full bg-[#ff5f56] hover:opacity-80 cursor-pointer"
                onClick={onClose}
                title="Fermer"
              />
              <div
                className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:opacity-80 cursor-pointer"
                onClick={() => setDeviceMode(deviceMode === 'desktop' ? 'mobile' : 'desktop')}
                title="Basculer format"
              />
              <div
                className="w-3 h-3 rounded-full bg-[#27c93f] hover:opacity-80 cursor-pointer"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title="Plein écran"
              />
            </div>

            <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              <Globe className="w-3 h-3" />
              <span>Preview</span>
            </div>
          </div>

          {/* Center: Address Bar */}
          <form
            onSubmit={handleNavigate}
            className="flex-1 max-w-xl flex items-center bg-[#121212] border border-[#383838] focus-within:border-cyan-500 rounded-full px-3 py-1 text-xs transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mr-2 shrink-0" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Entrez une URL (ex: http://localhost:3000, https://example.com)..."
              className="w-full bg-transparent text-white font-mono placeholder-[#666] outline-none text-[11px] sm:text-xs"
            />
            <button
              type="submit"
              className="ml-1 p-1 text-[#888] hover:text-white transition-colors"
              title="Naviguer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Right: Device Controls & Window Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Device Emulation Switcher */}
            <div className="hidden sm:flex items-center bg-[#121212] border border-[#333] rounded-lg p-0.5">
              <button
                onClick={() => setDeviceMode('desktop')}
                title="Écran Ordinateur (Desktop)"
                className={`p-1 rounded ${
                  deviceMode === 'desktop'
                    ? 'bg-[#333] text-cyan-400'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeviceMode('tablet')}
                title="Tablette (iPad)"
                className={`p-1 rounded ${
                  deviceMode === 'tablet'
                    ? 'bg-[#333] text-cyan-400'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeviceMode('mobile')}
                title="Mobile (iPhone/Android)"
                className={`p-1 rounded ${
                  deviceMode === 'mobile'
                    ? 'bg-[#333] text-cyan-400'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reload button */}
            <button
              onClick={handleReload}
              title="Actualiser la page"
              className="p-1.5 rounded-lg text-[#858585] hover:text-white hover:bg-[#333] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* External link */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Ouvrir dans un nouvel onglet"
              className="p-1.5 rounded-lg text-[#858585] hover:text-white hover:bg-[#333] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Réduire' : 'Plein écran'}
              className="p-1.5 rounded-lg text-[#858585] hover:text-white hover:bg-[#333] transition-colors hidden sm:block"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#858585] hover:text-white hover:bg-[#333] transition-colors"
              title="Fermer la Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Frame Container */}
        <div className="flex-1 bg-[#101010] flex items-center justify-center p-1 sm:p-2 overflow-hidden relative">
          <div className={`transition-all duration-300 overflow-hidden bg-white ${getContainerStyles()}`}>
            <iframe
              ref={iframeRef}
              src={url}
              title="Project Live Preview"
              className="w-full h-full border-none bg-white"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
