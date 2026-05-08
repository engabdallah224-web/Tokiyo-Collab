import { Link } from 'react-router-dom';
import { Users, Github, Facebook, Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-black text-gray-300 border-t border-red-900/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Users className="h-8 w-8 text-red-600" />
              <span className="text-2xl font-bold text-white">
                CollabCore
              </span>
            </Link>
            <p className="text-sm text-gray-400">
              Connecting students for collaborative projects and research opportunities.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/discovery" className="text-sm hover:text-red-500 transition-colors">
                  Discover Projects
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-sm hover:text-red-500 transition-colors">
                  Search Users
                </Link>
              </li>
              <li>
                <Link to="/projects/create" className="text-sm hover:text-red-500 transition-colors">
                  Post a Project
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm hover:text-red-500 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-red-500 transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-red-500 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-red-500 transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-white font-semibold mb-4">Connect</h3>
            <div className="flex space-x-4">
              <a
                href="https://github.com/engabdallah224-web"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/share/18c7Wffd3y/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://engabdallahassan.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Website"
              >
                <Globe className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-red-900/50 mt-8 pt-8 text-sm text-gray-400 text-center">
          <p>&copy; {new Date().getFullYear()} CollabCore. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

