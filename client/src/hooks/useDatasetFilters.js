// client/src/hooks/useDatasetFilters.js
//
// Shared dataset-filter state + application logic. Filter state lives in the
// data slice (state.data.filters) — this hook wraps the slice actions and
// adds the apply-filters utility so consumers don't re-implement filtering
// in each browser/marketplace component.
//
// Why this exists: DataBrowser, DataBrowserView, and DataMarketplace each
// have their own near-identical filter wiring (state, update, reset, apply).
// Sharing through this hook is a precondition for decomposing those monoliths.

import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setFilters,
  updateFilter as updateFilterAction,
  resetFilters as resetFiltersAction,
  selectDataFilters,
} from "../redux/slices/dataSlice.js";

// Apply the current filter set to a dataset array. Returns a new array.
// Filters that are empty/default are skipped — this matches what the legacy
// useState-based filter logic in DataBrowser used to do inline.
export const applyFilters = (datasets, filters) => {
  if (!Array.isArray(datasets) || datasets.length === 0) return [];
  if (!filters) return datasets;

  return datasets.filter((d) => {
    if (filters.category && filters.category !== "All" && filters.category !== "") {
      if (d.category !== filters.category) return false;
    }
    if (filters.verifiedOnly && !d.verified) return false;
    if (filters.minAge !== "" && filters.minAge != null) {
      const min = Number(filters.minAge);
      if (!Number.isNaN(min) && (d.minAge ?? 0) < min) return false;
    }
    if (filters.maxAge !== "" && filters.maxAge != null) {
      const max = Number(filters.maxAge);
      if (!Number.isNaN(max) && (d.maxAge ?? Infinity) > max) return false;
    }
    if (filters.searchTerm) {
      const q = filters.searchTerm.toLowerCase();
      const haystack = [d.title, d.description, d.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
};

const useDatasetFilters = (datasets) => {
  const dispatch = useDispatch();
  const filters = useSelector(selectDataFilters);

  const updateFilter = useCallback(
    (key, value) => dispatch(updateFilterAction({ key, value })),
    [dispatch]
  );
  const setAll = useCallback(
    (next) => dispatch(setFilters(next)),
    [dispatch]
  );
  const reset = useCallback(() => dispatch(resetFiltersAction()), [dispatch]);

  const filtered = useMemo(
    () => applyFilters(datasets, filters),
    [datasets, filters]
  );

  return {
    filters,
    filtered,
    updateFilter,
    setFilters: setAll,
    resetFilters: reset,
  };
};

export default useDatasetFilters;
