// src/components/Footer.js
import React from "react";
import PropTypes from "prop-types";
import { Github, Twitter, Mail, ExternalLink } from "lucide-react";

const Footer = ({
  companyName = "Healthmint",
  githubUrl = "https://github.com/EPW80/Healthmint",
  twitterUrl = "https://x.com/healthmint",
  contactEmail = "erikpw009@gmail.com",
}) => {
  const currentYear = new Date().getFullYear();

  const handleContactClick = (e) => {
    e.preventDefault();
    window.location.href = `mailto:${contactEmail}`;
  };

  // Footer link component for consistency
  const FooterLink = ({ href, label, icon: Icon, onClick, external }) => (
    <a
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={label}
      className="text-gray-600 hover:text-blue-500 transition-colors text-sm flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 rounded px-2 py-1"
    >
      {Icon && <Icon size={16} className="opacity-75" />}
      <span>{label}</span>
      {external && <ExternalLink size={12} className="opacity-75" />}
    </a>
  );

  // Social media icon component
  const SocialIcon = ({ href, label, icon: Icon }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
    >
      <Icon size={20} />
    </a>
  );

  return (
    <footer
      className="fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-white/30 py-3 shadow-[0_-10px_15px_rgba(0,0,0,0.05)] z-10 transition-all duration-300 hover:bg-white/60 hover:backdrop-blur-none group"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Company info */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full"></div>
            <p className="text-sm text-gray-600 font-medium group-hover:text-gray-800">
              © {currentYear} {companyName}
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <FooterLink
              href={`${githubUrl}/blob/main/LICENSE`}
              label="Privacy Policy"
              external
            />
            <FooterLink
              href={`${githubUrl}/blob/main/LICENSE`}
              label="Terms of Service"
              external
            />
            <FooterLink
              href={`mailto:${contactEmail}`}
              label="Contact"
              icon={Mail}
              onClick={handleContactClick}
            />
          </div>

          {/* Social media */}
          <div className="flex gap-1 justify-center">
            <SocialIcon
              href={githubUrl}
              label="Visit our GitHub repository"
              icon={Github}
            />
            <SocialIcon
              href={twitterUrl}
              label="Follow us on Twitter"
              icon={Twitter}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

Footer.propTypes = {
  companyName: PropTypes.string,
  githubUrl: PropTypes.string,
  twitterUrl: PropTypes.string,
  contactEmail: PropTypes.string,
};

export default Footer;
