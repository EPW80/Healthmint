// client/src/components/ui/TabNavigation.js
import React, { memo } from "react";
import PropTypes from "prop-types";

// Tab navigation bar. Each tab drives a corresponding TabPanel via id/aria linkage.
// tabs: [{ id: string, label: string, icon?: ReactNode }]
export const TabNavigation = memo(
  ({ tabs, activeTab, onChange, ariaLabel }) => (
    <nav className="flex overflow-x-auto" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`${tab.id}-tab`}
          aria-controls={`${tab.id}-panel`}
          aria-selected={activeTab === index}
          onClick={() => onChange(index)}
          className={`py-3 px-4 text-sm font-medium border-b-2 flex items-center whitespace-nowrap ${
            activeTab === index
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
    </nav>
  )
);

TabNavigation.displayName = "TabNavigation";

TabNavigation.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
    })
  ).isRequired,
  activeTab: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
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
  id: PropTypes.string.isRequired,
  tabId: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  children: PropTypes.node,
};
