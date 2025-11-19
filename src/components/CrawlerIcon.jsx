import React from 'react';
import { 
  Globe, 
  Cpu, 
  Image as ImageIcon, 
  Film, 
  Newspaper,
  Bot
} from 'lucide-react';

const CrawlerIcon = ({ type, className = "w-5 h-5" }) => {
  switch (type?.toLowerCase()) {
    case 'seo': return <Globe className={className} />;
    case 'training': return <Cpu className={className} />;
    case 'image': return <ImageIcon className={className} />;
    case 'video': return <Film className={className} />;
    case 'news': return <Newspaper className={className} />;
    default: return <Bot className={className} />;
  }
};

export default CrawlerIcon;
