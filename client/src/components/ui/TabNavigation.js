// client/src/components/ui/TabNavigation.js
import React, { memo } from "react";
import PropTypes from "prop-types";

// Tab navigation bar. Each tab drives a corresponding TabPanel via id/aria linkage.
// tabs: [{ id: string, label: string, icon?: ReactNode }]
export const TabNavigation = memo(
  ({ tabs, activeTab, onChange, ariaLabel }) => (
    <div className="flex overflow-x-auto" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`${tab.id}-tab`}
          aria-controls={`${tab.id}-panel`}
          aria-selected={activeTab === index}
          onClick={() => onChange(index)}
          className={`py-3 px-4 text-sm font-medium border-b-2 flex items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset ${
            activeTab === index
              ? "border-accent text-accent"
              : "border-transparent text-fg-muted hover:text-fg hover:border-line-strong"
          }`}
        >
          {tab.icon && (
            <span className="mr-2" aria-hidden="true">
              {tab.icon}
            </span>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  )
);

TabNavigation.displayName = "TabNavigation";

TabNavigation.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id:    PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon:  PropTypes.node,
    })
  ).isRequired,
  activeTab: PropTypes.number.isRequired,
  onChange:  PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
};

// Tab panel — pair with TabNavigation. Hidden when not active.
export const TabPanel = memo(({ id, tabId, active, children }) => (
  <div
    role="tabpanel"
    id={`${id}-panel`}
    aria-labelledby={`${tabId}-tab`}
    hidden={!active}
  >
    {active && children}
  </div>
));

TabPanel.displayName = "TabPanel";

TabPanel.propTypes = {
  id:       PropTypes.string.isRequired,
  tabId:    PropTypes.string.isRequired,
  active:   PropTypes.bool.isRequired,
  children: PropTypes.node,
};
