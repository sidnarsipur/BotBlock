'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Shield, 
  Bot, 
  Check, 
  Search, 
  Upload, 
  Film, 
  X,
  File,
  List,
  Plus,
  Menu,
  ChevronRight,
  Code,
  History
} from 'lucide-react';
import { INITIAL_CRAWLER_CSV, FILE_TYPES } from '../data';
import { parseCSV } from '../utils';
import CrawlerIcon from '../components/CrawlerIcon';
import PreviewCard from '../components/PreviewCard';
import PathRulesTree from '../components/PathRulesTree';

export default function App() {
  // --- State ---
  const [crawlers, setCrawlers] = useState([]);
  const [sitemapXml, setSitemapXml] = useState('');
  const [paths, setPaths] = useState([]);
  const [fileGroups, setFileGroups] = useState(FILE_TYPES);
  
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasSavedPrefs, setHasSavedPrefs] = useState(false);

  // Add Forms State
  const [showAddCrawler, setShowAddCrawler] = useState(false);
  const [newCrawler, setNewCrawler] = useState({ company: '', ua: '', type: 'other' });
  const [showAddFile, setShowAddFile] = useState(false);
  const [newFile, setNewFile] = useState({ ext: '', category: 'Custom' });

  const fileInputRef = useRef(null);

  // --- Initialization ---
  useEffect(() => {
    const parsed = parseCSV(INITIAL_CRAWLER_CSV);
    setCrawlers(parsed);
    
    // Initialize with empty set (Allow All by default)
    setBlockedCrawlers(new Set());
  }, []);

  // Check for saved prefs
  useEffect(() => {
    const saved = localStorage.getItem('botblock_prefs');
    if (saved) setHasSavedPrefs(true);
  }, []);

  // --- Preferences ---
  const savePreferences = () => {
    const prefs = {
      extensionRules,
      blockedCrawlers: Array.from(blockedCrawlers),
      // Strip icons before saving to avoid React object serialization issues
      fileGroups: fileGroups.map(g => ({
        category: g.category,
        extensions: g.extensions
      }))
    };
    localStorage.setItem('botblock_prefs', JSON.stringify(prefs));
    setHasSavedPrefs(true);
  };

  const loadPreferences = (type) => {
    const saved = localStorage.getItem('botblock_prefs');
    if (!saved) return;
    
    try {
      const prefs = JSON.parse(saved);
      
      if (type === 'media' || type === 'all') {
          if (prefs.extensionRules) setExtensionRules(prefs.extensionRules);
          if (prefs.fileGroups) {
            // Rehydrate icons
            const rehydratedGroups = prefs.fileGroups.map(g => {
                // Try to find matching default group
                const defaultGroup = FILE_TYPES.find(d => d.category === g.category);
                return {
                    ...g,
                    icon: defaultGroup ? defaultGroup.icon : <File className="w-5 h-5 text-slate-500" />
                };
            });
            setFileGroups(rehydratedGroups);
          }
      }
      
      if (type === 'crawlers' || type === 'all') {
          if (prefs.blockedCrawlers) setBlockedCrawlers(new Set(prefs.blockedCrawlers));
      }
    } catch (e) {
      console.error("Failed to load preferences", e);
    }
  };

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

  const handleAddCrawler = () => {
    if (!newCrawler.ua) return;
    const crawler = {
      company: newCrawler.company || 'Custom',
      'user-agent': newCrawler.ua,
      type: newCrawler.type,
      notes: 'Custom added'
    };
    setCrawlers(prev => [crawler, ...prev]);
    setNewCrawler({ company: '', ua: '', type: 'other' });
    setShowAddCrawler(false);
  };

  const handleAddFileType = () => {
    if (!newFile.ext) return;
    let ext = newFile.ext.trim();
    if (!ext.startsWith('.')) ext = '.' + ext;

    setFileGroups(prev => {
      const newGroups = [...prev];
      const groupIndex = newGroups.findIndex(g => g.category === newFile.category);
      
      if (groupIndex >= 0) {
        // Add to existing group if not exists
        if (!newGroups[groupIndex].extensions.includes(ext)) {
             const updatedExtensions = [...newGroups[groupIndex].extensions, ext];
             newGroups[groupIndex] = { ...newGroups[groupIndex], extensions: updatedExtensions };
        }
      } else {
        // Create new group
        newGroups.push({
          category: newFile.category,
          icon: <File className="w-5 h-5 text-slate-500" />,
          extensions: [ext]
        });
      }
      return newGroups;
    });
    setNewFile({ ext: '', category: 'Custom' });
    setShowAddFile(false);
  };

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

  const togglePath = (path, forceState) => {
    setPathRules(prev => {
      const current = prev[path];
      let next;
      
      if (forceState !== undefined) {
          // If clicking the same state again, clear it (toggle off)
          if (current === forceState) next = undefined;
          else next = forceState;
      } else {
          // Legacy toggle cycle
          next = current === 'block' ? 'allow' : (current === 'allow' ? undefined : 'block');
      }
      
      const newRules = { ...prev };
      if (next) newRules[path] = next;
      else delete newRules[path];
      
      return newRules;
    });
  };

  // Handler for Bulk Actions on Paths
  const handleBulkPathAction = (action) => {
    if (filteredPaths.length === 0) return;

    // If acting on ALL paths (no filter or filter matches all), use wildcard
    if (filteredPaths.length === paths.length) {
        if (action === 'reset') {
            setPathRules({});
        } else {
            // Set root rule only
            setPathRules({ '/': action });
        }
        return;
    }

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

  const handleBulkExtensionAction = (extensions, action) => {
    setExtensionRules(prev => {
      const newRules = { ...prev };
      extensions.forEach(ext => {
        if (action === 'reset') {
          delete newRules[ext];
        } else {
          newRules[ext] = action;
        }
      });
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

  const allowSEOBots = () => {
    const newBlocked = new Set(blockedCrawlers);
    crawlers.filter(c => c.type === 'seo').forEach(bot => {
        newBlocked.delete(bot['user-agent']);
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
      
      // Filter out redundant rules (e.g. if / is blocked, /blog doesn't need explicit block)
      const effectiveRules = activePaths.reduce((acc, path) => {
          const rule = pathRules[path];
          
          // Find closest parent with a rule
          // Note: We use string startsWith because robots.txt uses prefix matching
          const parents = activePaths.filter(p => p !== path && path.startsWith(p));
          
          // Sort by length desc to get closest parent (longest string)
          parents.sort((a, b) => b.length - a.length);
          const closestParent = parents[0];
          
          if (closestParent) {
              // If closest parent has same rule, this is redundant
              if (pathRules[closestParent] === rule) {
                  return acc;
              }
          }
          
          acc.push({ path, rule });
          return acc;
      }, []);

      // Sort rules: Allows first, then Disallows (standard practice for specificity)
      // Also sort by length descending within groups to ensure specific rules aren't shadowed if parser is dumb
      const sortedRules = effectiveRules.sort((a, b) => {
          if (a.rule === 'allow' && b.rule === 'block') return -1;
          if (a.rule === 'block' && b.rule === 'allow') return 1;
          return b.path.length - a.path.length; 
      });

      sortedRules.forEach(({ path, rule }) => {
        let formattedPath = path;
        // Add trailing slash if missing and doesn't look like a file
        if (!formattedPath.endsWith('/') && !formattedPath.split('/').pop().includes('.')) {
            formattedPath += '/';
        }

        if (rule === 'allow') content += `Allow: ${formattedPath}\n`;
        if (rule === 'block') content += `Disallow: ${formattedPath}\n`;
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
    savePreferences();
    const text = generateRobotsTxt();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    savePreferences();
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
      bg: 'bg-red-900/20 hover:bg-red-900/30', 
      border: 'border-red-900/30', 
      text: 'text-red-400', 
      iconBg: 'bg-red-500 border-red-500', 
      icon: <X className="w-3 h-3 text-white" /> 
    };
    if (status === 'allow') return { 
      bg: 'bg-emerald-900/20 hover:bg-emerald-900/30', 
      border: 'border-emerald-900/30', 
      text: 'text-emerald-400', 
      iconBg: 'bg-emerald-500 border-emerald-500', 
      icon: <Check className="w-3 h-3 text-white" /> 
    };
    return { 
      bg: 'bg-terminal-header hover:bg-terminal-hover', 
      border: 'border-terminal-border', 
      text: 'text-slate-400', 
      iconBg: 'bg-terminal-main border-terminal-border', 
      icon: null 
    };
  };

    const NavItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        activeTab === id 
          ? 'bg-brand-600/10 text-brand-400 border border-brand-600/20' 
          : 'text-slate-400 hover:bg-terminal-hover hover:text-slate-200 border border-transparent'
      }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
      <span>{label}</span>
      {activeTab === id && <ChevronRight className="w-4 h-4 ml-auto text-brand-400" />}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-mono bg-terminal-main text-slate-300">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-terminal-header border-b border-terminal-border p-4 flex justify-between items-center sticky top-0 z-50">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => setActiveTab('upload')}
        >
          <div className="bg-brand-600 p-1.5 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white">BotBlock</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-terminal-header border-r border-terminal-border transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div 
          className="p-6 border-b border-terminal-border hidden md:flex items-center space-x-3 cursor-pointer hover:bg-terminal-hover transition-colors"
          onClick={() => setActiveTab('upload')}
        >
          <div className="bg-brand-600 p-2 rounded-lg shadow-lg shadow-brand-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">BotBlock</h1>
            <p className="text-xs text-slate-400 font-medium">Robots.txt Generator</p>
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Configure</div>
          <NavItem id="upload" icon={Upload} label="Import Sitemap" />
          <NavItem id="paths" icon={List} label="Path Rules" />
          <NavItem id="media" icon={Film} label="Media & Files" />
          <NavItem id="crawlers" icon={Bot} label="Crawler Access" />
          
          <div className="mt-8 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Finish</div>
          <NavItem id="preview" icon={Code} label="Review & Export" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-terminal-footer border-t border-terminal-border">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cleo Version</span>
            <span className="font-mono bg-terminal-main px-2 py-0.5 rounded text-slate-400 border border-terminal-border">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen bg-terminal-main">


        <div className="max-w-5xl mx-auto p-6 md:p-12">
          
          {/* Header Section */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white font-mono">
                <span className="text-brand-500 mr-2">$</span>
                {activeTab === 'upload' && 'Import Your Sitemap'}
                {activeTab === 'paths' && 'Manage Path Access'}
                {activeTab === 'media' && 'File Type Control'}
                {activeTab === 'crawlers' && 'Bot & Crawler Settings'}
                {activeTab === 'preview' && 'Review Configuration'}
              </h2>
              <p className="text-slate-400 mt-1 font-mono text-sm">
                {activeTab === 'upload' && '// Start by importing your sitemap to automatically detect paths.'}
                {activeTab === 'paths' && '// Control which sections of your site are accessible to bots.'}
                {activeTab === 'media' && '// Block or allow specific file extensions globally.'}
                {activeTab === 'crawlers' && '// Fine-tune access for specific search engines and AI scrapers.'}
                {activeTab === 'preview' && '// Verify your robots.txt file and export it.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Center Column: Tools */}
            {activeTab !== 'preview' && (
                <div className="lg:col-span-7 space-y-6">
                
                {/* Tab Content: Upload */}
                {activeTab === 'upload' && (
                    <div className="bg-terminal-header rounded-lg border border-terminal-border overflow-hidden animate-fadeIn">
                    <div className="p-8 space-y-8">
                        {/* Upload Area */}
                        <div 
                        className="border-2 border-dashed border-terminal-border rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-terminal-hover hover:border-brand-500/50 transition-all cursor-pointer group" 
                        onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="bg-terminal-main p-4 rounded-full mb-4 group-hover:scale-110 transition-all duration-300 border border-terminal-border">
                                <Upload className="w-8 h-8 text-brand-400" />
                            </div>
                            <span className="text-base font-semibold text-white font-mono">Upload sitemap.xml</span>
                            <span className="text-sm text-slate-500 mt-1 font-mono">or drag and drop your file here</span>
                            <input 
                            type="file" 
                            accept=".xml" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileUpload}
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-terminal-border"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-terminal-header text-slate-500 font-mono">OR</span>
                            </div>
                        </div>

                        {/* Manual Text Area */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-medium text-slate-300 font-mono">Paste XML Content</label>
                                <button 
                                    onClick={() => parseSitemap(sitemapXml)}
                                    className="text-xs bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-500 transition-all font-mono"
                                >
                                    Process XML
                                </button>
                            </div>
                        
                            <textarea 
                                value={sitemapXml}
                                onChange={(e) => setSitemapXml(e.target.value)}
                                placeholder="<urlset>&#10;  <url>&#10;    <loc>https://example.com/page</loc>&#10;  </url>&#10;</urlset>"
                                className="w-full h-48 border border-terminal-border rounded-lg p-4 text-sm font-mono focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y bg-terminal-main text-slate-300 placeholder-slate-600"
                            />
                        </div>
                    </div>
                    </div>
                )}

                {/* Tab Content: Paths */}
                {activeTab === 'paths' && (
                    <div className="bg-terminal-header rounded-lg border border-terminal-border overflow-hidden animate-fadeIn flex flex-col h-[600px]">
                    <div className="p-6 border-b border-terminal-border bg-terminal-header sticky top-0 z-10">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-0.5 rounded bg-terminal-main text-slate-400 border border-terminal-border text-xs font-mono font-bold">{paths.length} Paths</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleBulkPathAction('block')}
                                    className="px-3 py-1.5 bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-900/30 rounded text-xs font-mono font-medium transition-colors"
                                >
                                    Block All
                                </button>
                                <button 
                                    onClick={() => handleBulkPathAction('allow')}
                                    className="px-3 py-1.5 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/30 border border-emerald-900/30 rounded text-xs font-mono font-medium transition-colors"
                                >
                                    Allow All
                                </button>
                                <button 
                                    onClick={() => handleBulkPathAction('reset')}
                                    className="px-3 py-1.5 bg-terminal-main text-slate-400 hover:bg-terminal-hover border border-terminal-border rounded text-xs font-mono font-medium transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                        
                        <div className="relative group">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Filter paths..." 
                                className="w-full pl-10 pr-4 py-2.5 border border-terminal-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all bg-terminal-main text-slate-300 placeholder-slate-600 font-mono"
                                value={pathSearchTerm}
                                onChange={(e) => setPathSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-terminal-main">
                        {paths.length > 0 ? (
                            <PathRulesTree 
                                paths={filteredPaths} 
                                rules={pathRules} 
                                onToggleRule={togglePath} 
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <div className="bg-terminal-header p-4 rounded-full mb-3 border border-terminal-border border-dashed">
                                    <List className="w-8 h-8 text-slate-600" />
                                </div>
                                <p className="font-mono">No paths detected yet.</p>
                                <button onClick={() => setActiveTab('upload')} className="text-brand-400 text-sm font-medium hover:underline mt-2 font-mono">Import Sitemap</button>
                            </div>
                        )}
                    </div>
                    </div>
                )}

                {/* Tab Content: Media & Files */}
                {activeTab === 'media' && (
                    <div className="bg-terminal-header rounded-lg border border-terminal-border overflow-hidden animate-fadeIn">
                    <div className="p-6 border-b border-terminal-border flex justify-between items-center">
                        <h3 className="font-semibold text-white font-mono">File Extensions</h3>
                        <div className="flex gap-2">
                            {hasSavedPrefs && (
                                <button 
                                    onClick={() => loadPreferences('media')}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-terminal-main text-slate-400 rounded border border-terminal-border hover:bg-terminal-hover hover:text-white transition-colors text-sm font-medium font-mono"
                                    title="Restore previously saved file rules"
                                >
                                    <History className="w-4 h-4" />
                                    <span>Re-use Rules</span>
                                </button>
                            )}
                            <button 
                                onClick={() => setShowAddFile(!showAddFile)}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-brand-900/20 text-brand-400 rounded border border-brand-900/30 hover:bg-brand-900/30 transition-colors text-sm font-medium font-mono"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add File Type</span>
                            </button>
                        </div>
                    </div>
                    
                    {showAddFile && (
                        <div className="p-4 bg-terminal-main border-b border-terminal-border flex gap-3 items-end animate-fadeIn">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-brand-400 uppercase mb-1 block font-mono">Extension</label>
                                <input 
                                    type="text" 
                                    placeholder=".xyz" 
                                    className="w-full px-3 py-2 rounded border border-terminal-border text-sm focus:ring-1 focus:ring-brand-500 outline-none bg-terminal-header text-slate-300 placeholder-slate-600 font-mono"
                                    value={newFile.ext}
                                    onChange={(e) => setNewFile({...newFile, ext: e.target.value})}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-brand-400 uppercase mb-1 block font-mono">Category</label>
                                <select 
                                    className="w-full px-3 py-2 rounded border border-terminal-border text-sm focus:ring-1 focus:ring-brand-500 outline-none bg-terminal-header text-slate-300 font-mono"
                                    value={newFile.category}
                                    onChange={(e) => setNewFile({...newFile, category: e.target.value})}
                                >
                                    {fileGroups.map(g => <option key={g.category} value={g.category}>{g.category}</option>)}
                                    <option value="Custom">Custom</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleAddFileType}
                                className="px-4 py-2 bg-brand-600 text-white rounded text-sm font-bold hover:bg-brand-500 transition-colors font-mono"
                            >
                                Add
                            </button>
                        </div>
                    )}

                    <div className="p-6 space-y-8 bg-terminal-main">
                        {fileGroups.map((group, idx) => (
                        <div key={idx}>
                            <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-terminal-header rounded border border-terminal-border text-slate-400">
                                {group.icon}
                            </div>
                            <h3 className="font-medium text-white font-mono">{group.category}</h3>
                            <div className="ml-auto flex gap-2">
                                <button 
                                    onClick={() => handleBulkExtensionAction(group.extensions, 'block')}
                                    className="px-2 py-1 bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-900/30 rounded text-[10px] font-mono font-medium transition-colors"
                                >
                                    Block All
                                </button>
                                <button 
                                    onClick={() => handleBulkExtensionAction(group.extensions, 'allow')}
                                    className="px-2 py-1 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/30 border border-emerald-900/30 rounded text-[10px] font-mono font-medium transition-colors"
                                >
                                    Allow All
                                </button>
                                <button 
                                    onClick={() => handleBulkExtensionAction(group.extensions, 'reset')}
                                    className="px-2 py-1 bg-terminal-main text-slate-400 hover:bg-terminal-hover border border-terminal-border rounded text-[10px] font-mono font-medium transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
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
                                    flex items-center justify-between px-3 py-2.5 rounded text-sm font-mono transition-all border
                                    ${styles.bg} ${styles.border} ${styles.text}
                                    hover:shadow-md hover:-translate-y-0.5
                                    `}
                                >
                                    <span>{ext}</span>
                                    {styles.icon ? styles.icon : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                                </button>
                                )
                            })}
                            </div>
                        </div>
                        ))}
                    </div>
                    </div>
                )}

                {/* Tab Content: Crawlers */}
                {activeTab === 'crawlers' && (
                    <div className="bg-terminal-header rounded-lg border border-terminal-border overflow-hidden animate-fadeIn">
                    <div className="p-6 border-b border-terminal-border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Search bots..." 
                                className="w-full pl-10 pr-4 py-2 border border-terminal-border rounded-lg text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all bg-terminal-main text-slate-300 placeholder-slate-600 font-mono"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            </div>
                            <select 
                                className="px-3 py-2 border border-terminal-border rounded-lg text-sm outline-none bg-terminal-main text-slate-300 focus:border-brand-500 font-mono"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">All</option>
                                <option value="seo">SEO</option>
                                <option value="training">Model Training</option>
                                <option value="ai-search">AI Search</option>
                            </select>
                        </div>
                        
                        <button 
                            onClick={() => setShowAddCrawler(!showAddCrawler)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-brand-900/20 text-brand-400 rounded border border-brand-900/30 hover:bg-brand-900/30 transition-colors text-sm font-medium font-mono"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Bot</span>
                        </button>
                    </div>

                    {showAddCrawler && (
                        <div className="p-4 bg-terminal-main border-b border-terminal-border flex flex-col md:flex-row gap-3 items-end animate-fadeIn">
                            <div className="flex-1 w-full">
                                <label className="text-xs font-bold text-brand-400 uppercase mb-1 block font-mono">User Agent</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. MyCustomBot" 
                                    className="w-full px-3 py-2 rounded border border-terminal-border text-sm focus:ring-1 focus:ring-brand-500 outline-none bg-terminal-header text-slate-300 placeholder-slate-600 font-mono"
                                    value={newCrawler.ua}
                                    onChange={(e) => setNewCrawler({...newCrawler, ua: e.target.value})}
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="text-xs font-bold text-brand-400 uppercase mb-1 block font-mono">Company</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Acme Corp" 
                                    className="w-full px-3 py-2 rounded border border-terminal-border text-sm focus:ring-1 focus:ring-brand-500 outline-none bg-terminal-header text-slate-300 placeholder-slate-600 font-mono"
                                    value={newCrawler.company}
                                    onChange={(e) => setNewCrawler({...newCrawler, company: e.target.value})}
                                />
                            </div>
                            <div className="w-full md:w-32">
                                <label className="text-xs font-bold text-brand-400 uppercase mb-1 block font-mono">Type</label>
                                <select 
                                    className="w-full px-3 py-2 rounded border border-terminal-border text-sm focus:ring-1 focus:ring-brand-500 outline-none bg-terminal-header text-slate-300 font-mono"
                                    value={newCrawler.type}
                                    onChange={(e) => setNewCrawler({...newCrawler, type: e.target.value})}
                                >
                                    <option value="other">Other</option>
                                    <option value="seo">SEO</option>
                                    <option value="training">Model Training</option>
                                    <option value="ai-search">AI Search</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleAddCrawler}
                                className="w-full md:w-auto px-4 py-2 bg-brand-600 text-white rounded text-sm font-bold hover:bg-brand-500 transition-colors font-mono"
                            >
                                Add
                            </button>
                        </div>
                    )}

                    {/* Bulk Actions */}
                    <div className="px-6 py-3 bg-terminal-main border-b border-terminal-border flex gap-2 overflow-x-auto">
                            <button 
                                onClick={() => handleBulkCrawlerAction('block')}
                                className="px-3 py-1.5 bg-terminal-header border border-terminal-border text-slate-300 hover:border-red-900/50 hover:text-red-400 rounded text-xs font-medium transition-colors whitespace-nowrap font-mono"
                            >
                                Block All
                            </button>
                            <button 
                                onClick={() => handleBulkCrawlerAction('allow')}
                                className="px-3 py-1.5 bg-terminal-header border border-terminal-border text-slate-300 hover:border-emerald-900/50 hover:text-emerald-400 rounded text-xs font-medium transition-colors whitespace-nowrap font-mono"
                            >
                                Allow All
                            </button>
                            <button 
                                onClick={allowSEOBots}
                                className="px-3 py-1.5 bg-terminal-header border border-terminal-border text-slate-300 hover:border-blue-900/50 hover:text-blue-400 rounded text-xs font-medium transition-colors whitespace-nowrap font-mono"
                            >
                                Allow SEO
                            </button>
                            <div className="ml-auto flex gap-2">
                                {hasSavedPrefs && (
                                    <button 
                                        onClick={() => loadPreferences('crawlers')}
                                        className="px-3 py-1.5 bg-terminal-header text-slate-400 hover:bg-terminal-hover rounded text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 font-mono border border-terminal-border"
                                        title="Restore previously saved crawler rules"
                                    >
                                        <History className="w-3 h-3" />
                                        <span>Re-use</span>
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleBulkCrawlerAction('reset')}
                                    className="px-3 py-1.5 bg-terminal-header text-slate-400 hover:bg-terminal-hover rounded text-xs font-medium transition-colors font-mono border border-terminal-border"
                                >
                                    Clear
                                </button>
                            </div>
                    </div>

                    {/* Crawler List */}
                    <div className="divide-y divide-terminal-border max-h-[600px] overflow-y-auto bg-terminal-main">
                        {filteredCrawlers.map((bot, idx) => {
                            const isBlocked = blockedCrawlers.has(bot['user-agent']);
                            return (
                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-terminal-hover transition-colors group">
                                    <div className="flex items-start space-x-4">
                                        <div className={`mt-1 p-2.5 rounded transition-colors ${isBlocked ? 'bg-red-900/20 text-red-400' : 'bg-terminal-header text-slate-400 group-hover:bg-terminal-main'}`}>
                                            <CrawlerIcon type={bot.type} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-white font-mono">{bot.company}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono ${
                                                    bot.type === 'seo' ? 'bg-blue-900/20 text-blue-400' :
                                                    bot.type === 'training' ? 'bg-purple-900/20 text-purple-400' :
                                                    'bg-terminal-header text-slate-400'
                                                }`}>{bot.type || 'General'}</span>
                                            </div>
                                            <div className="text-xs font-mono text-slate-500 mt-1 bg-terminal-header inline-block px-1.5 py-0.5 rounded border border-terminal-border">
                                                {bot['user-agent']}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => toggleCrawler(bot['user-agent'])}
                                        className={`w-24 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all duration-200 font-mono ${
                                            isBlocked 
                                            ? 'bg-red-900/20 text-red-400 border border-red-900/30 hover:bg-red-900/30' 
                                            : 'bg-emerald-900/20 text-emerald-400 border border-emerald-900/30 hover:bg-emerald-900/30'
                                        }`}
                                    >
                                        {isBlocked ? 'Blocked' : 'Allowed'}
                                    </button>
                                </div>
                            );
                        })}
                        {filteredCrawlers.length === 0 && (
                            <div className="p-12 text-center text-slate-500 font-mono">
                                No crawlers found matching your search.
                            </div>
                        )}
                    </div>
                    </div>
                )}
                </div>
            )}

            {/* Right Column: Preview & Actions (Desktop Sticky) */}
            {activeTab !== 'preview' && (
                <div className="hidden lg:block lg:col-span-5">
                <div className="sticky top-6 space-y-6">
                    <PreviewCard 
                        blockedCrawlers={blockedCrawlers} 
                        pathRules={pathRules} 
                        extensionRules={extensionRules}
                        generateRobotsTxt={generateRobotsTxt}
                        copyToClipboard={copyToClipboard}
                        downloadFile={downloadFile}
                        copied={copied}
                    />

                    <div className="bg-terminal-header rounded-lg border border-terminal-border p-6">
                        <h3 className="font-semibold text-white mb-4 font-mono">Configuration Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-4 bg-red-900/10 rounded border border-red-900/20">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-red-900/20 rounded text-red-400">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm text-red-200 font-medium font-mono">Blocked Bots</span>
                                </div>
                                <span className="text-xl font-bold text-red-400 font-mono">{blockedCrawlers.size}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-terminal-main rounded border border-terminal-border">
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">Disallowed</div>
                                <div className="text-2xl font-bold text-slate-300 font-mono">
                                    {Object.values(pathRules).filter(v => v === 'block').length + 
                                    Object.values(extensionRules).filter(v => v === 'block').length}
                                </div>
                            </div>
                            <div className="p-4 bg-emerald-900/10 rounded border border-emerald-900/20">
                                <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1 font-mono">Allowed</div>
                                <div className="text-2xl font-bold text-emerald-400 font-mono">
                                    {Object.values(pathRules).filter(v => v === 'allow').length + 
                                    Object.values(extensionRules).filter(v => v === 'allow').length}
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            )}

            {/* Full Screen Preview Mode */}
            {activeTab === 'preview' && (
                <div className="col-span-1 lg:col-span-12 animate-fadeIn">
                    <div className="max-w-4xl mx-auto">
                        <PreviewCard 
                            blockedCrawlers={blockedCrawlers} 
                            pathRules={pathRules} 
                            extensionRules={extensionRules}
                            generateRobotsTxt={generateRobotsTxt}
                            copyToClipboard={copyToClipboard}
                            downloadFile={downloadFile}
                            copied={copied}
                        />
                        <div className="mt-6 text-center">
                            <p className="text-slate-500 text-sm">
                                Review your configuration above. When you're ready, download the file and place it in the root directory of your website.
                            </p>
                        </div>
                    </div>
                </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
