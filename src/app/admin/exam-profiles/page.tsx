"use client";

import { useState, useEffect, useRef } from "react";
import type { ExamProfile } from "@/types/exam-profile";

type StatusFilter = "all" | "draft" | "reviewed" | "published";

export default function AdminExamProfilesPage() {
  const [profiles, setProfiles] = useState<ExamProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedProfile, setSelectedProfile] = useState<ExamProfile | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchExamName, setResearchExamName] = useState("");
  const [researchSuccess, setResearchSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch profiles on load and filter change
  useEffect(() => {
    fetchProfiles();
  }, [statusFilter]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = statusFilter === "all" 
        ? "/api/admin/exam-profiles"
        : `/api/admin/exam-profiles?status=${statusFilter}`;
        
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch profiles");
      }
      
      setProfiles(data.profiles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profiles");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResearchByName = async () => {
    if (!researchExamName.trim()) return;
    
    setIsResearching(true);
    setError(null);
    setResearchSuccess(null);
    
    try {
      const response = await fetch("/api/admin/exam-profiles/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_name: researchExamName,
          exam_input: researchExamName,
          is_pdf_upload: false,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Research failed");
      }
      
      setResearchSuccess(`Successfully created profile for "${researchExamName}"`);
      setResearchExamName("");
      await fetchProfiles(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setIsResearching(false);
    }
  };

  const handleResearchByPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    
    if (!file) return;
    
    setIsResearching(true);
    setError(null);
    setResearchSuccess(null);
    
    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      
      const examName = file.name.replace(/\.pdf$/i, "");
      
      const response = await fetch("/api/admin/exam-profiles/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_name: examName,
          exam_input: base64,
          is_pdf_upload: true,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Research failed");
      }
      
      setResearchSuccess(`Successfully created profile from "${file.name}"`);
      await fetchProfiles(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setIsResearching(false);
    }
  };

  const handleUpdateProfile = async (profileId: string, updates: Partial<ExamProfile>) => {
    try {
      const response = await fetch(`/api/admin/exam-profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Update failed");
      }
      
      // Update local state
      setProfiles(profiles.map(p => p.id === profileId ? data.profile : p));
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(data.profile);
      }
      
      setResearchSuccess("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm("Are you sure you want to delete this profile?")) return;
    
    try {
      const response = await fetch(`/api/admin/exam-profiles/${profileId}`, {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Delete failed");
      }
      
      setProfiles(profiles.filter(p => p.id !== profileId));
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(null);
      }
      
      setResearchSuccess("Profile deleted successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-slate-100 text-slate-700";
      case "reviewed": return "bg-amber-100 text-amber-700";
      case "published": return "bg-emerald-100 text-emerald-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-soft backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Admin Tool</p>
              <h1 className="mt-1 text-2xl font-bold md:text-3xl">Exam Profile Research Agent</h1>
            </div>
            <div className="rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
              Internal Use Only
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          {/* Left Panel - Research & List */}
          <aside className="space-y-6">
            {/* Research Panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <h2 className="text-lg font-semibold">Research New Exam</h2>
              
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    By Exam Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={researchExamName}
                      onChange={(e) => setResearchExamName(e.target.value)}
                      type="text"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      placeholder="e.g., SAT, Cambridge IGCSE Biology"
                      disabled={isResearching}
                    />
                    <button
                      onClick={handleResearchByName}
                      disabled={isResearching || !researchExamName.trim()}
                      className="rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-400"
                    >
                      {isResearching ? "..." : "Go"}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Or Upload Specification PDF
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleResearchByPdf}
                    disabled={isResearching}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isResearching}
                    className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-medium text-slate-700 hover:border-sky-400 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isResearching ? "Processing PDF..." : "Choose PDF file"}
                  </button>
                </div>
              </div>
            </div>

            {/* Profiles List */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Exam Profiles</h2>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="published">Published</option>
                </select>
              </div>

              {loading ? (
                <div className="flex min-h-[200px] items-center justify-center text-slate-500">
                  Loading profiles...
                </div>
              ) : profiles.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center text-slate-500">
                  No profiles found
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedProfile?.id === profile.id
                          ? "border-sky-500 bg-sky-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{profile.exam_name}</p>
                          <p className="text-xs text-slate-500">{profile.board} • {profile.level}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(profile.status)}`}>
                          {profile.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Right Panel - Profile Details */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            {error ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {researchSuccess ? (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                {researchSuccess}
              </div>
            ) : null}

            {!selectedProfile ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center text-slate-500">
                <p className="text-lg font-medium">Select a profile to view details</p>
                <p className="mt-2 text-sm">Or research a new exam to get started</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedProfile.exam_name}</h2>
                    <p className="mt-1 text-slate-600">{selectedProfile.board} • {selectedProfile.level}</p>
                    {selectedProfile.subject && (
                      <p className="text-sm text-slate-500">Subject: {selectedProfile.subject}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${getStatusColor(selectedProfile.status)}`}>
                      {selectedProfile.status}
                    </span>
                    <button
                      onClick={() => handleDeleteProfile(selectedProfile.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedProfile.overall_duration_minutes && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase text-slate-500">Duration</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {selectedProfile.overall_duration_minutes} min
                      </p>
                    </div>
                  )}
                  {selectedProfile.total_marks && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase text-slate-500">Total Marks</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {selectedProfile.total_marks}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Management */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Change Status</p>
                  <div className="flex gap-2">
                    {["draft", "reviewed", "published"].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleUpdateProfile(selectedProfile.id, { status: status as any })}
                        disabled={selectedProfile.status === status}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
                          selectedProfile.status === status
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                            : "bg-white border border-slate-200 hover:border-sky-400"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sections */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Sections</h3>
                  <div className="space-y-3">
                    {selectedProfile.sections.map((section, index) => (
                      <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-slate-900">{section.name}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {section.question_types.map((type) => (
                                <span key={type} className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                                  {type.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right text-sm text-slate-600">
                            {section.time_minutes && <p>{section.time_minutes} min</p>}
                            {section.marks_available && <p>{section.marks_available} marks</p>}
                            {section.number_of_questions && <p>{section.number_of_questions} questions</p>}
                          </div>
                        </div>
                        {section.style_notes && (
                          <p className="mt-3 text-sm text-slate-600">{section.style_notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Style Notes */}
                {selectedProfile.style_notes_general && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">General Style Notes</h3>
                    <p className="text-slate-600">{selectedProfile.style_notes_general}</p>
                  </div>
                )}

                {/* Sources */}
                {selectedProfile.sources && selectedProfile.sources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Sources</h3>
                    <ul className="space-y-1">
                      {selectedProfile.sources.map((source, index) => (
                        <li key={index} className="text-sm text-slate-600 break-all">
                          {source}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Confidence Flags */}
                {selectedProfile.confidence_flags && selectedProfile.confidence_flags.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h3 className="text-sm font-semibold text-amber-800 mb-2">⚠️ Needs Manual Review</h3>
                    <ul className="space-y-1">
                      {selectedProfile.confidence_flags.map((flag, index) => (
                        <li key={index} className="text-sm text-amber-700">
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Editable Fields */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Quick Edit</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Exam Name</label>
                      <input
                        type="text"
                        value={selectedProfile.exam_name}
                        onChange={(e) => {
                          const updated = { ...selectedProfile, exam_name: e.target.value };
                          setSelectedProfile(updated);
                        }}
                        onBlur={() => handleUpdateProfile(selectedProfile.id, { exam_name: selectedProfile.exam_name })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Board</label>
                      <input
                        type="text"
                        value={selectedProfile.board}
                        onChange={(e) => {
                          const updated = { ...selectedProfile, board: e.target.value };
                          setSelectedProfile(updated);
                        }}
                        onBlur={() => handleUpdateProfile(selectedProfile.id, { board: selectedProfile.board })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
