import React from 'react';
import { 
  FileText, 
  ImageIcon, 
  Film, 
  Code
} from 'lucide-react';

export const INITIAL_CRAWLER_CSV = `Company,User-Agent,Type,notes
Google,Googlebot,seo,
Google,Googlebot-Image,image,
Google,Googlebot-Video,video,
Google,Googlebot-News,news,
Google,Mediapartners-Google,ads,
Google,GoogleOther,research,
Google,Google-Extended,training,
Bing,Bingbot,seo,
BingAds,AdIdxBot,ads,
BingPreview,MicrosoftPreview,preview,
MicrosoftSearch,msnbot,seo,
Facebook,FacebookBot,training,
Twitter,TwitterBot,social,
Discord,DiscordBot,social,
Yahoo,Slurp,seo,
OpenAI,ChatGPT-User,chat,plugins
OpenAI,GPTBot,training,
Anthropic,anthropic-ai,training,
Anthropic,anthropicAi,training,
Common Crawl,CCBot,training,
Omigili ,Omgilibot,training,`;

export const FILE_TYPES = [
  { 
    category: 'Documents', 
    icon: <FileText className="w-5 h-5 text-blue-500" />, 
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'] 
  },
  { 
    category: 'Images', 
    icon: <ImageIcon className="w-5 h-5 text-pink-500" />, 
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.tiff', '.bmp'] 
  },
  { 
    category: 'Audio & Video', 
    icon: <Film className="w-5 h-5 text-purple-500" />, 
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.mp3', '.wav', '.ogg', '.flac'] 
  },
  { 
    category: 'Code & Data', 
    icon: <Code className="w-5 h-5 text-emerald-500" />, 
    extensions: ['.json', '.xml', '.sql', '.zip', '.tar', '.gz', '.env', '.log', '.bak'] 
  }
];
