'use client';

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
  Trash2,
  Plus,
  Menu,
  ChevronRight,
  Code,
  Moon,
  Sun
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
  const [darkMode, setDarkMode] = useState(true);

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

  // Dark Mode Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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
          // Check if covered by a shorter parent rule of same type
          const isRedundant = activePaths.some(parent => {
              if (parent === path) return false;
              // Only redundant if parent covers it AND has the SAME rule
              if (path.startsWith(parent) && pathRules[parent] === rule) return true;
              return false;
          });
          
          if (!isRedundant) {
              acc.push({ path, rule });
          }
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
        if (rule === 'allow') content += `Allow: ${path}\n`;
        if (rule === 'block') content += `Disallow: ${path}\n`;
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
      bg: 'bg-emerald-50 hover:bg-emerald-100', 
      border: 'border-emerald-200', 
      text: 'text-emerald-700', 
      iconBg: 'bg-emerald-500 border-emerald-500', 
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

    const NavItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        activeTab === id 
          ? 'bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-900/20 dark:text-brand-400' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`} />
      <span>{label}</span>
      {activeTab === id && <ChevronRight className="w-4 h-4 ml-auto text-brand-400" />}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans dark:bg-slate-900">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => setActiveTab('upload')}
        >
          <div className="bg-brand-600 p-1.5 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white">BotBlock</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600 dark:text-slate-400">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div 
          className="p-6 border-b border-slate-100 dark:border-slate-800 hidden md:flex items-center space-x-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setActiveTab('upload')}
        >
          <div className="bg-brand-600 p-2 rounded-xl shadow-lg shadow-brand-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">BotBlock</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Robots.txt Generator</p>
          </div>
        </div>

        <div className="p-4 space-y-1">
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Configure</div>
          <NavItem id="upload" icon={Upload} label="Import Sitemap" />
          <NavItem id="paths" icon={List} label="Path Rules" />
          <NavItem id="media" icon={Film} label="Media & Files" />
          <NavItem id="crawlers" icon={Bot} label="Crawler Access" />
          
          <div className="mt-8 px-4 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Finish</div>
          <NavItem id="preview" icon={Code} label="Review & Export" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Cleo Version</span>
            <span className="font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen bg-slate-50/50 dark:bg-slate-950">


        <div className="max-w-5xl mx-auto p-6 md:p-12">
          
          {/* Header Section */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeTab === 'upload' && 'Import Your Sitemap'}
                {activeTab === 'paths' && 'Manage Path Access'}
                {activeTab === 'media' && 'File Type Control'}
                {activeTab === 'crawlers' && 'Bot & Crawler Settings'}
                {activeTab === 'preview' && 'Review Configuration'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {activeTab === 'upload' && 'Start by importing your sitemap to automatically detect paths.'}
                {activeTab === 'paths' && 'Control which sections of your site are accessible to bots.'}
                {activeTab === 'media' && 'Block or allow specific file extensions globally.'}
                {activeTab === 'crawlers' && 'Fine-tune access for specific search engines and AI scrapers.'}
                {activeTab === 'preview' && 'Verify your robots.txt file and export it.'}
              </p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Center Column: Tools */}
            {activeTab !== 'preview' && (
                <div className="lg:col-span-7 space-y-6">
                
                {/* Tab Content: Upload */}
                {activeTab === 'upload' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden animate-fadeIn">
                    <div className="p-8 space-y-8">
                        {/* Upload Area */}
                        <div 
                        className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-brand-50/50 dark:hover:bg-brand-900/10 hover:border-brand-300 dark:hover:border-brand-700 transition-all cursor-pointer group" 
                        onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="bg-brand-50 dark:bg-brand-900/20 p-4 rounded-full mb-4 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 group-hover:scale-110 transition-all duration-300">
                                <Upload className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                            </div>
                            <span className="text-base font-semibold text-slate-900 dark:text-white">Upload sitemap.xml</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">or drag and drop your file here</span>
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
                            <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500">OR</span>
                            </div>
                        </div>

                        {/* Manual Text Area */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Paste XML Content</label>
                                <button 
                                    onClick={() => parseSitemap(sitemapXml)}
                                    className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 font-medium"
                                >
                                    Process XML
                                </button>
                            </div>
                        
                            <textarea 
                                value={sitemapXml}
                                onChange={(e) => setSitemapXml(e.target.value)}
                                placeholder="<urlset>&#10;  <url>&#10;    <loc>https://example.com/page</loc>&#10;  </url>&#10;</urlset>"
                                className="w-full h-48 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-y bg-slate-50 dark:bg-slate-800 dark:text-slate-300"
                            />
                        </div>
                    </div>
                    </div>
                )}

                {/* Tab Content: Paths */}
                {activeTab === 'paths' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden animate-fadeIn flex flex-col h-[600px]">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">{paths.length} Paths</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleBulkPathAction('block')}
                                    className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-xs font-medium transition-colors"
                                >
                                    Block All
                                </button>
                                <button 
                                    onClick={() => handleBulkPathAction('allow')}
                                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg text-xs font-medium transition-colors"
                                >
                                    Allow All
                                </button>
                                <button 
                                    onClick={() => handleBulkPathAction('reset')}
                                    className="px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    title="Reset All Rules"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="relative group">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Filter paths..." 
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white dark:bg-slate-800 dark:text-white"
                                value={pathSearchTerm}
                                onChange={(e) => setPathSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {paths.length > 0 ? (
                            <PathRulesTree 
                                paths={filteredPaths} 
                                rules={pathRules} 
                                onToggleRule={togglePath} 
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full mb-3">
                                    <List className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p>No paths detected yet.</p>
                                <button onClick={() => setActiveTab('upload')} className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline mt-2">Import Sitemap</button>
                            </div>
                        )}
                    </div>
                    </div>
                )}

                {/* Tab Content: Media & Files */}
                {activeTab === 'media' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden animate-fadeIn">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 dark:text-white">File Extensions</h3>
                        <button 
                            onClick={() => setShowAddFile(!showAddFile)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add File Type</span>
                        </button>
                    </div>
                    
                    {showAddFile && (
                        <div className="p-4 bg-brand-50/50 dark:bg-brand-900/10 border-b border-brand-100 dark:border-brand-900/20 flex gap-3 items-end animate-fadeIn">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-brand-800 dark:text-brand-300 uppercase mb-1 block">Extension</label>
                                <input 
                                    type="text" 
                                    placeholder=".xyz" 
                                    className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                                    value={newFile.ext}
                                    onChange={(e) => setNewFile({...newFile, ext: e.target.value})}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-brand-800 dark:text-brand-300 uppercase mb-1 block">Category</label>
                                <select 
                                    className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                                    value={newFile.category}
                                    onChange={(e) => setNewFile({...newFile, category: e.target.value})}
                                >
                                    {fileGroups.map(g => <option key={g.category} value={g.category}>{g.category}</option>)}
                                    <option value="Custom">Custom</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleAddFileType}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
                            >
                                Add
                            </button>
                        </div>
                    )}

                    <div className="p-6 space-y-8">
                        {fileGroups.map((group, idx) => (
                        <div key={idx}>
                            <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
                                {group.icon}
                            </div>
                            <h3 className="font-medium text-slate-900 dark:text-white">{group.category}</h3>
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
                                    flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-mono transition-all border
                                    ${styles.bg} ${styles.border} ${styles.text}
                                    hover:shadow-md hover:-translate-y-0.5
                                    `}
                                >
                                    <span>{ext}</span>
                                    {styles.icon ? styles.icon : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden animate-fadeIn">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Search bots..." 
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all bg-white dark:bg-slate-800 dark:text-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            </div>
                            <select 
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none bg-white dark:bg-slate-800 dark:text-white focus:border-brand-500"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">All</option>
                                <option value="seo">SEO</option>
                                <option value="training">AI</option>
                                <option value="research">Research</option>
                            </select>
                        </div>
                        
                        <button 
                            onClick={() => setShowAddCrawler(!showAddCrawler)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Bot</span>
                        </button>
                    </div>

                    {showAddCrawler && (
                        <div className="p-4 bg-brand-50/50 dark:bg-brand-900/10 border-b border-brand-100 dark:border-brand-900/20 flex flex-col md:flex-row gap-3 items-end animate-fadeIn">
                            <div className="flex-1 w-full">
                                <label className="text-xs font-bold text-brand-800 dark:text-brand-300 uppercase mb-1 block">User Agent</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. MyCustomBot" 
                                    className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                                    value={newCrawler.ua}
                                    onChange={(e) => setNewCrawler({...newCrawler, ua: e.target.value})}
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="text-xs font-bold text-brand-800 dark:text-brand-300 uppercase mb-1 block">Company</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Acme Corp" 
                                    className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                                    value={newCrawler.company}
                                    onChange={(e) => setNewCrawler({...newCrawler, company: e.target.value})}
                                />
                            </div>
                            <div className="w-full md:w-32">
                                <label className="text-xs font-bold text-brand-800 dark:text-brand-300 uppercase mb-1 block">Type</label>
                                <select 
                                    className="w-full px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                                    value={newCrawler.type}
                                    onChange={(e) => setNewCrawler({...newCrawler, type: e.target.value})}
                                >
                                    <option value="other">Other</option>
                                    <option value="seo">SEO</option>
                                    <option value="training">Training</option>
                                    <option value="research">Research</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleAddCrawler}
                                className="w-full md:w-auto px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
                            >
                                Add
                            </button>
                        </div>
                    )}

                    {/* Bulk Actions */}
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex gap-2 overflow-x-auto">
                            <button 
                                onClick={() => handleBulkCrawlerAction('block')}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                            >
                                Block Bots
                            </button>
                            <button 
                                onClick={() => handleBulkCrawlerAction('allow')}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                            >
                                Allow Bots
                            </button>
                            <button 
                                onClick={allowSEOBots}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                            >
                                Allow SEO
                            </button>
                            <button 
                                onClick={() => handleBulkCrawlerAction('reset')}
                                className="px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-auto"
                                title="Reset All Blocks"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                    </div>

                    {/* Crawler List */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
                        {filteredCrawlers.map((bot, idx) => {
                            const isBlocked = blockedCrawlers.has(bot['user-agent']);
                            return (
                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex items-start space-x-4">
                                        <div className={`mt-1 p-2.5 rounded-xl transition-colors ${isBlocked ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:shadow-sm'}`}>
                                            <CrawlerIcon type={bot.type} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900 dark:text-white">{bot.company}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                    bot.type === 'seo' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                                    bot.type === 'training' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                                                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                }`}>{bot.type || 'General'}</span>
                                            </div>
                                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 bg-slate-100 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                {bot['user-agent']}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => toggleCrawler(bot['user-agent'])}
                                        className={`w-24 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 ${
                                            isBlocked 
                                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/30' 
                                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                        }`}
                                    >
                                        {isBlocked ? 'Blocked' : 'Allowed'}
                                    </button>
                                </div>
                            );
                        })}
                        {filteredCrawlers.length === 0 && (
                            <div className="p-12 text-center text-slate-400 dark:text-slate-500">
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

                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 p-6">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Configuration Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg text-red-600 dark:text-red-400">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm text-red-900 dark:text-red-200 font-medium">Blocked Bots</span>
                                </div>
                                <span className="text-xl font-bold text-red-600 dark:text-red-400">{blockedCrawlers.size}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Disallowed</div>
                                <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                                    {Object.values(pathRules).filter(v => v === 'block').length + 
                                    Object.values(extensionRules).filter(v => v === 'block').length}
                                </div>
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Allowed</div>
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
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
