import React from 'react';

interface MarketplaceLayoutProps {
  hero: React.ReactNode;
  toolbar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * MarketplaceLayout handles the structural orchestration of the marketplace feature.
 * It manages vertical rhythm, max widths, responsive spacing, and sticky offsets.
 */
export function MarketplaceLayout({ hero, toolbar, children }: MarketplaceLayoutProps) {
  return (
    <div className="space-y-12 max-w-[1600px] mx-auto pb-20">
      {/* Hero Section - Full width within container */}
      <section aria-label="Featured content">
        {hero}
      </section>

      {/* Toolbar Section - Sticky placement for high accessibility */}
      <section 
        className="sticky top-24 md:top-28 z-30 py-2 bg-background/50 backdrop-blur-sm -mx-4 px-4"
        aria-label="Search and filtering"
      >
        {toolbar}
      </section>

      {/* Main Content Floor */}
      <main className="space-y-10 min-h-[60vh]">
        {children}
      </main>
    </div>
  );
}
