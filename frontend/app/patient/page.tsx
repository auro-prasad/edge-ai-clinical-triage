"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, HeartPulse, Calendar, ShieldCheck, Mail, MapPin, Phone, Hash, User, Activity } from "lucide-react";

export default function PatientPortal() {
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication & Data Fetching
  useEffect(() => {
    const role = sessionStorage.getItem("hospital_role");
    const username = sessionStorage.getItem("hospital_user");
    
    if (role !== "patient") {
      router.replace("/");
      return;
    }

    if (username) {
      // 1. Fetch Patient Profile
      fetch(`http://127.0.0.1:8000/api/patient/profile/${username}`)
        .then(res => res.json())
        .then(data => {
          setProfile(data);
          // 2. Fetch their clinical history using the retrieved MRN
          return fetch(`http://127.0.0.1:8000/api/patients/${data.mrn}/history`);
        })
        .then(res => res.json())
        .then(historyData => {
          setHistory(historyData);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching patient data", err);
          setLoading(false);
        });
    }
  }, [router]);

  const handleSignOut = () => {
    sessionStorage.removeItem("hospital_role");
    sessionStorage.removeItem("hospital_user");
    router.replace("/");
  };

  const getPriorityColor = (priority: string) => {
    const p = (priority || "").toUpperCase();
    if (p === "HIGH") return "text-red-600 bg-red-50 ring-red-200";
    if (p === "MEDIUM") return "text-amber-600 bg-amber-50 ring-amber-200";
    if (p === "LOW") return "text-emerald-600 bg-emerald-50 ring-emerald-200";
    return "text-zinc-600 bg-zinc-50 ring-zinc-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <HeartPulse className="w-10 h-10 animate-pulse text-blue-500" />
          <p className="text-sm font-bold tracking-widest uppercase">Loading Health Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-zinc-900 selection:bg-blue-100 flex flex-col">
      
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-600/20">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-extrabold text-xl tracking-tight">HealthSync <span className="text-zinc-300 font-normal mx-2">|</span> Patient Portal</h1>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 p-2 sm:px-4 sm:py-2.5 bg-white ring-1 ring-zinc-200 hover:bg-red-50 rounded-xl text-red-600 font-bold text-sm transition-colors">
            <span className="hidden sm:block">Sign Out</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10" />
            
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 ring-4 ring-white shadow-sm">
              <User className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-extrabold tracking-tight mb-1">{profile?.name}</h2>
            <p className="text-blue-600 font-bold text-sm mb-8 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Verified Patient
            </p>

            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center"><Hash className="w-4 h-4 text-zinc-400" /></div>
                <div><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Medical Record Number</p><p className="font-mono font-bold text-zinc-800">MRN-{String(profile?.mrn).padStart(4, '0')}</p></div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center"><User className="w-4 h-4 text-zinc-400" /></div>
                <div><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Demographics</p><p className="font-medium text-zinc-800">{profile?.age} Years Old • {profile?.gender}</p></div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center"><Mail className="w-4 h-4 text-zinc-400" /></div>
                <div><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email Address</p><p className="font-medium text-zinc-800">{profile?.email}</p></div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center"><Phone className="w-4 h-4 text-zinc-400" /></div>
                <div><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Phone Number</p><p className="font-medium text-zinc-800">{profile?.phone}</p></div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center"><MapPin className="w-4 h-4 text-zinc-400" /></div>
                <div><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Home Address</p><p className="font-medium text-zinc-800 line-clamp-1">{profile?.address}</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Medical History Timeline */}
        <div className="lg:col-span-8">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">My Clinical Visits</h2>
            <p className="text-zinc-500 font-medium">A secure record of your ER visits and clinical evaluations.</p>
          </div>

          {history.length === 0 ? (
            <div className="bg-white p-16 rounded-[2.5rem] text-center shadow-sm ring-1 ring-zinc-200/50 flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-blue-100">
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Past Visits</h3>
              <p className="text-zinc-500 font-medium">You have no recorded visits to the Emergency Room.</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 before:to-transparent">
              {history.map((enc, idx) => {
                const priority = enc.doctor_override || enc.triage_priority;
                
                return (
                  <div key={enc.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: `${idx * 100}ms`}}>
                    
                    {/* Timeline Dot */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-[#FDFDFD] bg-zinc-200 text-zinc-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
                      <Calendar className="w-5 h-5" />
                    </div>
                    
                    {/* Event Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white p-6 rounded-3xl shadow-sm ring-1 ring-zinc-200/60 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          {new Date(enc.created_at).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ring-1 ring-inset ${getPriorityColor(priority)}`}>
                          {priority} Priority
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-zinc-900 mb-2">Emergency Room Triage</h4>
                      
                      {/* THIS IS THE MAGIC: Displaying Layman's Terms instead of raw medical jargon! */}
                      <p className="text-sm text-zinc-600 font-medium leading-relaxed bg-zinc-50 p-4 rounded-2xl">
                        "{enc.laymans_terms || "Routine evaluation completed."}"
                      </p>
                      
                      {enc.doctor_override && (
                        <p className="mt-4 text-xs font-bold text-blue-600 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> Evaluated by Attending Physician
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}