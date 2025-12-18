
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

interface ServiceCardProps {
  icon?: React.ElementType;
  imageUrl?: string;
  title: string;
  description?: string;
  linkTo: string;
  className?: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  icon: Icon, 
  imageUrl, 
  title, 
  description, 
  linkTo, 
  className 
}) => {
  const isExternalLink = linkTo.startsWith('http://') || linkTo.startsWith('https://');

  const cardContent = (
    <div className="flex flex-col h-full min-h-[180px] pointer-events-none">
      {/* Header con icono y título */}
      <div className="mb-3 flex items-start gap-3 min-h-[3rem]">
        {imageUrl ? (
          <Avatar className="h-10 w-10 overflow-hidden flex-shrink-0 mt-1">
            <img 
              src={imageUrl} 
              alt={title} 
              className="h-full w-full object-cover"
            />
          </Avatar>
        ) : Icon && (
          <Icon className="h-10 w-10 text-primary-prosalud group-hover:text-white transition-colors duration-200 flex-shrink-0 mt-1" />
        )}
        <h3 className="text-lg font-semibold text-text-dark group-hover:text-white transition-colors duration-200 leading-tight overflow-hidden" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: '1.4',
          maxHeight: '2.8em'
        }}>{title}</h3>
      </div>
      
      {/* Descripción con altura fija */}
      <div className="mb-4 flex-grow min-h-[3rem]">
        {description ? (
          <p className="text-sm text-text-gray group-hover:text-white transition-colors duration-200 overflow-hidden" style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
            maxHeight: '4.2em'
          }}>{description}</p>
        ) : (
          <div className="min-h-[3rem]"></div>
        )}
      </div>
      
      {/* Footer fijo */}
      <div className="mt-auto">
        <span className="text-sm font-medium text-secondary-prosaludgreen group-hover:text-white flex items-center transition-colors duration-200">
          Acceder al servicio
          <ArrowRight size={16} className="ml-2 transform group-hover:translate-x-1 transition-transform duration-200" />
        </span>
      </div>
    </div>
  );

  const commonClasses = cn(
    "block bg-card p-6 rounded-lg shadow-lg group border border-prosalud-border transform transition-all duration-300 ease-in-out hover:shadow-xl hover:border-primary-prosalud hover:scale-[1.02] hover:bg-prosalud-hover cursor-pointer clickable",
    className
  );

  if (isExternalLink) {
    return (
      <a 
        href={linkTo} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={commonClasses}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link 
      to={linkTo} 
      className={commonClasses}
    >
      {cardContent}
    </Link>
  );
};

export default ServiceCard;

