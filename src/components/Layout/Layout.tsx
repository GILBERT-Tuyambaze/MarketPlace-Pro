import React, { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, Clock } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  const { platformSettings } = useAuth();
  useEffect(() => {
    // Scroll animations
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    });

    const animateElements = document.querySelectorAll('.scroll-animate');
    animateElements.forEach((el) => observer.observe(el));

    return () => {
      animateElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      <Header />
      
      {/* Maintenance/Lock Banner */}
      {(platformSettings?.marketplace_locked || platformSettings?.maintenance_mode) && (
        <div className="w-full bg-gradient-to-r from-amber-100 to-orange-100 border-b-4 border-orange-500">
          <div className="flex items-center gap-3 py-4 px-4 max-w-7xl mx-auto">
            {platformSettings?.marketplace_locked ? (
              <AlertCircle className="h-6 w-6 text-red-700 flex-shrink-0 animate-pulse" />
            ) : (
              <Clock className="h-6 w-6 text-orange-700 flex-shrink-0 animate-pulse" />
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-900">
                {platformSettings?.maintenance_message && platformSettings.maintenance_message.trim() 
                  ? platformSettings.maintenance_message 
                  : 'The marketplace is currently under scheduled maintenance. We apologize for any inconvenience.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;