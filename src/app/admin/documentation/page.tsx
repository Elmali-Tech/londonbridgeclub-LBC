"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowRight,
  FiCheckCircle,
  FiTarget,
  FiFileText,
  FiBriefcase,
  FiShield,
  FiServer,
  FiDatabase,
  FiLayout,
  FiCpu,
  FiUser,
  FiSettings,
  FiZap,
  FiAward,
} from "react-icons/fi";

const STAGES = [
  {
    id: "lead",
    title: "Lead",
    icon: FiTarget,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    desc: "Initial contact or interest identified.",
  },
  {
    id: "opportunity",
    title: "Opportunity",
    icon: FiZap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    desc: "Specific requirements and deal size defined.",
  },
  {
    id: "proposal",
    title: "Proposal",
    icon: FiFileText,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    desc: "Scope of work and pricing sent to client.",
  },
  {
    id: "negotiation",
    title: "Negotiation",
    icon: FiSettings,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    desc: "Finalizing terms and deal adjustments.",
  },
  {
    id: "won",
    title: "Project Won",
    icon: FiAward,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    desc: "Project kickoff and execution phase.",
  },
];

export default function DocumentationPage() {
  const [activeTab, setActiveTab] = useState("process");

  return (
    <div className="min-h-screen bg-transparent text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 text-amber-500 font-bold tracking-widest text-xs uppercase"
            >
              <span className="w-8 h-[2px] bg-amber-500"></span>
              Operational Standards
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black tracking-tight dark:text-white"
            >
              Process <span className="text-amber-500 italic">Flow</span>
            </motion.h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-lg">
              Detailed technical and operational documentation of the London
              Bridge Club sales ecosystem.
            </p>
          </div>

          <div className="flex bg-white dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <button
              onClick={() => setActiveTab("process")}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === "process"
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                  : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Sales Lifecycle
            </button>
            <button
              onClick={() => setActiveTab("architecture")}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === "architecture"
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                  : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              System Architecture
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === "process" ? (
            <motion.div
              key="process"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Visual Process Flow */}
              <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
                  {/* Background Line (Desktop) */}
                  <div className="hidden md:block absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 opacity-20 -translate-y-1/2"></div>

                  {STAGES.map((stage, idx) => (
                    <React.Fragment key={stage.id}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative z-10 flex flex-col items-center text-center space-y-4 group max-w-[150px]"
                      >
                        <div
                          className={`w-16 h-16 rounded-2xl ${stage.bg} flex items-center justify-center ${stage.color} text-2xl border border-white/10 shadow-lg group-hover:scale-110 transition-transform`}
                        >
                          <stage.icon />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black uppercase tracking-widest dark:text-white">
                            {stage.title}
                          </h4>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                            {stage.desc}
                          </p>
                        </div>
                      </motion.div>
                      {idx < STAGES.length - 1 && (
                        <div className="md:hidden text-gray-300 dark:text-gray-800">
                          <FiArrowRight className="rotate-90 md:rotate-0" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Roles & Phases Detail */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-2xl font-black tracking-tight dark:text-white flex items-center gap-3">
                    <FiBriefcase className="text-amber-500" />
                    Lifecycle Phases
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        num: "01",
                        name: "Lead Discovery",
                        goal: "Qualify interest & fit",
                        role: "Business Dev",
                      },
                      {
                        num: "02",
                        name: "Opportunity Analysis",
                        goal: "Define scope & value",
                        role: "Account Manager",
                      },
                      {
                        num: "03",
                        name: "Proposal Generation",
                        goal: "Present structured solution",
                        role: "Pre-sales Team",
                      },
                      {
                        num: "04",
                        name: "Closing / Ops",
                        goal: "Convert to active project",
                        role: "Ops Manager",
                      },
                    ].map((phase) => (
                      <div
                        key={phase.num}
                        className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm group hover:border-amber-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-3xl font-black text-amber-500/20 group-hover:text-amber-500/40 transition-colors">
                            {phase.num}
                          </span>
                          <FiCheckCircle className="text-gray-200 dark:text-gray-800 text-xl" />
                        </div>
                        <h5 className="text-lg font-black dark:text-white mt-2">
                          {phase.name}
                        </h5>
                        <div className="mt-4 space-y-1">
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">
                            Primary Goal
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-400 font-bold">
                            {phase.goal}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Responsible
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                            {phase.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-black tracking-tight dark:text-white flex items-center gap-3">
                    <FiShield className="text-amber-500" />
                    System Access
                  </h3>
                  <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                    {[
                      {
                        role: "Management",
                        access: "KPI Access & Strategy",
                        color: "text-purple-500",
                        bg: "bg-purple-500/10",
                      },
                      {
                        role: "Admin",
                        access: "Full System Controls",
                        color: "text-rose-500",
                        bg: "bg-rose-500/10",
                      },
                      {
                        role: "Executive",
                        access: "Pipeline & Operations",
                        color: "text-blue-500",
                        bg: "bg-blue-500/10",
                      },
                    ].map((item) => (
                      <div key={item.role} className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-2xl ${item.bg} ${item.color}`}
                        >
                          <FiUser />
                        </div>
                        <div>
                          <p className="text-sm font-black dark:text-white">
                            {item.role}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">
                            {item.access}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl mt-4 border border-dashed border-gray-200 dark:border-gray-800">
                      <p className="text-[10px] text-center font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                        Security enforced via Supabase Post-level RLS policies.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="architecture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-gray-900 p-12 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="max-w-4xl mx-auto space-y-12">
                  <div className="text-center space-y-2">
                    <h3 className="text-3xl font-black dark:text-white tracking-tighter uppercase">
                      Systems{" "}
                      <span className="text-amber-500">Architecture</span>
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      Technical stack and distributed resource orchestration.
                    </p>
                  </div>

                  {/* Visual Stack Diagram */}
                  <div className="relative pt-12">
                    <div className="flex flex-col md:flex-row items-stretch justify-between gap-8 h-full">
                      {/* Users */}
                      <div className="flex flex-col items-center justify-center p-6 bg-amber-500 rounded-2xl text-black shadow-sm shadow-amber-500/20 min-w-[140px]">
                        <FiUser className="text-4xl mb-4" />
                        <span className="font-black uppercase tracking-widest text-[10px]">
                          Administrators
                        </span>
                      </div>

                      <div className="flex items-center justify-center md:flex-1">
                        <div className="w-[2px] h-12 md:h-[2px] md:w-full bg-gradient-to-r from-amber-500 to-indigo-500 opacity-30"></div>
                      </div>

                      {/* App Layer */}
                      <div className="flex flex-col items-center justify-center p-8 bg-gray-900 dark:bg-gray-800 border border-gray-800 dark:border-gray-700 rounded-2xl text-white shadow-sm relative min-w-[200px]">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                          NEXT.JS 15+
                        </div>
                        <FiLayout className="text-4xl mb-4 text-indigo-500" />
                        <span className="font-black uppercase tracking-widest text-[10px] mb-2 text-center">
                          App Router & API Layer
                        </span>
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 bg-gray-800 rounded text-[8px] font-bold text-gray-400 italic">
                            Typescript
                          </span>
                          <span className="px-2 py-0.5 bg-gray-800 rounded text-[8px] font-bold text-gray-400 italic">
                            SSR
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center md:flex-1">
                        <div className="w-[2px] h-12 md:h-[2px] md:w-full bg-gradient-to-r from-indigo-500 to-emerald-500 opacity-30"></div>
                      </div>

                      {/* Data Layer */}
                      <div className="flex flex-col gap-4 min-w-[160px]">
                        <div className="p-5 bg-white dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                          <FiDatabase className="text-emerald-500 text-2xl" />
                          <div className="flex flex-col">
                            <span className="font-black dark:text-white uppercase tracking-widest text-[9px]">
                              PostgreSQL
                            </span>
                            <span className="text-[8px] text-gray-500">
                              Supabase RLS
                            </span>
                          </div>
                        </div>
                        <div className="p-5 bg-white dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                          <FiServer className="text-blue-500 text-2xl" />
                          <div className="flex flex-col">
                            <span className="font-black dark:text-white uppercase tracking-widest text-[9px]">
                              AWS S3
                            </span>
                            <span className="text-[8px] text-gray-500">
                              Static Assets
                            </span>
                          </div>
                        </div>
                        <div className="p-5 bg-white dark:bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
                          <FiCheckCircle className="text-rose-500 text-2xl" />
                          <div className="flex flex-col">
                            <span className="font-black dark:text-white uppercase tracking-widest text-[9px]">
                              Stripe
                            </span>
                            <span className="text-[8px] text-gray-500">
                              Payments
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Components */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: FiCpu,
                    title: "Next.js 15 API Routers",
                    desc: "Handles server-side logic and authorized deal management.",
                  },
                  {
                    icon: FiShield,
                    title: "Auth Flow",
                    desc: "Role-based access control leveraging Supabase Auth tokens.",
                  },
                  {
                    icon: FiZap,
                    title: "Real-time Sync",
                    desc: "Optimistic UI updates for the tracking table and dashboards.",
                  },
                ].map((comp, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center space-y-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-xl text-amber-500">
                      <comp.icon />
                    </div>
                    <h5 className="font-black uppercase tracking-[0.15em] text-xs dark:text-white">
                      {comp.title}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                      {comp.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Closing Footer Area */}
        <div className="pt-8 text-center flex flex-col items-center space-y-4">
          <div className="w-1 h-16 bg-gradient-to-b from-amber-500/20 to-transparent"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 opacity-50">
            London Bridge Club Operations & Technical Guidelines v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
