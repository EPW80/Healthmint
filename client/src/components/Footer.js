// src/components/Footer.js
import React, { memo } from "react";
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

  const FooterLink = ({ href, label, icon: Icon, onClick, external }) => (
    <a
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={label}
      className="text-fg-muted hover:text-fg transition-colors text-sm flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded px-2 py-1"
    >
      {Icon && <Icon size={14} className="opacity-75" aria-hidden="true" />}
      <span>{label}</span>
      {external && (
        <ExternalLink size={11} className="opacity-60" aria-hidden="true" />
      )}
    </a>
  );

  const SocialIcon = ({ href, label, icon: Icon }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="p-2 text-fg-muted hover:text-accent rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
    >
      <Icon size={18} aria-hidden="true" />
    </a>
  );

  return (
    <footer
      className="fixed bottom-0 w-full bg-surface border-t border-line py-3 z-10"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Company info */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-accent rounded-full flex-shrink-0" />
            <p className="text-sm text-fg-muted font-medium">
              © {currentYear} {companyName}
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
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

          {/* Social */}
          <div className="flex gap-0.5">
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

export default memo(Footer);
