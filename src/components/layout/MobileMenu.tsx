import React from 'react';
import { NavLink } from 'react-router-dom';
import { menuItems } from './menuConfig';
import { Plus, Minus } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';

interface MobileMenuProps {
  onClose: () => void;
  activeLinkClass: string;
  inactiveLinkClass: string;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ onClose, activeLinkClass, inactiveLinkClass }) => {
  return (
    <div className="xl:hidden absolute top-20 left-0 right-0 bg-white shadow-lg z-40 max-h-[80vh] overflow-y-auto">
      <nav className="flex flex-col px-4 py-3">
        {/* Changed type to "single" for the main accordion */}
        <Accordion type="single" collapsible className="w-full">
          {menuItems.map((item) => {
            if (item.submenu) {
              return (
                <AccordionItem key={item.name} value={item.name} className="border-b">
                  <AccordionTrigger className="py-3 px-2 hover:bg-primary-prosalud-light hover:text-primary-prosalud flex items-center">
                    <div className="flex items-center space-x-2">
                      <item.icon size={20} className="text-primary-prosalud" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="ml-7 space-y-1 py-2">
                      {item.submenu?.map((subItem) => {
                        if (subItem.submenu) { // This is a category header
                          return (
                            <Accordion type="multiple" key={subItem.name} className="w-full border-0">
                              <AccordionItem value={subItem.name} className="border-0">
                                <AccordionTrigger
                                  className={`category-accordion-trigger py-2 px-2 hover:bg-primary-prosalud-light hover:text-primary-prosalud text-sm`}
                                >
                                  <div className="flex justify-between w-full items-center">
                                    {/* Changed font-medium to font-bold for category title */}
                                    <span className="font-bold">{subItem.name}</span>
                                    <span className="plus-minus-icon">
                                      <Plus size={16} className="plus-icon" />
                                      <Minus size={16} className="minus-icon" />
                                    </span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="ml-4 space-y-1 py-1">
                                    {subItem.submenu.map((nestedItem) => (
                                      nestedItem.external ? (
                                        <a
                                          key={nestedItem.name}
                                          href={nestedItem.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={onClose}
                                          className={`${inactiveLinkClass} block px-2 py-2 rounded-md text-sm`}
                                        >
                                          {nestedItem.name}
                                        </a>
                                      ) : (
                                        <NavLink
                                          key={nestedItem.name}
                                          to={nestedItem.path || "#"}
                                          onClick={onClose}
                                          className={({ isActive }) =>
                                            `${isActive ? activeLinkClass : inactiveLinkClass} block px-2 py-2 rounded-md text-sm`
                                          }
                                        >
                                          {nestedItem.name}
                                        </NavLink>
                                      )
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          );
                        } else {
                          // Regular direct link subItem - handle external links
                          return subItem.external ? (
                            <a
                              key={subItem.name}
                              href={subItem.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={onClose}
                              className={`${inactiveLinkClass} block px-2 py-2 rounded-md text-sm`}
                            >
                              {subItem.name}
                            </a>
                          ) : (
                            <NavLink
                              key={subItem.name}
                              to={subItem.path || "#"}
                              onClick={onClose}
                              className={({ isActive }) =>
                                `${isActive ? activeLinkClass : inactiveLinkClass} block px-2 py-2 rounded-md text-sm`
                              }
                            >
                              {subItem.name}
                            </NavLink>
                          );
                        }
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            } else if (item.url) {
              // Handle external URL for mobile
              return (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className={`${inactiveLinkClass} flex items-center space-x-2 px-2 py-3 rounded-md text-base font-medium border-b`}
                >
                  <item.icon size={20} className="text-primary-prosalud" />
                  <span>{item.name}</span>
                </a>
              );
            } else {
              // For direct links without submenu
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} flex items-center space-x-2 px-2 py-3 rounded-md text-base font-medium border-b`}
                >
                  <item.icon size={20} className="text-primary-prosalud" />
                  <span>{item.name}</span>
                </NavLink>
              );
            }
          })}
        </Accordion>
      </nav>
    </div>
  );
};

export default MobileMenu;
