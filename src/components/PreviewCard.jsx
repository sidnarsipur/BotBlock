import React from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Check
} from 'lucide-react';

function PreviewCard({ blockedCrawlers, pathRules, extensionRules, generateRobotsTxt, copyToClipboard, downloadFile, copied }) {
    const hasRules = blockedCrawlers.size > 0 || Object.keys(pathRules).length > 0 || Object.keys(extensionRules).length > 0;

    return (
        <div className="bg-slate-900 rounded-xl shadow-xl overflow-hidden flex flex-col sticky top-6">
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-white font-medium flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-indigo-400" />
                    robots.txt Preview
                </h3>
                <div className="flex space-x-2">
                     <button 
                        onClick={copyToClipboard}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                        title="Copy to Clipboard"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                        onClick={downloadFile}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white transition-colors shadow-lg shadow-indigo-900/50"
                        title="Download"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="p-4 bg-[#0d1117] overflow-auto max-h-[60vh]">
                <pre className="font-mono text-xs md:text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                    {generateRobotsTxt()}
                </pre>
            </div>
            <div className="p-3 bg-slate-800 text-xs text-slate-400 border-t border-slate-700">
                {!hasRules
                    ? "⚠️ Default configuration: All bots allowed everywhere." 
                    : "✅ Configuration active"}
            </div>
        </div>
    )
}

export default PreviewCard;
