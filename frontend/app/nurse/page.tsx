"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, LogOut, Sparkles, Plus, FileText, AlertCircle, CheckCircle2, Search, RefreshCcw, Users, History, Calendar, BrainCircuit, X, AlertTriangle } from "lucide-react";

export default function NursePortal() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"intake" | "directory">("intake");
  const [nurseName, setNurseName] = useState("Triage Nurse");
  
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedMrn, setSelectedMrn] = useState<string>("");
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [rawNote, setRawNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [selectedDirPatient, setSelectedDirPatient] = useState<any | null>(null);

  useEffect(() => {
    const role = sessionStorage.getItem("hospital_role");
    const username = sessionStorage.getItem("hospital_user");
    if (role !== "nurse") { router.replace("/"); return; }

    if (username) {
      fetch(`http://127.0.0.1:8000/api/users/${username}/name`)
        .then(res => res.json())
        .then(data => setNurseName(data.name))
        .catch(err => console.error(err));
    }
  }, [router]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/patients/registered");
        if (res.ok) setPatients(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchPatients();
  }, [activeTab]);

  useEffect(() => {
    if (selectedMrn) {
      setLoadingHistory(true);
      fetch(`http://127.0.0.1:8000/api/patients/${selectedMrn}/history`)
        .then(res => res.json())
        .then(data => { setPatientHistory(data); setLoadingHistory(false); })
        .catch(err => { console.error(err); setLoadingHistory(false); });
    } else { setPatientHistory([]); }
  }, [selectedMrn]);

  const selectedPatient = patients.find(p => p.mrn.toString() === selectedMrn);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); 
    if (!selectedMrn) return alert("Please select a patient first.");
    
    // Instantly wipe previous results and errors
    setLoading(true); 
    setResult(null); 
    setApiError(null); 

    try {
      const response = await fetch("http://127.0.0.1:8000/api/process-note", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mrn: parseInt(selectedMrn), raw_note: rawNote }),
      });
      
      if (response.ok) {
        setResult(await response.json());
      } else {
        // Safely parse FastAPI's error details
        const errorData = await response.json().catch(() => null);
        let errorMessage = "The AI engine is currently experiencing high traffic. Please try again.";
        
        if (errorData && errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Extracts validation error strings from FastAPI's [{type, loc, msg}] format
            errorMessage = errorData.detail.map((err: any) => `${err.loc[err.loc.length - 1]}: ${err.msg}`).join(", ");
          } else if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          }
        }
        
        setApiError(errorMessage);
      }
    } catch (err) { 
      console.error(err);
      setApiError("Network error: Unable to reach the AI engine. Please verify the backend is running.");
    } finally { 
      setLoading(false); 
    }
  };

  const handleReset = () => {
    setSelectedMrn(""); setRawNote(""); setResult(null); setPatientHistory([]); setApiError(null);
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("hospital_role"); sessionStorage.removeItem("hospital_user");
    router.replace("/");
  };

  const getPriorityColors = (priority: string) => {
    const p = (priority || "").toUpperCase();
    if (p === "HIGH") return "bg-red-500/10 text-red-600 ring-red-500/20 border-red-500";
    if (p === "MEDIUM") return "bg-amber-500/10 text-amber-600 ring-amber-500/20 border-amber-500";
    if (p === "LOW") return "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 border-emerald-500";
    return "bg-zinc-100 text-zinc-500 ring-zinc-200 border-zinc-300";
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex selection:bg-blue-100 font-sans text-zinc-900">
      <aside className="w-20 lg:w-72 border-r border-zinc-200/60 bg-white/50 backdrop-blur-xl flex flex-col justify-between hidden sm:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-12 px-2">
            <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md"><Activity className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-xl tracking-tight hidden lg:block">HealthSync</span>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setActiveTab("intake")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-all ${activeTab === "intake" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}>
              <Plus className="w-5 h-5" /><span className="text-sm font-semibold hidden lg:block">New Intake</span>
            </button>
            <button onClick={() => setActiveTab("directory")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-all ${activeTab === "directory" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}>
              <Users className="w-5 h-5" /><span className="text-sm font-semibold hidden lg:block">Patient Directory</span>
            </button>
          </nav>
        </div>
        <div className="p-6">
          <button onClick={handleSignOut} className="group flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-xl w-full transition-all">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /><span className="text-sm font-semibold hidden lg:block">Disconnect Session</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="font-extrabold text-xl tracking-tight hidden sm:block">Workspace <span className="text-zinc-300 font-normal mx-2">|</span> {nurseName}</h1>
          <div className="sm:hidden w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center"><Activity className="w-5 h-5 text-white" /></div>
          
          {/* UPDATED: Removed sm:hidden so the button always shows on desktop too */}
          <button onClick={handleSignOut} className="p-2.5 bg-white ring-1 ring-zinc-200 hover:bg-red-50 rounded-xl text-red-600 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <div className="max-w-7xl mx-auto">
          {activeTab === "intake" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-10"><h2 className="text-3xl font-extrabold tracking-tight mb-2">Patient Registration</h2><p className="text-zinc-500 font-medium">Select a patient, review history, and input clinical observations for AI triage.</p></div>
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
                <div className="xl:col-span-7 bg-white p-8 lg:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 relative">
                  
                  {result && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 rounded-[2.5rem] flex items-center justify-center">
                       <div className="bg-white p-8 rounded-3xl shadow-xl ring-1 ring-zinc-200 text-center max-w-sm animate-in zoom-in-95 duration-300">
                         <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                         <h3 className="text-xl font-bold mb-2">Triage Complete</h3>
                         <p className="text-sm text-zinc-500 mb-6">Patient has been added to the active ER queue for physician review.</p>
                         <button onClick={handleReset} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"><Plus className="w-4 h-4" /> Next Patient</button>
                       </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Select Registered Patient</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-transform group-focus-within:scale-110"><Search className="h-4 w-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" /></div>
                        <select required value={selectedMrn} onChange={(e) => setSelectedMrn(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-zinc-50/50 hover:bg-zinc-50 border-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm font-bold transition-all outline-none cursor-pointer appearance-none text-zinc-900">
                          <option value="" disabled>Search by Name or MRN...</option>
                          {patients.map((p) => (<option key={p.mrn} value={p.mrn}>{p.is_synthetic ? "🧪 " : ""}MRN #{String(p.mrn).padStart(4, '0')} - {p.name}</option>))}
                        </select>
                      </div>
                    </div>

                    {selectedPatient && (
                      <div className="grid grid-cols-3 gap-4 p-5 bg-blue-50/50 rounded-2xl ring-1 ring-blue-100 animate-in fade-in zoom-in-95 duration-300">
                        <div><p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Legal Name</p><p className="font-bold text-blue-900 truncate">{selectedPatient.name}</p></div>
                        <div><p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Age</p><p className="font-bold text-blue-900">{selectedPatient.age} Yrs</p></div>
                        <div><p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Gender</p><p className="font-bold text-blue-900">{selectedPatient.gender}</p></div>
                      </div>
                    )}

                    {selectedPatient && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-2"><History className="w-3.5 h-3.5" /> Previous Encounters</label>
                        <div className="bg-zinc-50 rounded-2xl ring-1 ring-zinc-200/60 p-4 max-h-48 overflow-y-auto">
                          {loadingHistory ? (
                            <div className="flex items-center justify-center py-4 text-sm font-medium text-zinc-400 animate-pulse">Loading history...</div>
                          ) : patientHistory.length === 0 ? (
                            <div className="text-center py-4 text-sm font-medium text-zinc-400">No previous visits on record.</div>
                          ) : (
                            <div className="space-y-3">
                              {patientHistory.map((hist, idx) => {
                                const priority = hist.doctor_override || hist.triage_priority;
                                return (
                                  <div key={idx} className="bg-white p-3 rounded-xl shadow-sm ring-1 ring-zinc-100 border-l-2 flex flex-col gap-2" style={{ borderLeftColor: priority === 'HIGH' ? '#ef4444' : priority === 'MEDIUM' ? '#f59e0b' : '#10b981' }}>
                                    <div className="flex justify-between items-center">
                                      <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500"><Calendar className="w-3.5 h-3.5" /> {new Date(hist.created_at).toLocaleDateString()}</span>
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${getPriorityColors(priority)}`}>{priority} {hist.doctor_override ? "(OVERRIDE)" : ""}</span>
                                    </div>
                                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed italic">"{hist.raw_note}"</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Clinical EHR Note</label>
                      <textarea rows={5} required value={rawNote} onChange={(e) => setRawNote(e.target.value)} disabled={!selectedMrn} className="w-full p-5 bg-zinc-50/50 hover:bg-zinc-50 border-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm transition-all outline-none resize-none leading-relaxed font-medium disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Detail the patient's vitals, chief complaints, and preliminary observations..." />
                    </div>
                    
                    <button type="submit" disabled={loading || !selectedMrn} className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                      {loading ? <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 animate-pulse" /> Processing Note...</span> : "Generate AI Triage"}
                    </button>
                  </form>
                </div>

                <div className="xl:col-span-5 relative">
                  <div className="sticky top-12 bg-[#0A0A0A] p-8 lg:p-10 rounded-[2.5rem] shadow-2xl ring-1 ring-white/10 text-white overflow-hidden min-h-[500px] flex flex-col">
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
                    <div className="flex items-center justify-between mb-10 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ring-1 ring-white/20"><Sparkles className="w-4 h-4 text-blue-400" /></div>
                        <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-300">Diagnostic Core</h2>
                      </div>
                    </div>
                    
                    {/* Default State */}
                    {!result && !loading && !apiError && (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 opacity-40 relative z-10"><AlertCircle className="w-10 h-10" /><p className="text-[11px] font-bold uppercase tracking-widest">Awaiting Submission</p></div>
                    )}
                    
                    {/* Error State */}
                    {apiError && !loading && (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 relative z-10 animate-in fade-in zoom-in-95">
                        <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center ring-1 ring-red-500/50 mb-2">
                          <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                        <h3 className="text-red-400 font-bold text-lg">Submission Error</h3>
                        <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">{apiError}</p>
                        <button onClick={handleSubmit} className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ring-1 ring-white/20">
                          Retry Request
                        </button>
                      </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                      <div className="space-y-8 flex-1 relative z-10 flex flex-col justify-center"><div className="flex gap-4 items-center"><div className="w-12 h-12 rounded-full bg-white/5 animate-pulse" /><div className="space-y-3 flex-1"><div className="h-2 bg-white/10 rounded-full w-1/3 animate-pulse" /><div className="h-4 bg-white/10 rounded-full w-2/3 animate-pulse" /></div></div><div className="h-32 bg-white/5 rounded-3xl w-full animate-pulse ring-1 ring-white/10" /></div>
                    )}
                    
                    {/* Success State */}
                    {result && !loading && !apiError && (
                      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
                        <div>
                          <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">{result.Patient_ID}</p></div>
                          <div className="flex items-start justify-between gap-4"><p className="text-3xl font-extrabold tracking-tight">{result.Patient_Name}</p><span className={`px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-widest ring-1 inset-ring uppercase ${getPriorityColors(result.Triage_Assessment?.Triage_Priority)}`}>{result.Triage_Assessment?.Triage_Priority}</span></div>
                        </div>
                        <div className="relative">
                          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">AI Reasoning Analysis</h3>
                          <div className="bg-white/5 p-6 rounded-3xl ring-1 ring-white/10 backdrop-blur-sm"><p className="text-sm text-zinc-300 leading-relaxed font-medium">{result.Triage_Assessment?.Reasoning}</p></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: PATIENT DIRECTORY */}
          {/* ========================================================= */}
          {activeTab === "directory" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-10"><h2 className="text-3xl font-extrabold tracking-tight mb-2">Patient Directory</h2><p className="text-zinc-500 font-medium">Click on any patient row to deep-dive into their most recent triage encounter.</p></div>
              <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">MRN Number</th>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Patient Name</th>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Demographics</th>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Latest Triage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {patients.map((p, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedDirPatient(p)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4 font-mono font-bold text-zinc-900 group-hover:text-blue-700">#{String(p.mrn).padStart(4, '0')}</td>
                        <td className="px-6 py-4 font-bold text-zinc-800">{p.name}</td>
                        <td className="px-6 py-4 text-zinc-600 font-medium">{p.age} Yrs • {p.gender}</td>
                        <td className="px-6 py-4">
                          {p.latest_triage !== "NO RECORD" ? (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getPriorityColors(p.latest_triage)}`}>
                              {p.latest_triage}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">
                              None
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DIRECTORY DEEP-DIVE MODAL */}
      {selectedDirPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setSelectedDirPatient(null)} />
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100 bg-zinc-50/50">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight mb-1">{selectedDirPatient.name}</h2>
                <p className="text-sm text-zinc-500 font-medium">MRN-{String(selectedDirPatient.mrn).padStart(4, '0')} • {selectedDirPatient.age} Years • {selectedDirPatient.gender}</p>
              </div>
              <button onClick={() => setSelectedDirPatient(null)} className="p-2 text-zinc-400 hover:text-zinc-900 bg-white ring-1 ring-zinc-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {selectedDirPatient.latest_triage === "NO RECORD" ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText className="w-8 h-8 text-zinc-300" /></div>
                  <h3 className="text-lg font-bold text-zinc-700 mb-1">No Clinical History</h3>
                  <p className="text-zinc-500 text-sm">This patient is registered but has no prior triage encounters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left: Raw Note */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <FileText className="w-4 h-4" />
                        <h3 className="text-xs font-bold uppercase tracking-widest">Latest Clinical Note</h3>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-md">{selectedDirPatient.latest_date}</span>
                    </div>
                    <div className="bg-zinc-50 p-6 rounded-3xl ring-1 ring-zinc-200/50 text-sm leading-relaxed text-zinc-700 font-medium whitespace-pre-wrap">
                      {selectedDirPatient.latest_raw_note}
                    </div>
                  </div>

                  {/* Right: AI Analysis */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <BrainCircuit className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-widest">AI Reasoning</h3>
                    </div>
                    <div className="bg-indigo-50/30 p-6 rounded-3xl ring-1 ring-indigo-100 space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Priority Assigned</p>
                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ring-1 ring-inset ${getPriorityColors(selectedDirPatient.latest_triage)}`}>
                          {selectedDirPatient.latest_triage}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Explanation</p>
                        <p className="text-sm text-indigo-950 font-medium leading-relaxed">{selectedDirPatient.latest_reasoning}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}