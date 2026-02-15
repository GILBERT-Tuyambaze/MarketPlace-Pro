import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);

    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-lg">
                <Package className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold">MarketPlace Pro</span>
            </Link>
            <p className="text-gray-400 mb-4 max-w-md">
              The premier multi-vendor marketplace connecting buyers and sellers worldwide. 
              Discover amazing products and grow your business with us.
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-gray-400">
                <Mail className="h-4 w-4" />
                <span>support@marketplacepro.com</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-gray-400 hover:text-white transition-colors">
                  Browse Products
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-400 hover:text-white transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-400 hover:text-white transition-colors">
                  Track Orders
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-gray-400 hover:text-white transition-colors">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products?category=electronics" className="text-gray-400 hover:text-white transition-colors">
                  Electronics
                </Link>
              </li>
              <li>
                <Link to="/products?category=fashion" className="text-gray-400 hover:text-white transition-colors">
                  Fashion
                </Link>
              </li>
              <li>
                <Link to="/products?category=home" className="text-gray-400 hover:text-white transition-colors">
                  Home & Garden
                </Link>
              </li>
              <li>
                <Link to="/products?category=books" className="text-gray-400 hover:text-white transition-colors">
                  Books
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 MarketPlace Pro. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0 items-center">
            <Link to="https://gilbert-tuyambaze.vercel.app" className="text-gray-400 hover:text-white text-sm transition-colors">
              powered by Gilbert Tuyambaze
            </Link>
            <Link to="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link to="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Terms of Service
            </Link>
            <Link to="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Support
            </Link>
            {/* PWA install / instructions */}
            <div className="flex items-center space-x-3">
              {canInstall && (
                <button
                  id="pwa-install-btn"
                  onClick={() => {
                    const evt = (window as any).__pwaInstallPrompt;
                    if (!evt) return;
                    evt.prompt();
                    evt.userChoice && evt.userChoice.then(() => {
                      (window as any).__pwaInstallPrompt = null;
                      setCanInstall(false);
                    });
                  }}
                  className="text-gray-400 hover:text-white text-sm transition-colors border border-gray-700 px-3 py-1 rounded"
                >
                  Install App
                </button>
              )}

              {!canInstall && isIos && (
                <button
                  onClick={() => {
                    const el = document.getElementById('ios-pwa-instructions');
                    if (el) el.classList.remove('hidden');
                  }}
                  className="text-gray-400 hover:text-white text-sm transition-colors border border-gray-700 px-3 py-1 rounded"
                >
                  Add to Home Screen
                </button>
              )}

              {!canInstall && !isIos && (
                <a href="/favicon/site.webmanifest" className="text-gray-400 hover:text-white text-sm transition-colors border border-gray-700 px-3 py-1 rounded">Manifest</a>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* iOS PWA instructions modal */}
      <div id="ios-pwa-instructions" className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white text-gray-900 rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold">Install MarketPlace Pro</h3>
            <button className="text-gray-500" onClick={() => { const el = document.getElementById('ios-pwa-instructions'); if (el) el.classList.add('hidden'); }}>Close</button>
          </div>
          <p className="mt-3 text-sm">To add this app to your iPhone or iPad home screen:</p>
          <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
            <li>Tap the <strong>Share</strong> button in Safari (the square with an arrow).</li>
            <li>Choose <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>. The app will appear on your home screen.</li>
          </ol>
          <div className="mt-4 text-right">
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => { const el = document.getElementById('ios-pwa-instructions'); if (el) el.classList.add('hidden'); }}>Got it</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

