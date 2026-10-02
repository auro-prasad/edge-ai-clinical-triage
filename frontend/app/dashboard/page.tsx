"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function Dashboard() {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // NEW: State to track which row is currently expanded
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Fetch the data from FastAPI when the page loads
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/patients");
        const data = await response.json();
        setPatients(data);
      } catch (error) {
        console.error("Failed to fetch patients:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // Filter patients based on the search bar
  const filteredPatients = patients.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    const triage = p.Triage_Assessment?.Triage_Priority?.toLowerCase() || "";
    const symptoms = (p.Extracted_Data?.Symptoms || []).join(" ").toLowerCase();
    
    return triage.includes(searchLower) || symptoms.includes(searchLower) || p.Patient_ID?.toLowerCase().includes(searchLower);
  });

  // Toggle row expansion
  const toggleRow = (index: number) => {
    if (expandedRow === index) {
      setExpandedRow(null); // Close if already open
    } else {
      setExpandedRow(index); // Open clicked row
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      {/* Navbar */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            <h1 className="text-xl font-bold tracking-wide">NeuroTriage<span className="text-blue-400">AI</span></h1>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              + New Patient
            </Link>
            <span className="text-sm font-medium text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              Database View
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Patient Database</h2>
            <p className="text-slate-500 text-sm mt-1">Search by ID, Priority Level, or Extracted Symptoms.</p>
          </div>
          <input
            type="text"
            placeholder="Search records..."
            className="w-64 px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-500">Loading patient records...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold border-b border-slate-200">Patient ID</th>
                  <th className="p-4 font-semibold border-b border-slate-200">Triage Priority</th>
                  <th className="p-4 font-semibold border-b border-slate-200">Key Symptoms</th>
                  <th className="p-4 font-semibold border-b border-slate-200">Medications Found</th>
                  <th className="p-4 font-semibold border-b border-slate-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {filteredPatients.map((patient, index) => (
                  <React.Fragment key={index}>
                    {/* Main Row (Clickable) */}
                    <tr 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => toggleRow(index)}
                    >
                      <td className="p-4 font-mono font-medium">{patient.Patient_ID || `PT-00${index}`}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                          patient.Triage_Assessment?.Triage_Priority === 'High' ? 'bg-rose-600' : 
                          patient.Triage_Assessment?.Triage_Priority === 'Medium' ? 'bg-amber-500' : 
                          'bg-emerald-600'
                        }`}>
                          {patient.Triage_Assessment?.Triage_Priority || 'Low'}
                        </span>
                      </td>
                      <td className="p-4 truncate max-w-xs text-slate-600">
                        {(patient.Extracted_Data?.Symptoms || []).join(", ") || "None"}
                      </td>
                      <td className="p-4 text-slate-600">
                        {patient.Extracted_Data?.Medications?.length || 0} meds
                      </td>
                      <td className="p-4 text-right text-blue-600 font-semibold text-xs">
                        {expandedRow === index ? "Close ▲" : "View AI Output ▼"}
                      </td>
                    </tr>

                    {/* Expanded AI Reasoning Row */}
                    {expandedRow === index && (
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={5} className="p-6">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Clinical Reasoning (For the Doctor) */}
                            <div>
                              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                AI Clinical Reasoning
                              </h3>
                              <p className="text-slate-700 bg-white p-4 rounded-lg border border-slate-200 text-sm shadow-sm">
                                {patient.Triage_Assessment?.Reasoning || "No detailed reasoning available."}
                              </p>
                            </div>
                            
                            {/* Layman's Terms (For the Patient) */}
                            <div>
                              <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">
                                Patient Translation (Layman's Terms)
                              </h3>
                              <div className="text-blue-800 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 italic text-sm shadow-sm">
                                "{patient.Triage_Assessment?.Laymans_Terms || "No translation generated."}"
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                
                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">No records found matching your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}