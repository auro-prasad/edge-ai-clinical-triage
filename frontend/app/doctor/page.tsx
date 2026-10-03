"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Stethoscope, Clock, FileText, BrainCircuit, X, RefreshCw, CheckCircle2, ShieldAlert } from "lucide-react";

export default function DoctorPortal() {
  const router = useRouter();

  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [selectedEncounter, setSelectedEncounter] = useState<any | null>(null);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [doctorName, setDoctorName] = useState("Attending Physician");
  
  // NEW STATE: To hold the history for the selected patient
  const [patientHistory, setPatientHistory] = useState<any[]>([]);

  // Authentication & Personalization Check
  useEffect(() => {
    const role = sessionStorage.getItem("hospital_role");
    const username = sessionStorage.getItem("hospital_user");
    
    if (role !== "doctor") {
      router.replace("/");
      return;
    }

    if (username) {
      fetch(`http://127.0.0.1:8000/api/users/${username}/name`)
        .then(res => res.json())
        .then(data => setDoctorName(data.name))
        .catch(err => console.error("Failed to fetch doctor name", err));
    }
  }, [router]);

  // UPDATED: Deduplicate the queue so we only see the latest encounter per MRN
  const fetchQueue = () => {
    setLoading(true);
    fetch("http://127.0.0.1:8000/api/patients")
      .then((res) => res.json())
      .then((data) => {
        const latestEncounters = new Map();
        
        // 1. Sort all encounters from newest to oldest
        const sortedData = data.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // 2. Add to Map (keeps only the first/newest it sees per MRN)
        sortedData.forEach((enc: any) => {
          if (!latestEncounters.has(enc.mrn)) {
            latestEncounters.set(enc.mrn, enc);
          }
        });
        
        // 3. Set the queue to our clean, deduplicated array
        setQueue(Array.from(latestEncounters.values()));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch queue", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  // NEW FUNCTION: Fetch history when a doctor clicks a patient card
  const handlePatientClick = async (encounter: any) => {
    setSelectedEncounter(encounter);
    setPatientHistory([]); // Clear old history while loading
    
    try {
      // Fetch all records again, and filter out just the past history for this MRN
      const res = await fetch("http://127.0.0.1:8000/api/patients");
      if (res.ok) {
        const allData = await res.json();
        const historyData = allData
          .filter((h: any) => h.mrn === encounter.mrn && h.id !== encounter.id)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setPatientHistory(historyData);
      }
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  const handleOverride = async (encounterId: number, newPriority: string) => {
    setOverrideLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/override/${encounterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_priority: newPriority }),
      });
      if (res.ok) {
        setQueue(queue.map(q => q.id === encounterId ? { ...q, doctor_override: newPriority } : q));
        setSelectedEncounter({ ...selectedEncounter, doctor_override: newPriority });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to override priority.");
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("hospital_role");
    sessionStorage.removeItem("hospital_user");
    router.replace("/");
  };

  const filteredQueue = queue.filter(q => {
    if (filter === "ALL") return true;
    const currentPriority = q.doctor_override || q.triage_priority;
    return currentPriority === filter;
  });

  const getPriorityStyles = (priority: string) => {
    const p = (priority || "").toUpperCase();
    if (p === "HIGH") return "bg-red-50 text-red-700 ring-red-200 border-red-500";
    if (p === "MEDIUM") return "bg-amber-50 text-amber-700 ring-amber-200 border-amber-500";
    if (p === "LOW") return "bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-500";
    return "bg-zinc-50 text-zinc-600 ring-zinc-200 border-zinc-300";
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-zinc-900 selection:bg-blue-100 flex flex-col">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center ring-1 ring-indigo-100">
              <Stethoscope className="w-5 h-5 text-indigo-600" />
            </div>
            <h1 className="font-extrabold text-xl tracking-tight hidden sm:block">
              Workspace <span className="text-zinc-300 font-normal mx-2">|</span> {doctorName}
            </h1>
          </div>
          
          <div className="flex bg-zinc-100/80 p-1 rounded-xl ring-1 ring-zinc-200/50">
            {["ALL", "HIGH", "MEDIUM", "LOW"].map((f) => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${filter === f ? 'bg-white shadow-sm text-zinc-900 ring-1 ring-zinc-200/50' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <button onClick={handleSignOut} className="p-2.5 bg-white ring-1 ring-zinc-200 hover:bg-red-50 rounded-xl text-red-600 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN QUEUE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 pt-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">Active ER Queue</h2>
            <p className="text-zinc-500 font-medium">Select a patient to review AI diagnostics and raw intake notes.</p>
          </div>
          <button onClick={fetchQueue} className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-zinc-300 animate-spin" /></div>
        ) : filteredQueue.length === 0 ? (
          <div className="bg-white p-16 rounded-[3rem] text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-emerald-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-zinc-500 font-semibold text-lg tracking-tight">The ER queue is currently empty for this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQueue.map((enc) => {
              const activePriority = enc.doctor_override || enc.triage_priority;
              const style = getPriorityStyles(activePriority);
              const xgbRisk = enc.xgboost_risk || enc.XGBoost_Assessment?.Predicted_Risk;
              const xgbConf = enc.xgboost_confidence || enc.XGBoost_Assessment?.Confidence_Score;
              const hasOverride = enc.safety_override || enc.safety_override_triggered || enc.Triage_Assessment?.safety_override_triggered;
              
              return (
                <div 
                  key={enc.id} 
                  onClick={() => handlePatientClick(enc)}
                  className={`bg-white rounded-3xl p-6 shadow-sm ring-1 ring-zinc-200/60 cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden group border-l-4 ${style}`}
                >
                  {enc.doctor_override && (
                    <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Overridden
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">MRN-{enc.mrn.toString().padStart(4, '0')}</p>
                      <h3 className="font-extrabold text-lg truncate pr-10">{enc.name}</h3>
                      <p className="text-xs text-zinc-500 font-medium">{enc.age} Yrs • {enc.gender}</p>
                    </div>
                  </div>

                  {/* XGBoost Mathematical Baseline */}
                  {xgbRisk && (
                    <div className="mb-3 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      XGBoost Model: {xgbRisk} ({xgbConf})
                    </div>
                  )}

                  {/* Safety Override Alert */}
                  {hasOverride && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 border border-red-200">
                      <div className="flex">
                        <div className="ml-1">
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-800">
                            ⚠️ Automated Safety Override Triggered
                          </h3>
                          <div className="mt-1 text-xs text-red-700 font-medium leading-relaxed">
                            <p>The AI's initial assessment was overruled due to critical vital signs.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-zinc-600 line-clamp-2 mb-6 h-10 leading-relaxed font-medium">
                    {enc.reasoning}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ring-1 ring-inset ${style}`}>
                      {activePriority} Priority
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                      <Clock className="w-3.5 h-3.5" /> 
                      {new Date(enc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* DEEP-DIVE MODAL */}
      {selectedEncounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setSelectedEncounter(null)} />
          
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100 bg-zinc-50/50">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-extrabold tracking-tight">{selectedEncounter.name}</h2>
                  {selectedEncounter.doctor_override && <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ring-1 ring-amber-200">Physician Overridden</span>}
                </div>
                <p className="text-sm text-zinc-500 font-medium">MRN-{selectedEncounter.mrn.toString().padStart(4, '0')} • {selectedEncounter.age} Years • {selectedEncounter.gender}</p>
              </div>
              <button onClick={() => setSelectedEncounter(null)} className="p-2 text-zinc-400 hover:text-zinc-900 bg-white ring-1 ring-zinc-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <FileText className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Unstructured Intake Note</h3>
                </div>
                <div className="bg-zinc-50 p-6 rounded-3xl ring-1 ring-zinc-200/50 text-sm leading-relaxed text-zinc-700 font-medium whitespace-pre-wrap">
                  {selectedEncounter.raw_note || "No raw note provided."}
                </div>

                {/* Render the past history here */}
                {patientHistory.length > 0 && (
                  <div className="mt-6 border-t border-zinc-200 pt-6">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Previous ER Visits
                    </h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {patientHistory.map((hist, idx) => (
                        <div key={idx} className="bg-zinc-50 p-4 rounded-2xl ring-1 ring-zinc-200/50 text-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-zinc-600 text-xs">
                              {new Date(hist.created_at).toLocaleDateString()} at {new Date(hist.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ring-1 ring-inset ${getPriorityStyles(hist.doctor_override || hist.triage_priority)}`}>
                              {hist.doctor_override || hist.triage_priority}
                            </span>
                          </div>
                          <p className="text-zinc-500 font-medium italic line-clamp-3 text-xs leading-relaxed">"{hist.raw_note}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-400">
                  <BrainCircuit className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">AI Reasoning Engine</h3>
                </div>
                
                <div className="bg-indigo-50/30 p-6 rounded-3xl ring-1 ring-indigo-100 space-y-4">
                  {/* XGBoost Mathematical Baseline Details */}
                  {(selectedEncounter.xgboost_risk || selectedEncounter.XGBoost_Assessment?.Predicted_Risk) && (
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Tabular ML Baseline</p>
                      <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-200">
                        XGBoost Risk: {selectedEncounter.xgboost_risk || selectedEncounter.XGBoost_Assessment?.Predicted_Risk} ({selectedEncounter.xgboost_confidence || selectedEncounter.XGBoost_Assessment?.Confidence_Score})
                      </span>
                    </div>
                  )}

                  {/* Safety Override Alert Detail */}
                  {(selectedEncounter.safety_override || selectedEncounter.safety_override_triggered || selectedEncounter.Triage_Assessment?.safety_override_triggered) && (
                    <div className="rounded-md bg-red-50 p-4 border border-red-200 mb-4">
                      <div className="flex">
                        <div className="ml-1">
                          <h3 className="text-xs font-bold text-red-800">
                            ⚠️ Automated Safety Override Triggered
                          </h3>
                          <div className="mt-2 text-xs text-red-700">
                            <p>The language model's initial assessment was overruled due to critical vital signs detected by the XGBoost algorithm.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Original AI Priority</p>
                    <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ring-1 ring-inset ${getPriorityStyles(selectedEncounter.triage_priority)}`}>
                      {selectedEncounter.triage_priority}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Clinical Reasoning</p>
                    <p className="text-sm text-indigo-950 font-medium leading-relaxed">{selectedEncounter.reasoning}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5" /> Clinical Override Control
                  </p>
                  <div className="flex gap-3">
                    {["HIGH", "MEDIUM", "LOW"].map((p) => (
                      <button
                        key={p}
                        disabled={overrideLoading || selectedEncounter.doctor_override === p || (!selectedEncounter.doctor_override && selectedEncounter.triage_priority === p)}
                        onClick={() => handleOverride(selectedEncounter.id, p)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed
                          ${p === 'HIGH' ? 'bg-red-50 hover:bg-red-100 text-red-700 ring-1 ring-red-200' : 
                            p === 'MEDIUM' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 
                            'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'}
                        `}
                      >
                        Set {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}