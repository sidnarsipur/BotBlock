import React from 'react';
import { 
  Globe, 
  Cpu, 
  Image as ImageIcon, 
  Film, 
  Newspaper,
  Bot
} from 'lucide-react';

const CrawlerIcon = ({ type }) => {
  switch (type.toLowerCase()) {
    case 'seo': return <Globe className="w-4 h-4 text-green-500" />;
    case 'training': return <Cpu className="w-4 h-4 text-red-500" />;
    case 'image': return <ImageIcon className="w-4 h-4 text-blue-500" />;
    case 'video': return <Film className="w-4 h-4 text-purple-500" />;
    case 'news': return <Newspaper className="w-4 h-4 text-yellow-500" />;
    default: return <Bot className="w-4 h-4 text-gray-500" />;
  }
};

export default CrawlerIcon;
