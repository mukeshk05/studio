
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

const Breadcrumbs = () => {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(segment => segment); // Filter out empty strings

  const breadcrumbItems = [{ label: 'Home', href: '/' }];

  let currentPath = '';
  segments.forEach(segment => {
    currentPath += `/${segment}`;
    // Create a more user-friendly label
    let label = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (segment.toLowerCase() === 'things-to-do') {
        label = 'Things To Do';
    }
    // For dynamic segments like [packageId], we might want to fetch the actual name in the future.
    // For now, display the ID or a generic placeholder if it's a long ID.
    // This example just uses the capitalized segment.
    breadcrumbItems.push({ label, href: currentPath });
  });

  if (breadcrumbItems.length <= 1 && pathname !== '/') { // Only "Home" but not on home page (e.g. dashboard might be just /)
    // This case might indicate the root of the (app) group, like /dashboard.
    // If pathname is just '/dashboard', segments = ['dashboard'], breadcrumbItems = [Home, Dashboard]
    // So this specific check might not be needed if all app pages are deeper than root.
    // If dashboard is the root of (app) and path is /dashboard, it's fine.
    // If the root (app) page is something like /app, then Home / App makes sense.
    // Given our structure, /dashboard will be Home / Dashboard which is okay.
  }
  
  // Don't show breadcrumbs on the root landing page itself, only within the app.
  // The (app) layout structure ensures this. If pathname is just '/', it's the landing page.
  // However, if an (app) page was somehow at the root (e.g. /dashboard), it would show Home / Dashboard.
  // This component is intended for the (app) layout, so / will be the Home link.

  return (
    <nav aria-label="Breadcrumb" className={cn("py-3 px-4 md:px-8", "glass-pane", "border-b border-border/30")}>
      <ol className="flex items-center space-x-1.5 text-sm text-muted-foreground">
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.href}>
            <li>
              {index === breadcrumbItems.length - 1 ? (
                <span className="font-medium text-foreground">{item.label}</span>
              ) : (
                <Link href={item.href} className="hover:text-primary transition-colors flex items-center">
                  {item.label === 'Home' && <HomeIcon className="h-4 w-4 mr-1.5 shrink-0" />}
                  {item.label !== 'Home' && item.label}
                </Link>
              )}
            </li>
            {index < breadcrumbItems.length - 1 && (
              <li>
                <ChevronRight className="h-4 w-4" />
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
