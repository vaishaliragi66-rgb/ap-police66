import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const PersonFilterContext = createContext(null);
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:6100';

const toOption = (member) => {
  const id = String(member?._id || member?.id || "").trim();
  if (!id) return null;
  const name = String(member?.Name || member?.name || "Family Member").trim();
  const relationship = String(member?.Relationship || member?.relationship || "").trim();
  const suffix = relationship ? ` (${relationship})` : "";
  return {
    id,
    label: `${name}${suffix}`,
    name,
    relationship,
  };
};

export const PersonFilterProvider = ({ children }) => {
  const [selectedByEmployee, setSelectedByEmployee] = useState({});
  const [familyByEmployee, setFamilyByEmployee] = useState({});
  const [loadingByEmployee, setLoadingByEmployee] = useState({});
  const fetchedRef = useRef(new Set());

  const setSelectedPerson = (employeeId, personId) => {
    const empId = String(employeeId || "").trim();
    if (!empId) return;
    const nextPerson = String(personId || "self").trim() || "self";

    setSelectedByEmployee((prev) => ({ ...prev, [empId]: nextPerson }));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`personFilter:${empId}`, nextPerson);
    }
  };

  const ensureFamilyMembers = async (employeeId) => {
    const empId = String(employeeId || "").trim();
    if (!empId) return;
    if (fetchedRef.current.has(empId)) return;

    fetchedRef.current.add(empId);
    setLoadingByEmployee((prev) => ({ ...prev, [empId]: true }));

    try {
      const res = await axios.get(`${BACKEND_URL}/family-api/family/${empId}`);
      const list = (Array.isArray(res.data) ? res.data : []).map(toOption).filter(Boolean);
      setFamilyByEmployee((prev) => ({ ...prev, [empId]: list }));
    } catch {
      setFamilyByEmployee((prev) => ({ ...prev, [empId]: [] }));
    } finally {
      setLoadingByEmployee((prev) => ({ ...prev, [empId]: false }));
    }
  };

  const getSelectedPerson = (employeeId) => {
    const empId = String(employeeId || "").trim();
    if (!empId) return "self";

    if (selectedByEmployee[empId]) return selectedByEmployee[empId];
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(`personFilter:${empId}`) || "self";
    }
    return "self";
  };

  const value = useMemo(
    () => ({
      selectedByEmployee,
      familyByEmployee,
      loadingByEmployee,
      setSelectedPerson,
      ensureFamilyMembers,
      getSelectedPerson,
    }),
    [selectedByEmployee, familyByEmployee, loadingByEmployee]
  );

  return <PersonFilterContext.Provider value={value}>{children}</PersonFilterContext.Provider>;
};

export const usePersonFilter = (employeeId) => {
  const ctx = useContext(PersonFilterContext);
  if (!ctx) {
    throw new Error("usePersonFilter must be used within PersonFilterProvider");
  }

  const empId = String(employeeId || "").trim();
  const familyMembers = ctx.familyByEmployee[empId] || [];
  const loadingFamily = Boolean(ctx.loadingByEmployee[empId]);
  const selectedPersonId = ctx.getSelectedPerson(empId);

  useEffect(() => {
    if (!empId) return;
    ctx.ensureFamilyMembers(empId);
  }, [empId]);

  const options = useMemo(() => {
    const base = [
      { id: "self", label: "Self" },
      { id: "all", label: "All Members" },
    ];

    const relationSet = new Set(
      familyMembers
        .map((m) => String(m.relationship || "").trim().toLowerCase())
        .filter(Boolean)
    );

    const missingRelationOptions = [
      { key: "son", label: "No son registered" },
      { key: "daughter", label: "No daughter registered" },
      { key: "wife", label: "No wife registered" },
    ]
      .filter((r) => !relationSet.has(r.key))
      .map((r) => ({ id: `missing-${r.key}`, label: r.label, disabled: true }));

    return [...base, ...familyMembers, ...missingRelationOptions];
  }, [familyMembers]);

  useEffect(() => {
    if (!empId) return;
    const allowed = new Set(options.map((o) => o.id));
    if (!allowed.has(selectedPersonId)) {
      ctx.setSelectedPerson(empId, "self");
    }
  }, [empId, options, selectedPersonId]);

  return {
    selectedPersonId,
    setSelectedPersonId: (id) => ctx.setSelectedPerson(empId, id),
    familyMembers,
    loadingFamily,
    options,
  };
};
