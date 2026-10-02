"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Shield, Users, CheckCircle2, AlertOctagon, Hash, MapPin, Phone, GraduationCap, Stethoscope, Copy, Mail, BarChart3, Download, Activity, AlertTriangle, BookOpen, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

export default function AdminPortal() {
  const router = useRouter();

  useEffect(() => {
    if (sessionStorage.getItem("hospital_role") !== "admin") router.replace("/");
  }, [router]);

  // Tab State
  const [activeTab, setActiveTab] = useState<"registration" | "analytics" | "directory">("registration");

  // ==========================================
  // REGISTRATION STATE & LOGIC
  // ==========================================
  const [role, setRole] = useState("doctor");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Unspecified");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [specialization, setSpecialization] = useState("");

  const [loadingReg, setLoadingReg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCreds, setGeneratedCreds] = useState<{username: string, password: string} | null>(null);

  const getAgeLimits = () => {
    if (role === "doctor") return { min: 24, max: 75 };
    if (role === "nurse") return { min: 21, max: 70 };
    return { min: 1, max: 100 }; // patient
  };

  const validateInput = () => {
    if (!/^[a-zA-Z\s.-]{2,50}$/.test(name.trim())) return "Name must be 2-50 characters and contain only letters.";
    const parsedAge = parseInt(age);
    const limits = getAgeLimits();
    if (isNaN(parsedAge) || parsedAge < limits.min || parsedAge > limits.max) return `${role.charAt(0).toUpperCase() + role.slice(1)} age must be between ${limits.min} and ${limits.max}.`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email address.";
    if (!/^(?:\+91[-\s]?)?[6-9]\d{9}$/.test(phone.trim())) return "Please enter a valid 10-digit Indian phone number (e.g., +91 9876543210).";
    if (address.trim().length < 8) return "Please provide a complete physical address.";
    if (role === "doctor") {
      if (!qualifications) return "Please select a medical qualification from the dropdown.";
      if (!specialization) return "Please select a medical specialization from the dropdown.";
    }
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoadingReg(true); setError(null); setGeneratedCreds(null);
    const validationError = validateInput();
    if (validationError) { setError(validationError); setLoadingReg(false); return; }

    const payload = {
      role, name: name.trim(), age: parseInt(age), gender, email: email.trim().toLowerCase(),
      address: address.trim(), phone: phone.trim(),
      qualifications: role === "doctor" ? qualifications : undefined,
      specialization: role === "doctor" ? specialization : undefined
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedCreds(data.credentials);
        setName(""); setAge(""); setGender("Unspecified"); setEmail(""); setAddress(""); setPhone(""); setQualifications(""); setSpecialization("");
      } else setError(data.detail || "Server rejected the request.");
    } catch { setError("Connection error. Ensure backend server is running."); } 
    finally { setLoadingReg(false); }
  };

  // ==========================================
  // ANALYTICS STATE & LOGIC
  // ==========================================
  const [metrics, setMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    if (activeTab === "analytics") {
      setLoadingMetrics(true);
      fetch("http://127.0.0.1:8000/api/admin/metrics")
        .then(res => res.json())
        .then(data => { setMetrics(data); setLoadingMetrics(false); })
        .catch(err => { console.error(err); setLoadingMetrics(false); });
    }
  }, [activeTab]);

  const handleExportCSV = () => { window.location.href = "http://127.0.0.1:8000/api/admin/export"; };

  // ==========================================
  // DIRECTORY STATE & LOGIC (WITH AUDITING)
  // ==========================================
  const [directory, setDirectory] = useState<any[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  const fetchDirectory = () => {
    setLoadingDirectory(true);
    fetch("http://127.0.0.1:8000/api/admin/users")
      .then(res => res.json())
      .then(data => { setDirectory(data); setLoadingDirectory(false); })
      .catch(err => { console.error(err); setLoadingDirectory(false); });
  };

  useEffect(() => {
    if (activeTab === "directory") fetchDirectory();
  }, [activeTab]);

  const handleRevokeAccess = async (username: string) => {
    if (!window.confirm(`Are you sure you want to revoke network access for ${username}? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${username}`, { method: "DELETE" });
      if (res.ok) {
        // Remove user from the local state to instantly update the UI
        setDirectory(directory.filter(u => u.user_id !== username));
      } else {
        alert("Failed to revoke access.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("hospital_role");
    sessionStorage.removeItem("hospital_user");
    router.replace("/");
  };

  const pieData = metrics ? [
    { name: 'High Priority', value: metrics.distribution?.HIGH || 0, color: '#ef4444' },
    { name: 'Medium Priority', value: metrics.distribution?.MEDIUM || 0, color: '#f59e0b' },
    { name: 'Low Priority', value: metrics.distribution?.LOW || 0, color: '#10b981' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex font-sans text-zinc-900 selection:bg-blue-100">
      <aside className="w-20 lg:w-72 border-r border-zinc-200/60 bg-white/50 backdrop-blur-xl flex flex-col justify-between hidden sm:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-12 px-2">
            <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md"><Shield className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-xl tracking-tight hidden lg:block">SysAdmin</span>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setActiveTab("registration")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-all ${activeTab === "registration" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}>
              <Users className="w-5 h-5" />
              <span className="text-sm font-semibold hidden lg:block">System Registration</span>
            </button>
            <button onClick={() => setActiveTab("directory")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-all ${activeTab === "directory" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}>
              <BookOpen className="w-5 h-5" />
              <span className="text-sm font-semibold hidden lg:block">Network Directory</span>
            </button>
            <button onClick={() => setActiveTab("analytics")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-all ${activeTab === "analytics" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}>
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-semibold hidden lg:block">Safety Analytics</span>
            </button>
          </nav>
        </div>
        <div className="p-6">
          <button onClick={handleSignOut} className="group flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-xl w-full transition-all">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold hidden lg:block">Disconnect Session</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-12 overflow-y-auto flex flex-col items-center relative">
        <div className="w-full max-w-4xl bg-white p-10 lg:p-14 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50">
          
          {/* TAB 1: REGISTRATION */}
          {activeTab === "registration" && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <h2 className="text-3xl font-extrabold tracking-tight mb-2">Hospital Registration</h2>
              <p className="text-zinc-500 font-medium mb-10">Enter demographic details. The system will securely generate login credentials.</p>

              {generatedCreds && (
                <div className="mb-10 p-8 bg-emerald-50 rounded-3xl ring-1 ring-emerald-200 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-md"><CheckCircle2 className="w-6 h-6 text-white" /></div>
                    <div><h3 className="font-extrabold text-emerald-900 text-lg">Registration Successful</h3><p className="text-emerald-700 text-sm font-medium">Please securely share these credentials with the user.</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl ring-1 ring-emerald-100 shadow-sm flex justify-between items-center group">
                      <div><p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Generated User ID</p><p className="font-mono font-bold text-zinc-900 text-lg">{generatedCreds.username}</p></div>
                      <button onClick={() => navigator.clipboard.writeText(generatedCreds.username)} className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Copy className="w-4 h-4" /></button>
                    </div>
                    <div className="bg-white p-4 rounded-2xl ring-1 ring-emerald-100 shadow-sm flex justify-between items-center group">
                      <div><p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Generated Password</p><p className="font-mono font-bold text-zinc-900 text-lg">{generatedCreds.password}</p></div>
                      <button onClick={() => navigator.clipboard.writeText(generatedCreds.password)} className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <button onClick={() => setGeneratedCreds(null)} className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors">Register Another User</button>
                </div>
              )}

              {!generatedCreds && (
                <form onSubmit={handleRegister} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Select User Role</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full md:w-1/2 px-5 py-4 bg-zinc-50/50 hover:bg-zinc-50 border-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm font-bold transition-all outline-none cursor-pointer">
                      <option value="doctor">Attending Physician (Doctor)</option>
                      <option value="nurse">Triage Nurse</option>
                      <option value="patient">Hospital Patient</option>
                    </select>
                  </div>

                  <div className="pt-6 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-6 space-y-3"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Full Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-4 bg-zinc-50/50 hover:bg-zinc-50 ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm font-medium outline-none" placeholder="e.g. Dr. Robert Vance" /></div>
                    <div className="md:col-span-3 space-y-3"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Age</label><div className="relative group"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Hash className="h-4 w-4 text-zinc-400" /></div><input type="number" value={age} min={getAgeLimits().min} max={getAgeLimits().max} onChange={(e) => setAge(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-zinc-50/50 ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm font-medium outline-none" placeholder={`Min ${getAgeLimits().min}`} /></div></div>
                    <div className="md:col-span-3 space-y-3"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Gender</label><select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-4 py-4 bg-zinc-50/50 ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm font-medium outline-none cursor-pointer"><option>Unspecified</option><option>Male</option><option>Female</option><option>Other</option></select></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-6 space-y-3"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Email Address</label><div className="relative group"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-zinc-400" /></div><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-zinc-50/50 ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm font-medium outline-none" placeholder="user@hospital.org" /></div></div>
                    <div className="md:col-span-6 space-y-3"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Phone Number (IN)</label><div className="relative group"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-zinc-400" /></div><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-zinc-50/50 ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm font-medium outline-none" placeholder="+91 9876543210" /></div></div>
                  </div>

                  <div className="space-y-3"><label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Home Address</label><div className="relative group"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin className="h-4 w-4 text-zinc-400" /></div><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-zinc-50/50 ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm font-medium outline-none" placeholder="Full residential address" /></div></div>

                  {role === "doctor" && (
                    <div className="pt-6 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="space-y-3"><label className="text-[11px] font-bold text-blue-500 uppercase tracking-widest ml-1">Qualifications</label><div className="relative group"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><GraduationCap className="h-4 w-4 text-blue-400" /></div><select value={qualifications} onChange={(e) => setQualifications(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-blue-50/30 ring-1 ring-blue-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm font-medium outline-none cursor-pointer appearance-none"><option value="" disabled>Select Qualification...</option><option value="MBBS">MBBS</option><option value="MD">MD</option><option value="MS">MS</option><option value="DNB">DNB</option><option value="DO">DO</option></select></div></div>
                      <div className="space-y-3"><label className="text-[11px] font-bold text-blue-500 uppercase tracking-widest ml-1">Specialization</label><div className="relative group"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Stethoscope className="h-4 w-4 text-blue-400" /></div><select value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-blue-50/30 ring-1 ring-blue-200 focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm font-medium outline-none cursor-pointer appearance-none"><option value="" disabled>Select Specialization...</option><option value="Emergency Medicine">Emergency Medicine</option><option value="Internal Medicine">Internal Medicine</option><option value="Cardiology">Cardiology</option><option value="Neurology">Neurology</option><option value="Pediatrics">Pediatrics</option><option value="Orthopedics">Orthopedics</option><option value="General Surgery">General Surgery</option><option value="Psychiatry">Psychiatry</option></select></div></div>
                    </div>
                  )}

                  {error && <div className="flex items-center gap-3 p-5 rounded-2xl text-sm font-bold bg-red-50 text-red-700 ring-1 ring-red-200 animate-in fade-in slide-in-from-bottom-2"><AlertOctagon className="w-5 h-5 shrink-0" />{typeof error === 'string' ? error : JSON.stringify(error)}</div>}
                  <button type="submit" disabled={loadingReg} className="px-10 py-4 mt-4 bg-zinc-900 hover:bg-black active:scale-[0.98] text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(0,0,0,0.1)] disabled:opacity-50 tracking-wide text-sm flex items-center gap-2">
                    {loadingReg ? "Generating Credentials..." : "Generate Secure Account"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: NETWORK DIRECTORY */}
          {activeTab === "directory" && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <h2 className="text-3xl font-extrabold tracking-tight mb-2">Network Directory</h2>
              <p className="text-zinc-500 font-medium mb-10">View and audit all authenticated identities currently registered in the system.</p>

              {loadingDirectory ? (
                <div className="h-64 flex items-center justify-center text-zinc-400 font-medium animate-pulse">Fetching directory...</div>
              ) : (
                <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                      <tr>
                        <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">User ID</th>
                        <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Full Name</th>
                        <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Role</th>
                        <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {directory.map((user, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-zinc-900">{user.user_id}</td>
                          <td className="px-6 py-4 font-medium text-zinc-700">
                            {user.name}
                            <span className="block text-xs text-zinc-400 font-normal mt-0.5">{user.email}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest 
                              ${user.role === 'Doctor' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 
                                user.role === 'Nurse' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 
                                'bg-purple-50 text-purple-700 ring-1 ring-purple-200'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => handleRevokeAccess(user.user_id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                      {directory.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-400 font-medium">No users found in the system.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight mb-2">Safety Analytics</h2>
                  <p className="text-zinc-500 font-medium">Monitor AI triage efficiency and physician override rates.</p>
                </div>
                <button onClick={handleExportCSV} className="flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl ring-1 ring-blue-200 transition-colors text-sm">
                  <Download className="w-4 h-4" /> Export CSV Audit
                </button>
              </div>

              {loadingMetrics ? (
                <div className="h-64 flex items-center justify-center text-zinc-400 font-medium animate-pulse">Loading system metrics...</div>
              ) : metrics ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-zinc-50 rounded-3xl ring-1 ring-zinc-200"><div className="flex items-center gap-3 mb-4"><div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center"><Activity className="w-4 h-4 text-zinc-600" /></div><span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Triage</span></div><p className="text-4xl font-black text-zinc-900">{metrics.total}</p></div>
                    <div className="p-6 bg-amber-50 rounded-3xl ring-1 ring-amber-200"><div className="flex items-center gap-3 mb-4"><div className="w-8 h-8 rounded-full bg-amber-200/50 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-amber-700" /></div><span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Physician Overrides</span></div><p className="text-4xl font-black text-amber-900">{metrics.overrides}</p></div>
                    <div className="p-6 bg-indigo-50 rounded-3xl ring-1 ring-indigo-200"><div className="flex items-center gap-3 mb-4"><div className="w-8 h-8 rounded-full bg-indigo-200/50 flex items-center justify-center"><BarChart3 className="w-4 h-4 text-indigo-700" /></div><span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Override Rate</span></div><p className="text-4xl font-black text-indigo-900">{metrics.override_rate}%</p></div>
                  </div>

                  {metrics.total > 0 && (
                    <div className="p-8 bg-zinc-50 rounded-3xl ring-1 ring-zinc-200 flex flex-col md:flex-row items-center gap-10">
                      <div className="w-full md:w-1/2 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/2 space-y-4">
                        <h3 className="font-bold text-zinc-800 text-lg">Acuity Distribution</h3>
                        <p className="text-sm text-zinc-500 font-medium mb-6">Breakdown of AI-assigned triage priorities currently active or archived in the ER queue.</p>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm font-bold text-red-600"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"/> High Priority</span><span>{metrics.distribution.HIGH || 0}</span></div>
                          <div className="flex justify-between items-center text-sm font-bold text-amber-500"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"/> Medium Priority</span><span>{metrics.distribution.MEDIUM || 0}</span></div>
                          <div className="flex justify-between items-center text-sm font-bold text-emerald-500"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"/> Low Priority</span><span>{metrics.distribution.LOW || 0}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}