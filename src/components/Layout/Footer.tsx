import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
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
          <div className="flex space-x-6 mt-4 md:mt-0">
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
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;