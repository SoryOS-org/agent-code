/**
 * Interactive Mermaid Diagram Component
 * Supports Flowchart, Sequence, Mindmap, ERD, Class, State, Gantt, Pie, GitGraph
 * Includes SVG zoom/pan, Fullscreen modal, PNG/SVG export, and syntax fallback
 */

import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';
import {
  Maximize2,
  Minimize2,
  Download,
  Copy,
  Check,
  Code2,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';

interface MermaidBlockProps {
  code: string;
}

// Initialize mermaid once with dark theme
let mermaidInitialized = false;
function initMermaidOnce() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'dark',
    darkMode: true,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    themeVariables: {
      darkMode: true,
      background: '#181818',
      mainBkg: '#1f2937',
      nodeBorder: '#3b82f6',
      primaryColor: '#1e3a8a',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#3b82f6',
      lineColor: '#60a5fa',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
      clusterBkg: '#1e293b',
      clusterBorder: '#475569',
      defaultLinkColor: '#93c5fd',
      titleColor: '#f8fafc',
      edgeLabelBackground: '#1e293b',
      actorBorder: '#3b82f6',
      actorBkg: '#1e3a8a',
      actorTextColor: '#ffffff',
      actorLineColor: '#60a5fa',
      signalColor: '#60a5fa',
      signalTextColor: '#f8fafc',
      labelBoxBkgColor: '#1e293b',
      labelBoxBorderColor: '#3b82f6',
      labelTextColor: '#f8fafc',
      loopTextColor: '#f8fafc',
      noteBorderColor: '#3b82f6',
      noteBkgColor: '#1e293b',
      noteTextColor: '#f8fafc',
    },
  });
  mermaidInitialized = true;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
  const uniqueId = useId().replace(/:/g, '_');
  const containerId = `mermaid_diag_${uniqueId}`;

  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [diagramType, setDiagramType] = useState<string>('Diagramme');

  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const fullscreenSvgRef = useRef<HTMLDivElement>(null);

  // Detect diagram type from code
  useEffect(() => {
    const trimmed = code.trim().toLowerCase();
    if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) {
      setDiagramType('Flux / Flowchart');
    } else if (trimmed.startsWith('sequencediagram')) {
      setDiagramType('Diagramme de Séquence');
    } else if (trimmed.startsWith('mindmap')) {
      setDiagramType('Carte Mentale (Mindmap)');
    } else if (trimmed.startsWith('erdiagram')) {
      setDiagramType('Base de données (ERD)');
    } else if (trimmed.startsWith('classdiagram')) {
      setDiagramType('Diagramme de Classes');
    } else if (trimmed.startsWith('statediagram')) {
      setDiagramType('Machine à États');
    } else if (trimmed.startsWith('gantt')) {
      setDiagramType('Diagramme de Gantt');
    } else if (trimmed.startsWith('pie')) {
      setDiagramType('Graphique Circulaire (Pie)');
    } else if (trimmed.startsWith('gitgraph')) {
      setDiagramType('Git Graph (Branches)');
    } else if (trimmed.startsWith('journey')) {
      setDiagramType('Parcours Utilisateur');
    } else {
      setDiagramType('Diagramme Mermaid');
    }
  }, [code]);

  // Clean code and render SVG
  useEffect(() => {
    let isCancelled = false;
    initMermaidOnce();

    const renderDiagram = async () => {
      const cleanCode = code
        .replace(/^```(mermaid)?/im, '')
        .replace(/```$/m, '')
        .trim();

      if (!cleanCode) {
        setSvgContent('');
        setRenderError(null);
        return;
      }

      try {
        const renderId = `m_${uniqueId}_${Date.now()}`;
        const { svg } = await mermaid.render(renderId, cleanCode);
        if (!isCancelled) {
          setSvgContent(svg);
          setRenderError(null);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setRenderError(msg);
          // If visual fails during streaming or syntax error, keep tab on visual or show code
        }
      }
    };

    const timer = setTimeout(renderDiagram, 80);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [code, uniqueId]);

  // Handle Copy Mermaid Source
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  // Handle Copy SVG XML
  const handleCopySvg = async () => {
    if (!svgContent) return;
    try {
      await navigator.clipboard.writeText(svgContent);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch {
      // fallback
    }
  };

  // Download SVG file
  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagramme-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download PNG file (rasterized via high-res canvas)
  const handleDownloadPng = () => {
    if (!svgContent) return;
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const URLObject = window.URL || window.webkitURL || window;
    const blobURL = URLObject.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const scale = 2; // High DPI resolution
      const canvas = document.createElement('canvas');
      canvas.width = (image.width || 800) * scale;
      canvas.height = (image.height || 600) * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark background for PNG export
      ctx.fillStyle = '#181818';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const pngURL = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngURL;
      downloadLink.download = `diagramme-${Date.now()}.png`;
      downloadLink.click();
      URLObject.revokeObjectURL(blobURL);
    };

    image.src = blobURL;
  };

  return (
    <div className="my-4 rounded-2xl overflow-hidden border border-[#2f2f2f] bg-[#141414] shadow-xl text-[#ececec]">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2.5 bg-[#1e1e1e] border-b border-[#2f2f2f] gap-2">
        {/* Left: Diagram Type Badge & Tabs */}
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-900/60 text-blue-300 border border-blue-700/50">
            📊 {diagramType}
          </span>

          <div className="flex items-center bg-[#292929] rounded-lg p-0.5 border border-[#383838]">
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'visual'
                  ? 'bg-[#3b82f6] text-white shadow-xs'
                  : 'text-[#b4b4b4] hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visuel</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'code'
                  ? 'bg-[#3b82f6] text-white shadow-xs'
                  : 'text-[#b4b4b4] hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code Source</span>
            </button>
          </div>
        </div>

        {/* Right: Actions (Zoom, Download, Copy, Fullscreen) */}
        <div className="flex items-center space-x-1 text-[#b4b4b4]">
          {activeTab === 'visual' && !renderError && (
            <>
              {/* Zoom controls */}
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.15))}
                title="Dézoomer"
                className="p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-white transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                title="Réinitialiser le zoom"
                className="p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-white transition-colors text-xs font-mono"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.15))}
                title="Zoomer"
                className="p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-white transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-[#383838] mx-1" />

              {/* Download PNG */}
              <button
                onClick={handleDownloadPng}
                title="Télécharger en image PNG"
                className="p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-white transition-colors flex items-center space-x-1 text-xs"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">PNG</span>
              </button>

              {/* Download SVG */}
              <button
                onClick={handleDownloadSvg}
                title="Télécharger le fichier SVG vectoriel"
                className="p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-white transition-colors flex items-center space-x-1 text-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">SVG</span>
              </button>

              {/* Fullscreen */}
              <button
                onClick={() => setIsFullscreen(true)}
                title="Afficher en plein écran"
                className="p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-white transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-[#383838] mx-1" />
            </>
          )}

          {/* Copy Code */}
          <button
            onClick={handleCopyCode}
            title="Copier la syntaxe Mermaid"
            className="flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-[#2f2f2f] hover:text-white transition-colors text-xs"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copié</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copier</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative min-h-[220px] bg-[#121212] overflow-hidden">
        {activeTab === 'visual' ? (
          renderError ? (
            <div className="p-4 space-y-3">
              <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-semibold text-white">Syntaxe en cours de frappe ou incomplète</p>
                  <p className="mt-0.5 text-amber-200/80">
                    Le diagramme sera automatiquement rendu dès que la syntaxe sera stabilisée.
                  </p>
                </div>
              </div>
              {/* Fallback to source code view */}
              <div className="p-3 rounded-xl bg-[#0a0a0a] border border-[#262626] font-mono text-xs overflow-x-auto text-[#d4d4d4]">
                <pre>{code}</pre>
              </div>
            </div>
          ) : svgContent ? (
            <div
              ref={svgWrapperRef}
              className="p-4 overflow-auto flex items-center justify-center transition-transform duration-200 select-none max-h-[500px]"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[#888888] space-y-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Génération du rendu vectoriel...</p>
            </div>
          )
        ) : (
          /* Code tab */
          <div className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed text-[#f3f4f6] bg-[#0c0c0c]">
            <pre className="m-0">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Bottom Footer Details */}
      <div className="px-3.5 py-1.5 bg-[#181818] border-t border-[#262626] flex items-center justify-between text-[11px] text-[#888888]">
        <span className="flex items-center space-x-1">
          <FileCode className="w-3 h-3 text-blue-400" />
          <span>Rendu natif Mermaid v10+ (Graph, Sequence, ERD, Markmap)</span>
        </span>
        {activeTab === 'visual' && !renderError && (
          <span className="font-mono text-[#a0a0a0]">{Math.round(zoomLevel * 100)}%</span>
        )}
      </div>

      {/* Fullscreen Dialog Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#121212]/95 backdrop-blur-md p-4 animate-in fade-in duration-150">
          {/* Fullscreen header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#2f2f2f]">
            <div className="flex items-center space-x-3">
              <span className="text-base font-semibold text-white flex items-center space-x-2">
                <span>📊 {diagramType}</span>
                <span className="text-xs font-normal text-[#888888]">(Mode Plein Écran)</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.2))}
                className="p-2 rounded-lg bg-[#242424] hover:bg-[#333333] text-white"
                title="Dézoomer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="px-2.5 py-1.5 rounded-lg bg-[#242424] hover:bg-[#333333] text-white text-xs font-mono"
                title="Réinitialiser le zoom"
              >
                100%
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                className="p-2 rounded-lg bg-[#242424] hover:bg-[#333333] text-white"
                title="Zoomer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={handleDownloadPng}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Exporter PNG</span>
              </button>

              <button
                onClick={handleDownloadSvg}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#333333] text-white text-xs font-medium"
              >
                <Download className="w-4 h-4" />
                <span>SVG</span>
              </button>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white ml-2"
                title="Fermer le plein écran"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fullscreen SVG container */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-6">
            <div
              ref={fullscreenSvgRef}
              className="transition-transform duration-150 select-none max-w-full"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
