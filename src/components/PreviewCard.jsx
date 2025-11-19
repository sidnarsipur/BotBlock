import React from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Check,
  Terminal
} from 'lucide-react';

function PreviewCard({ blockedCrawlers, pathRules, extensionRules, generateRobotsTxt, copyToClipboard, downloadFile, copied }) {
    const hasRules = blockedCrawlers.size > 0 || Object.keys(pathRules).length > 0 || Object.keys(extensionRules).length > 0;

    return (
        <div className="bg-[#1e1e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-800">
            <div className="p-4 bg-[#252538] border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <div className="ml-3 text-slate-400 text-xs font-mono flex items-center">
                        <Terminal className="w-3 h-3 mr-1.5" />
                        robots.txt
                    </div>
                </div>
                <div className="flex space-x-2">
                     <button 
                        onClick={copyToClipboard}
                        className="p-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
                        title="Copy to Clipboard"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                        onClick={downloadFile}
                        className="p-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-white transition-all shadow-lg shadow-brand-900/20"
                        title="Download"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="p-5 bg-[#1e1e2e] overflow-auto max-h-[60vh] min-h-[300px] relative group">
                <pre className="font-mono text-xs md:text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                    {generateRobotsTxt()}
                </pre>
                {!hasRules && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-slate-700 text-sm font-mono"># No rules defined yet...</div>
                    </div>
                )}
            </div>
            <div className="px-4 py-2 bg-[#181825] text-[10px] text-slate-500 border-t border-slate-800 flex justify-between items-center font-mono">
                <span>UTF-8</span>
                <span>{hasRules ? "Modified" : "Default"}</span>
            </div>
        </div>
    )
}

export default PreviewCard;
