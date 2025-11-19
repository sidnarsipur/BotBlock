import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Shield, 
  Bot, 
  Check, 
  AlertTriangle, 
  Search, 
  Upload, 
  Film, 
  X,
  Settings,
  File,
  List,
  Trash2
} from 'lucide-react';
import { INITIAL_CRAWLER_CSV, FILE_TYPES } from './data';
import { parseCSV } from './utils';
import CrawlerIcon from './components/CrawlerIcon';
import PreviewCard from './components/PreviewCard';



export default function App() {
  // --- State ---
  const [crawlers, setCrawlers] = useState([]);
  const [sitemapXml, setSitemapXml] = useState('');
  const [paths, setPaths] = useState([]);
  
  // Rules storage: { key: 'block' | 'allow' }
  const [pathRules, setPathRules] = useState({}); 
  const [extensionRules, setExtensionRules] = useState({});
  const [blockedCrawlers, setBlockedCrawlers] = useState(new Set());
  
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'paths', 'media', 'crawlers', 'preview'
  const [searchTerm, setSearchTerm] = useState('');
  const [pathSearchTerm, setPathSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [copied, setCopied] = useState(false);
  const [userDomain, setUserDomain] = useState('https://example.com');

  const fileInputRef = useRef(null);

  // --- Initialization ---
  useEffect(() => {
    const parsed = parseCSV(INITIAL_CRAWLER_CSV);
    setCrawlers(parsed);
    
    // Auto-block training bots by default
    const trainingBots = parsed
      .filter(c => c.type === 'training')
      .map(c => c['user-agent']);
    setBlockedCrawlers(new Set(trainingBots));
  }, []);

  // --- Memoized Filters (Moved up for Handler Access) ---
  const filteredCrawlers = useMemo(() => {
    return crawlers.filter(c => {
      const company = c.company ? c.company.toLowerCase() : '';
      const ua = c['user-agent'] ? c['user-agent'].toLowerCase() : '';
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = company.includes(searchLower) || ua.includes(searchLower);
      const matchesType = filterType === 'all' || c.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [crawlers, searchTerm, filterType]);

  const filteredPaths = useMemo(() => {
    return paths.filter(p => p.toLowerCase().includes(pathSearchTerm.toLowerCase()));
  }, [paths, pathSearchTerm]);

  // --- Handlers ---

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setSitemapXml(content);
        parseSitemap(content);
      };
      reader.readAsText(file);
    }
  };

  const parseSitemap = (xmlString) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const locs = xmlDoc.getElementsByTagName("loc");
      const extractedPaths = [];
      
      for (let i = 0; i < locs.length; i++) {
        try {
          const fullUrl = locs[i].textContent;
          const urlObj = new URL(fullUrl);
          // Keep only the path
          if (urlObj.pathname !== '/' && urlObj.pathname !== '') {
             extractedPaths.push(urlObj.pathname);
          }
          // Try to guess domain from first URL
          if (i === 0) {
            setUserDomain(urlObj.origin);
          }
        } catch (e) {
          console.warn("Invalid URL in sitemap", locs[i].textContent);
        }
      }
      // Dedupe
      const uniquePaths = [...new Set(extractedPaths)];
      setPaths(uniquePaths);
      
      if (uniquePaths.length > 0) {
        // Auto-switch to paths tab on success
        setActiveTab('paths');
      }
    } catch (err) {
      alert("Failed to parse XML. Please ensure it is a valid Sitemap XML.");
    }
  };

  const togglePath = (path) => {
    setPathRules(prev => {
      const current = prev[path];
      // Cycle: Neutral -> Block -> Allow -> Neutral
      const next = current === 'block' ? 'allow' : (current === 'allow' ? undefined : 'block');
      
      const newRules = { ...prev };
      if (next) newRules[path] = next;
      else delete newRules[path];
      
      return newRules;
    });
  };

  // Handler for Bulk Actions on Paths
  const handleBulkPathAction = (action) => {
    if (filteredPaths.length === 0) return;

    setPathRules(prev => {
      const newRules = { ...prev };
      filteredPaths.forEach(path => {
        if (action === 'reset') {
          delete newRules[path];
        } else {
          newRules[path] = action;
        }
      });
      return newRules;
    });
  };

  const toggleExtension = (ext) => {
    setExtensionRules(prev => {
      const current = prev[ext];
      // Cycle: Neutral -> Block -> Allow -> Neutral
      const next = current === 'block' ? 'allow' : (current === 'allow' ? undefined : 'block');

      const newRules = { ...prev };
      if (next) newRules[ext] = next;
      else delete newRules[ext];
      
      return newRules;
    });
  };

  const toggleCrawler = (ua) => {
    const newBlocked = new Set(blockedCrawlers);
    if (newBlocked.has(ua)) {
      newBlocked.delete(ua);
    } else {
      newBlocked.add(ua);
    }
    setBlockedCrawlers(newBlocked);
  };

  // Updated Handler for Bulk Actions on Crawlers (Respects Search/Filter)
  const handleBulkCrawlerAction = (action) => {
    const newBlocked = new Set(blockedCrawlers);
    
    if (action === 'reset') {
        // Clear all blocks
        setBlockedCrawlers(new Set());
        return;
    }

    filteredCrawlers.forEach(bot => {
        const ua = bot['user-agent'];
        if (action === 'block') {
            newBlocked.add(ua);
        } else if (action === 'allow') {
            newBlocked.delete(ua);
        }
    });
    
    setBlockedCrawlers(newBlocked);
  };

  // --- Generators ---

  const generateRobotsTxt = () => {
    let content = `# Generated by Botblock\n# Domain: ${userDomain}\n\n`;

    // 1. Specific Crawler Blocks
    if (blockedCrawlers.size > 0) {
      content += `# Blocked Bots (${blockedCrawlers.size})\n`;
      Array.from(blockedCrawlers).sort().forEach(ua => {
        content += `User-agent: ${ua}\nDisallow: /\n\n`;
      });
    }

    // 2. General Rules
    content += `# General Rules for all other bots\nUser-agent: *\n`;
    
    // 2a. Paths
    const activePaths = Object.keys(pathRules).sort();
    if (activePaths.length > 0) {
      content += `# Path Rules\n`;
      activePaths.forEach(path => {
        if (pathRules[path] === 'allow') content += `Allow: ${path}\n`;
      });
      activePaths.forEach(path => {
        if (pathRules[path] === 'block') content += `Disallow: ${path}\n`;
      });
      content += `\n`;
    }

    // 2b. File Extensions
    const activeExts = Object.keys(extensionRules).sort();
    if (activeExts.length > 0) {
      content += `# File Type Rules\n`;
      activeExts.forEach(ext => {
        if (extensionRules[ext] === 'allow') content += `Allow: /*${ext}$\n`;
      });
      activeExts.forEach(ext => {
        if (extensionRules[ext] === 'block') content += `Disallow: /*${ext}$\n`;
      });
      content += `\n`;
    }

    if (activePaths.length === 0 && activeExts.length === 0) {
      // Optional: default allowing state implied
    }
    
    // 3. Sitemap Reference (Using parsed domain or placeholder)
    if (userDomain) {
      content += `Sitemap: ${userDomain}/sitemap.xml`;
    }

    return content;
  };

  const copyToClipboard = () => {
    const text = generateRobotsTxt();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const text = generateRobotsTxt();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Rendering Helpers (Status Styles) ---

  const getStatusStyles = (status) => {
    if (status === 'block') return { 
      bg: 'bg-red-50 hover:bg-red-100', 
      border: 'border-red-200', 
      text: 'text-red-700', 
      iconBg: 'bg-red-500 border-red-500', 
      icon: <X className="w-3 h-3 text-white" /> 
    };
    if (status === 'allow') return { 
      bg: 'bg-green-50 hover:bg-green-100', 
      border: 'border-green-200', 
      text: 'text-green-700', 
      iconBg: 'bg-green-500 border-green-500', 
      icon: <Check className="w-3 h-3 text-white" /> 
    };
    return { 
      bg: 'bg-white hover:bg-slate-50', 
      border: 'border-slate-200', 
      text: 'text-slate-600', 
      iconBg: 'bg-white border-slate-300', 
      icon: null 
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <Shield className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold">BotBlock</h1>
              <p className="text-indigo-100 text-sm">Block unwanted crawlers, file types, and protect sensitive paths.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-indigo-700 px-4 py-2 rounded-lg border border-indigo-500">
            <span className="text-xs font-mono text-indigo-200">Database:</span>
            <span className="text-sm font-bold">{crawlers.length} Bots Loaded</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Configuration */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 min-w-[80px] flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'upload' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
            <button
              onClick={() => setActiveTab('paths')}
              className={`flex-1 min-w-[80px] flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'paths' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List className="w-4 h-4" />
              <span>Paths</span>
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 min-w-[80px] flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'media' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Film className="w-4 h-4" />
              <span>Media</span>
            </button>
            <button
              onClick={() => setActiveTab('crawlers')}
              className={`flex-1 min-w-[80px] flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'crawlers' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Bot className="w-4 h-4" />
              <span>Crawlers</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 min-w-[80px] flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'preview' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Settings className="w-4 h-4" />
              <span>Review</span>
            </button>
          </div>

          {/* Tab Content: Upload */}
          {activeTab === 'upload' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold flex items-center text-slate-800">
                  <Upload className="w-5 h-5 mr-2 text-indigo-500" />
                  Import Sitemap
                </h2>
                <p className="text-slate-500 text-sm mt-1">Upload your sitemap.xml file or paste the XML content directly.</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                    <div className="bg-indigo-50 p-3 rounded-full mb-3 group-hover:bg-indigo-100 transition-colors">
                        <Upload className="w-8 h-8 text-indigo-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Click to Upload sitemap.xml</span>
                    <span className="text-xs text-slate-500 mt-1">Supports standard XML format</span>
                    <input 
                      type="file" 
                      accept=".xml" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                </div>

                {/* Manual Text Area */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">Or Paste XML Content</label>
                         <button 
                            onClick={() => parseSitemap(sitemapXml)}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-shadow shadow-sm"
                         >
                            Process XML
                         </button>
                    </div>
                   
                    <textarea 
                        value={sitemapXml}
                        onChange={(e) => setSitemapXml(e.target.value)}
                        placeholder="<urlset>&#10;  <url>&#10;    <loc>https://example.com/page</loc>&#10;  </url>&#10;</urlset>"
                        className="w-full h-48 border border-slate-200 rounded-xl p-4 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-y shadow-inner"
                    />
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Paths */}
          {activeTab === 'paths' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn flex flex-col h-[600px]">
              <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center text-slate-800">
                        <List className="w-5 h-5 mr-2 text-indigo-500" />
                        Manage Detected Paths
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            Click items to cycle status: 
                            <span className="mx-2 font-medium text-red-600">Block</span> → 
                            <span className="mx-2 font-medium text-green-600">Allow</span> → 
                            <span className="mx-2 text-slate-400">Neutral</span>
                        </p>
                    </div>
                    <div className="text-right">
                         <div className="text-2xl font-bold text-indigo-600">{paths.length}</div>
                         <div className="text-xs text-slate-500 uppercase font-semibold">Total Paths</div>
                    </div>
                </div>
                
                {/* Path Filters & Actions */}
                <div className="mt-4 space-y-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Filter paths (e.g., /admin, /private)..." 
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            value={pathSearchTerm}
                            onChange={(e) => setPathSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleBulkPathAction('block')}
                            className="flex-1 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
                        >
                            Disallow {pathSearchTerm ? 'Visible' : 'All'}
                        </button>
                        <button 
                            onClick={() => handleBulkPathAction('allow')}
                            className="flex-1 py-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-100 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
                        >
                            Allow {pathSearchTerm ? 'Visible' : 'All'}
                        </button>
                        <button 
                            onClick={() => handleBulkPathAction('reset')}
                            className="px-4 py-2 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            title="Reset selection for visible paths"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                {paths.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {filteredPaths.map((path, idx) => {
                      const status = pathRules[path];
                      const styles = getStatusStyles(status);
                      return (
                        <div 
                            key={idx} 
                            onClick={() => togglePath(path)}
                            className={`
                                group p-3 rounded-lg border cursor-pointer transition-all duration-200 flex items-center justify-between
                                ${styles.bg} ${styles.border}
                                ${status ? 'shadow-sm transform scale-[1.01]' : 'hover:border-indigo-200'}
                            `}
                        >
                          <div className="flex items-center overflow-hidden">
                             <div className={`w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0 ${status === 'block' ? 'bg-red-500' : (status === 'allow' ? 'bg-green-500' : 'bg-slate-300')}`}></div>
                             <span className={`text-sm font-mono truncate ${styles.text} ${status ? 'font-semibold' : ''}`}>{path}</span>
                          </div>
                          
                          <div className="flex items-center">
                              {status ? (
                                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mr-3 ${status === 'block' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                      {status === 'block' ? 'Disallow' : 'Allow'}
                                  </div>
                              ) : (
                                  <div className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 mr-3 uppercase tracking-wide transition-opacity">
                                      Default
                                  </div>
                              )}
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${styles.iconBg}`}>
                                {styles.icon}
                              </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredPaths.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            No paths match your filter.
                        </div>
                    )}
                  </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                            <Upload className="w-8 h-8 text-slate-300" />
                        </div>
                        <p>No paths detected yet.</p>
                        <button onClick={() => setActiveTab('upload')} className="text-indigo-500 text-sm font-medium hover:underline mt-2">Go to Upload Tab</button>
                    </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Media & Files */}
          {activeTab === 'media' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold flex items-center text-slate-800">
                  <File className="w-5 h-5 mr-2 text-indigo-500" />
                  Media & File Types
                </h2>
                <p className="text-slate-500 text-sm mt-1">Click once to <strong className="text-red-600">Block</strong> (Disallow), twice to <strong className="text-green-600">Enable</strong> (Allow) for all bots.</p>
              </div>
              
              <div className="p-6 space-y-8">
                {FILE_TYPES.map((group, idx) => (
                  <div key={idx}>
                    <div className="flex items-center gap-2 mb-3">
                      {group.icon}
                      <h3 className="font-medium text-slate-700">{group.category}</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {group.extensions.map(ext => {
                        const status = extensionRules[ext];
                        const styles = getStatusStyles(status);
                        
                        return (
                          <button
                            key={ext}
                            onClick={() => toggleExtension(ext)}
                            className={`
                              flex items-center justify-between px-3 py-2 rounded-lg text-sm font-mono transition-all border
                              ${styles.bg} ${styles.border} ${styles.text}
                              hover:shadow-sm
                            `}
                          >
                            <span>{ext}</span>
                            {styles.icon ? styles.icon : <div className="w-3 h-3" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 flex items-start">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Blocking</strong> adds <code>Disallow: /*.ext$</code>.<br/>
                    <strong>Enabling</strong> adds <code>Allow: /*.ext$</code>.<br/>
                    This affects all bots unless specific user-agent rules override it.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Crawlers */}
          {activeTab === 'crawlers' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold flex items-center text-slate-800">
                  <Bot className="w-5 h-5 mr-2 text-indigo-500" />
                  Manage Crawler Access
                </h2>
                <p className="text-slate-500 text-sm mt-1">Select which bots to ban completely from your site.</p>
              </div>

              {/* Filters */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 sticky top-0 z-10 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search Google, OpenAI, Bing..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="seo">SEO (Good Bots)</option>
                        <option value="training">AI Training (Scrapers)</option>
                        <option value="research">Research</option>
                    </select>
                </div>
                
                {/* Bulk Actions for Crawlers */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleBulkCrawlerAction('block')}
                        className="flex-1 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
                    >
                        Block {searchTerm || filterType !== 'all' ? 'Visible' : 'All'}
                    </button>
                    <button 
                        onClick={() => handleBulkCrawlerAction('allow')}
                        className="flex-1 py-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-100 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
                    >
                        Allow {searchTerm || filterType !== 'all' ? 'Visible' : 'All'}
                    </button>
                     <button 
                        onClick={() => handleBulkCrawlerAction('reset')}
                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        title="Reset All Blocks"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>

              {/* Crawler List */}
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {filteredCrawlers.map((bot, idx) => {
                    const isBlocked = blockedCrawlers.has(bot['user-agent']);
                    return (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-start space-x-3">
                                <div className={`mt-1 p-2 rounded-lg ${isBlocked ? 'bg-red-100' : 'bg-indigo-50'}`}>
                                    <CrawlerIcon type={bot.type} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-800">{bot.company}</span>
                                        <span className="text-xs px-2 py-0.5 bg-slate-200 rounded-full text-slate-600 capitalize">{bot.type || 'General'}</span>
                                    </div>
                                    <div className="text-xs font-mono text-slate-500 mt-0.5">UA: {bot['user-agent']}</div>
                                    {bot.notes && <div className="text-[10px] text-slate-400 mt-1">{bot.notes}</div>}
                                </div>
                            </div>
                            <button 
                                onClick={() => toggleCrawler(bot['user-agent'])}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    isBlocked 
                                    ? 'bg-red-500 text-white shadow-md shadow-red-200' 
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-500'
                                }`}
                            >
                                {isBlocked ? 'Blocked' : 'Block'}
                            </button>
                        </div>
                    );
                })}
                {filteredCrawlers.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        No crawlers found matching your search.
                    </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Preview (Mobile only) */}
          {activeTab === 'preview' && (
             <div className="lg:hidden">
                <PreviewCard 
                    blockedCrawlers={blockedCrawlers} 
                    pathRules={pathRules} 
                    extensionRules={extensionRules}
                    generateRobotsTxt={generateRobotsTxt}
                    copyToClipboard={copyToClipboard}
                    downloadFile={downloadFile}
                    copied={copied}
                />
             </div>
          )}
        </div>

        {/* Right Column: Preview & Actions (Desktop Sticky) */}
        <div className="hidden lg:block lg:col-span-5 space-y-6">
            <PreviewCard 
                blockedCrawlers={blockedCrawlers} 
                pathRules={pathRules} 
                extensionRules={extensionRules}
                generateRobotsTxt={generateRobotsTxt}
                copyToClipboard={copyToClipboard}
                downloadFile={downloadFile}
                copied={copied}
            />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Quick Summary</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                        <span className="text-sm text-red-800 font-medium">Blocked Bots</span>
                        <span className="text-lg font-bold text-red-600">{blockedCrawlers.size}</span>
                    </div>
                    
                    {/* Combined Stats for Rules */}
                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                          <div className="text-xs text-red-800 font-medium uppercase">Disallowed</div>
                          <div className="text-lg font-bold text-red-600">
                            {Object.values(pathRules).filter(v => v === 'block').length + 
                             Object.values(extensionRules).filter(v => v === 'block').length}
                          </div>
                       </div>
                       <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="text-xs text-green-800 font-medium uppercase">Allowed</div>
                          <div className="text-lg font-bold text-green-600">
                             {Object.values(pathRules).filter(v => v === 'allow').length + 
                             Object.values(extensionRules).filter(v => v === 'allow').length}
                          </div>
                       </div>
                    </div>
                    
                    <div className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Disallowed items are forbidden to all generic bots. Allowed items are explicitly whitelisted.
                    </div>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}

