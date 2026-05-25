// src/hooks/useDatasetFilters.test.js
//
// Item 8.1 — tests for the shared dataset-filter hook and its pure
// applyFilters() utility. Pure-function tests run without Redux; hook tests
// use a real RTK store to verify dispatch wiring.

import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import React from "react";

import useDatasetFilters, { applyFilters } from "./useDatasetFilters";
import dataReducer, {
  selectDataFilters,
} from "../redux/slices/dataSlice";

// ── fixtures ─────────────────────────────────────────────────────────────────

const DATASETS = [
  {
    id: "1",
    title: "Cardiac Study",
    description: "Heart rate data",
    category: "Cardiology",
    verified: true,
    minAge: 30,
    maxAge: 65,
  },
  {
    id: "2",
    title: "Diabetes Survey",
    description: "Blood glucose records",
    category: "Endocrinology",
    verified: false,
    minAge: 18,
    maxAge: 80,
  },
  {
    id: "3",
    title: "Pediatric Asthma",
    description: "Respiratory data for children",
    category: "Pulmonology",
    verified: true,
    minAge: 5,
    maxAge: 17,
  },
];

const NO_FILTERS = {
  category: "",
  verifiedOnly: false,
  minAge: "",
  maxAge: "",
  searchTerm: "",
};

// ── applyFilters — pure function ──────────────────────────────────────────────

describe("applyFilters (pure function)", () => {
  it("returns empty array when datasets is empty", () => {
    expect(applyFilters([], NO_FILTERS)).toEqual([]);
  });

  it("returns all datasets when no filter is active", () => {
    expect(applyFilters(DATASETS, NO_FILTERS)).toHaveLength(DATASETS.length);
  });

  it("returns all datasets when filters is null/undefined", () => {
    expect(applyFilters(DATASETS, null)).toBe(DATASETS);
    expect(applyFilters(DATASETS, undefined)).toBe(DATASETS);
  });

  it("returns empty array when datasets is not an array", () => {
    expect(applyFilters(null, NO_FILTERS)).toEqual([]);
    expect(applyFilters("bad", NO_FILTERS)).toEqual([]);
  });

  // ── category ───────────────────────────────────────────────────────────

  it("filters by exact category match", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, category: "Cardiology" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it('skips category filter when category is "All"', () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, category: "All" });
    expect(result).toHaveLength(DATASETS.length);
  });

  it("skips category filter when category is empty string", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, category: "" });
    expect(result).toHaveLength(DATASETS.length);
  });

  // ── verifiedOnly ───────────────────────────────────────────────────────

  it("keeps only verified datasets when verifiedOnly is true", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, verifiedOnly: true });
    expect(result.every((d) => d.verified)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("passes all datasets when verifiedOnly is false", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, verifiedOnly: false });
    expect(result).toHaveLength(DATASETS.length);
  });

  // ── minAge / maxAge ────────────────────────────────────────────────────

  it("excludes datasets whose minAge is below the filter minAge", () => {
    // Pediatric Asthma has minAge 5 — should be excluded when filter minAge is 18
    const result = applyFilters(DATASETS, { ...NO_FILTERS, minAge: "18" });
    expect(result.find((d) => d.id === "3")).toBeUndefined();
  });

  it("excludes datasets whose maxAge exceeds the filter maxAge", () => {
    // Diabetes Survey has maxAge 80 — excluded when filter maxAge is 65
    const result = applyFilters(DATASETS, { ...NO_FILTERS, maxAge: "65" });
    expect(result.find((d) => d.id === "2")).toBeUndefined();
  });

  it("skips minAge filter when value is empty string", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, minAge: "" });
    expect(result).toHaveLength(DATASETS.length);
  });

  it("skips maxAge filter when value is empty string", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, maxAge: "" });
    expect(result).toHaveLength(DATASETS.length);
  });

  it("skips age filters for non-numeric values", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, minAge: "abc", maxAge: "xyz" });
    expect(result).toHaveLength(DATASETS.length);
  });

  // ── searchTerm ─────────────────────────────────────────────────────────

  it("filters by searchTerm matching title (case-insensitive)", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, searchTerm: "cardiac" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by searchTerm matching description", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, searchTerm: "blood glucose" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by searchTerm matching category", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, searchTerm: "pulmonology" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("returns empty when searchTerm matches nothing", () => {
    const result = applyFilters(DATASETS, { ...NO_FILTERS, searchTerm: "zzznomatch" });
    expect(result).toHaveLength(0);
  });

  // ── combined ───────────────────────────────────────────────────────────

  it("applies multiple filters together (AND logic)", () => {
    // Only Cardiac Study is verified AND in Cardiology
    const result = applyFilters(DATASETS, {
      ...NO_FILTERS,
      category: "Cardiology",
      verifiedOnly: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});

// ── useDatasetFilters hook ────────────────────────────────────────────────────

const makeStore = (preloadedFilters = {}) =>
  configureStore({
    reducer: { data: dataReducer },
    preloadedState: {
      data: {
        healthRecords: [],
        userRecords: [],
        purchasedRecords: [],
        loading: false,
        error: null,
        apiFailure: false,
        totalCount: 0,
        filters: { minAge: "", maxAge: "", verifiedOnly: false, category: "", ...preloadedFilters },
        pagination: { currentPage: 1, totalPages: 1, recordsPerPage: 12 },
        selectedRecord: null,
        transactions: [],
      },
    },
  });

const wrapper =
  (store) =>
  ({ children }) =>
    React.createElement(Provider, { store }, children);

describe("useDatasetFilters hook", () => {
  it("returns all datasets when filters are at defaults", () => {
    const store = makeStore();
    const { result } = renderHook(() => useDatasetFilters(DATASETS), {
      wrapper: wrapper(store),
    });
    expect(result.current.filtered).toHaveLength(DATASETS.length);
  });

  it("updateFilter dispatches a slice action that narrows the filtered list", () => {
    const store = makeStore();
    const { result } = renderHook(() => useDatasetFilters(DATASETS), {
      wrapper: wrapper(store),
    });

    act(() => {
      result.current.updateFilter("category", "Cardiology");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("1");
    expect(selectDataFilters(store.getState()).category).toBe("Cardiology");
  });

  it("resetFilters clears all filter state", () => {
    const store = makeStore({ category: "Cardiology", verifiedOnly: true });
    const { result } = renderHook(() => useDatasetFilters(DATASETS), {
      wrapper: wrapper(store),
    });

    // Should be narrowed by preset filters
    expect(result.current.filtered.length).toBeLessThan(DATASETS.length);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filtered).toHaveLength(DATASETS.length);
    expect(selectDataFilters(store.getState()).category).toBe("");
    expect(selectDataFilters(store.getState()).verifiedOnly).toBe(false);
  });

  it("setFilters replaces the entire filter object", () => {
    const store = makeStore();
    const { result } = renderHook(() => useDatasetFilters(DATASETS), {
      wrapper: wrapper(store),
    });

    act(() => {
      result.current.setFilters({ category: "Pulmonology", verifiedOnly: true, minAge: "", maxAge: "" });
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("3");
  });

  it("exposes the raw filters object from the store", () => {
    const store = makeStore({ category: "Endocrinology" });
    const { result } = renderHook(() => useDatasetFilters(DATASETS), {
      wrapper: wrapper(store),
    });
    expect(result.current.filters.category).toBe("Endocrinology");
  });
});
