import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { menuItems, MenuSubItem } from './menuConfig';
import { HeaderListItem } from './HeaderListItem';

interface DesktopMenuProps {
  inactiveLinkClass: string;
}

const DesktopMenu: React.FC<DesktopMenuProps> = ({ inactiveLinkClass }) => {
  // Function to determine if a menu has only a single column of items
  const hasSingleColumn = (submenu: MenuSubItem[]): boolean => {
    if (submenu.every(item => !item.submenu)) {
      return true;
    }
    if (submenu.length === 1 && submenu[0].submenu) {
      return true;
    }
    return false;
  };

  // Function to determine if a menu has multiple sections that should be displayed in separate columns
  const hasMultipleSections = (submenu: MenuSubItem[]): boolean => {
    return submenu.filter(item => item.submenu).length > 1;
  };

  return (
    <NavigationMenu>
      <NavigationMenuList className="flex space-x-2">
        {menuItems.map((item) => (
          <NavigationMenuItem key={item.name} className="relative">
            {item.submenu ? (
              <>
                <NavigationMenuTrigger className="text-gray-600 hover:text-primary-prosalud transition-colors text-sm py-1 px-2 font-normal bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent">
                  <span className="flex items-center gap-1">
                    {item.name}
                  </span>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul
                    className={cn(
                      "grid gap-3 p-4",
                      hasSingleColumn(item.submenu)
                        ? "w-[300px]" // Single column layout
                        : hasMultipleSections(item.submenu)
                        ? "w-[400px] md:w-[500px] lg:w-[600px] lg:grid-cols-2" // Multiple sections in columns
                        : "w-[400px] md:w-[500px] lg:w-[600px] lg:grid-cols-[minmax(150px,_.75fr)_1fr]", // Mixed layout
                      "max-h-[75vh] overflow-y-auto"
                    )}
                  >
                    {item.submenu.map((subItem) => (
                      // Use HeaderListItem which wraps <li> internally
                      <HeaderListItemWrapper // Renamed to avoid confusion, this is a temporary wrapper for logic
                        key={subItem.name}
                        subItem={subItem}
                      />
                    ))}
                  </ul>
                </NavigationMenuContent>
              </>
            ) : item.url ? (
              // Handle external URL
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-medium py-2 px-3 block ${inactiveLinkClass} hover:bg-gray-50 rounded-md`}
              >
                {item.name}
              </a>
            ) : ( 
              <Link
                to={item.path!}
                className={`text-sm font-medium py-2 px-3 block ${inactiveLinkClass} hover:bg-gray-50 rounded-md`}
              >
                {item.name}
              </Link>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
};

// Helper component to render HeaderListItem or a nested structure
const HeaderListItemWrapper: React.FC<{ subItem: MenuSubItem }> = ({ subItem }) => {
  if (subItem.submenu) {
    // This is a header for another submenu
    return (
      <li key={subItem.name} className="break-inside-avoid"> {/* Outer li for proper grid flow */}
        <div className="mb-2">
          <h4 className="font-bold mb-1 text-sm text-primary-prosalud px-3 py-1">{subItem.name}</h4>
          <ul className="grid gap-1">
            {subItem.submenu.map((nestedSubItem) => (
              <HeaderListItem
                key={nestedSubItem.name}
                title={nestedSubItem.name}
                href={nestedSubItem.external ? nestedSubItem.url : nestedSubItem.path}
                target={nestedSubItem.external ? "_blank" : undefined}
                rel={nestedSubItem.external ? "noopener noreferrer" : undefined}
              >
                {/* Optional: Add description for nestedSubItem if available */}
              </HeaderListItem>
            ))}
          </ul>
        </div>
      </li>
    );
  }
  // This is a direct link item
  return (
    <HeaderListItem
      key={subItem.name}
      title={subItem.name}
      href={subItem.external ? subItem.url : subItem.path}
      target={subItem.external ? "_blank" : undefined}
      rel={subItem.external ? "noopener noreferrer" : undefined}
      className="break-inside-avoid" // Apply to HeaderListItem directly if it's a direct child of ul
    >
        {/* Optional: Add description for subItem if available */}
    </HeaderListItem>
  );
};


export default DesktopMenu;
