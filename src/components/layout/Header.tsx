
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogIn } from 'lucide-react';
import DesktopMenu from './DesktopMenu';
import MobileMenu from './MobileMenu';
import GlobalSearch from './GlobalSearch';
import { Button } from '@/components/ui/button';

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeLinkClass = "text-primary-prosalud font-bold border-b-2 border-secondary-prosaludgreen";
  const inactiveLinkClass = "text-text-gray hover:text-primary-prosalud transition-colors";

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo (Left) */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img 
              src="/images/logo_prosalud_fondo.png" 
              alt="ProSalud Logo" 
              className="h-12 w-auto" 
              width="120"
              height="48"
              fetchPriority="high"
            />
          </Link>

          {/* Desktop Navigation (Center) - Only show on xl screens and above */}
          <div className="hidden xl:flex flex-grow justify-center">
            <DesktopMenu inactiveLinkClass={inactiveLinkClass} />
          </div>

          {/* Search, Login Button & Mobile Menu Toggle (Right) */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 min-w-0">
            {/* Global Search - Hidden on small screens, shown on medium+ */}
            <div className="hidden md:block flex-shrink-0 max-w-[200px] lg:max-w-[250px] xl:max-w-[300px]">
              <GlobalSearch />
            </div>

            <Link to="/admin" className="flex-shrink-0">
              {/*<Link to="/auth/login" className="flex-shrink-0">*/ }
              <Button
                variant="outline"
                size="sm"
                className="border-primary-prosalud text-primary-prosalud hover:bg-primary-prosalud hover:text-white focus:ring-primary-prosalud flex items-center gap-2 transition-all duration-200"
              >
                <LogIn size={16} />
                <span>Acceder</span>
              </Button>
            </Link>

            {/* Mobile Menu Button - Show on screens smaller than xl */}
            <div className="xl:hidden flex-shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-text-dark hover:text-primary-prosalud focus:outline-none p-2"
                aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Search Bar - Below header on mobile/tablet */}
        <div className="md:hidden pb-4 pt-2">
          <GlobalSearch />
        </div>
      </div>

      {/* Mobile Menu - Show on screens smaller than xl when open */}
      {isMobileMenuOpen && (
        <MobileMenu
          onClose={() => setIsMobileMenuOpen(false)}
          activeLinkClass={activeLinkClass}
          inactiveLinkClass={inactiveLinkClass}
        />
      )}
    </header>
  );
};

export default Header;
