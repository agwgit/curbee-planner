export const PROJECT_CONFIG = {
    // App Meta
    clientName: "Curbee",
    pageTitle: "Curbee | Planner",

    // Header Branding
    logoPath: "/logo.png", // Must be in /public folder
    headline: "Roadmap & Retainer",
    subheadline: "Focus: Rapid execution of high-impact web deliverables. Active priorities live here, new ideas go to the backlog.",

    // Security
    masterPassword: "2026",

    // Taxonomy & Colors
    // Note: Tailwind classes must be fully spelled out (e.g., 'bg-slate-800 text-white') for JIT compilation
    buckets: [
        { name: "1.0 Polish", style: "bg-curbee-teal-500 text-white" },
        { name: "2.0 Experience", style: "bg-curbee-orange-500 text-white" },
        { name: "Brand / Narrative", style: "bg-curbee-amber-500 text-slate-900" },
        { name: "Sales Collateral", style: "bg-curbee-slate-800 text-white" },
        { name: "Maintenance", style: "bg-curbee-slate-200 text-slate-900" }
    ]
};
