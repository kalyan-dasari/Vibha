import React, { useState } from 'react';
import {
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderGit2,
  GraduationCap,
  Info,
  Layers,
  MessageSquare,
  Plus,
  Save,
  Trash2,
  User,
  Wrench,
} from 'lucide-react';
import type {
  PersonalProfile,
  ProfileEducation,
  ProfileExperience,
  ProfileProject,
  ProfileSnippet,
} from '../../types/index.ts';
import { useProfile } from '../../hooks/useProfile.ts';

type ProfileSectionId =
  | 'personal'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'logistics'
  | 'snippets';

export const ProfileSettingsView: React.FC = () => {
  const { profile, loading, saving, saveProfile } = useProfile();
  const [draft, setDraft] = useState<PersonalProfile>(profile);
  const [activeSection, setActiveSection] = useState<ProfileSectionId>('personal');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync draft when loaded profile arrives
  React.useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const copyToClipboard = async (text: string, key: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    setSaveSuccess(false);
    const res = await saveProfile(draft);
    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  // Helper updaters
  const updatePersonal = (field: keyof PersonalProfile['personal'], val: string) => {
    setDraft((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: val },
    }));
  };

  const updateLogistics = (field: keyof PersonalProfile['logistics'], val: string) => {
    setDraft((prev) => ({
      ...prev,
      logistics: { ...prev.logistics, [field]: val },
    }));
  };

  // Skills tag manipulation
  const addSkillTag = (category: keyof PersonalProfile['skills'], tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setDraft((prev) => {
      const existing = prev.skills[category] || [];
      if (existing.includes(trimmed)) return prev;
      return {
        ...prev,
        skills: { ...prev.skills, [category]: [...existing, trimmed] },
      };
    });
  };

  const removeSkillTag = (category: keyof PersonalProfile['skills'], tag: string) => {
    setDraft((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: prev.skills[category].filter((t) => t !== tag),
      },
    }));
  };

  // Education list
  const addEducation = () => {
    const newEdu: ProfileEducation = {
      id: `edu-${Date.now()}`,
      degree: '',
      institution: '',
      fieldOfStudy: '',
      graduationYear: '',
      gpa: '',
      highlights: '',
    };
    setDraft((prev) => ({ ...prev, education: [newEdu, ...prev.education] }));
  };

  const updateEducationItem = (id: string, updates: Partial<ProfileEducation>) => {
    setDraft((prev) => ({
      ...prev,
      education: prev.education.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  };

  const removeEducationItem = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      education: prev.education.filter((e) => e.id !== id),
    }));
  };

  // Experience list
  const addExperience = () => {
    const newExp: ProfileExperience = {
      id: `exp-${Date.now()}`,
      role: '',
      company: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      highlights: '',
    };
    setDraft((prev) => ({ ...prev, experience: [newExp, ...prev.experience] }));
  };

  const updateExperienceItem = (id: string, updates: Partial<ProfileExperience>) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  };

  const removeExperienceItem = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.filter((e) => e.id !== id),
    }));
  };

  // Projects list
  const addProject = () => {
    const newProj: ProfileProject = {
      id: `proj-${Date.now()}`,
      title: '',
      role: '',
      techStack: [],
      link: '',
      description: '',
      highlights: '',
    };
    setDraft((prev) => ({ ...prev, projects: [newProj, ...prev.projects] }));
  };

  const updateProjectItem = (id: string, updates: Partial<ProfileProject>) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  };

  const removeProjectItem = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
  };

  // Snippets list
  const addSnippet = () => {
    const newSnip: ProfileSnippet = {
      id: `snip-${Date.now()}`,
      title: 'New Reusable Answer',
      category: 'general',
      content: '',
      tags: [],
    };
    setDraft((prev) => ({ ...prev, snippets: [newSnip, ...prev.snippets] }));
  };

  const updateSnippetItem = (id: string, updates: Partial<ProfileSnippet>) => {
    setDraft((prev) => ({
      ...prev,
      snippets: prev.snippets.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  };

  const removeSnippetItem = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      snippets: prev.snippets.filter((s) => s.id !== id),
    }));
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-400">
        Loading personal vault...
      </div>
    );
  }

  const sections: { id: ProfileSectionId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'personal', label: 'Contact', icon: User },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Layers },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'logistics', label: 'Logistics', icon: Wrench },
    { id: 'snippets', label: 'Snippets', icon: MessageSquare },
  ];

  return (
    <div className="space-y-3.5">
      {/* Top Banner & Save Action */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 dark:border-sky-400/20 dark:bg-sky-500/10">
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-4 w-4 shrink-0 text-sky-500" />
          <p className="truncate text-[11px] leading-tight text-slate-600 dark:text-slate-300">
            Personal vault for quick copying & autofilling job application forms.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-sky-500 active:scale-95 disabled:opacity-50"
        >
          {saveSuccess ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Save className="h-3.5 w-3.5" />}
          <span>{saveSuccess ? 'Saved!' : saving ? 'Saving...' : 'Save Profile'}</span>
        </button>
      </div>

      {/* Sub-navigation Pills */}
      <div className="floating-scroll flex items-center gap-1 overflow-x-auto pb-1">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300 font-semibold'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: Personal & Contact */}
      {activeSection === 'personal' && (
        <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white/50 p-3 backdrop-blur-xs dark:border-white/8 dark:bg-[#121822]">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={draft.personal.fullName}
                  onChange={(e) => updatePersonal('fullName', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy Name"
                  onClick={() => copyToClipboard(draft.personal.fullName, 'fullName')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'fullName' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Professional Title
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Senior Full-Stack Engineer"
                  value={draft.personal.title}
                  onChange={(e) => updatePersonal('title', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy Title"
                  onClick={() => copyToClipboard(draft.personal.title, 'title')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'title' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="alex.morgan@example.com"
                  value={draft.personal.email}
                  onChange={(e) => updatePersonal('email', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy Email"
                  onClick={() => copyToClipboard(draft.personal.email, 'email')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'email' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="+1 (555) 019-2834"
                  value={draft.personal.phone}
                  onChange={(e) => updatePersonal('phone', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy Phone"
                  onClick={() => copyToClipboard(draft.personal.phone, 'phone')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'phone' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Location (City, State / Country)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="San Francisco, CA / Remote"
                  value={draft.personal.location}
                  onChange={(e) => updatePersonal('location', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy Location"
                  onClick={() => copyToClipboard(draft.personal.location, 'location')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'location' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                LinkedIn Profile URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={draft.personal.linkedIn}
                  onChange={(e) => updatePersonal('linkedIn', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy LinkedIn"
                  onClick={() => copyToClipboard(draft.personal.linkedIn, 'linkedIn')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'linkedIn' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                GitHub URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={draft.personal.github}
                  onChange={(e) => updatePersonal('github', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy GitHub"
                  onClick={() => copyToClipboard(draft.personal.github, 'github')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'github' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Portfolio / Website URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://alexmorgan.dev"
                  value={draft.personal.portfolio}
                  onChange={(e) => updatePersonal('portfolio', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy Portfolio"
                  onClick={() => copyToClipboard(draft.personal.portfolio, 'portfolio')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'portfolio' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Professional Summary / Bio
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(draft.personal.summary, 'summary')}
                className="inline-flex items-center gap-1 text-[10px] text-sky-500 hover:underline"
              >
                {copiedKey === 'summary' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>Copy Summary</span>
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Brief summary of your background, years of experience, and key specialties..."
              value={draft.personal.summary}
              onChange={(e) => updatePersonal('summary', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs leading-relaxed text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
            />
          </div>
        </div>
      )}

      {/* SECTION 2: Work Experience */}
      {activeSection === 'experience' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Work History & Positions ({draft.experience.length})
            </span>
            <button
              type="button"
              onClick={addExperience}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-600 hover:bg-sky-500/20 dark:text-sky-400"
            >
              <Plus className="h-3 w-3" />
              <span>Add Role</span>
            </button>
          </div>

          {draft.experience.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-white/10">
              No work experience added yet. Click &quot;Add Role&quot; above.
            </div>
          ) : (
            draft.experience.map((exp, idx) => (
              <div
                key={exp.id}
                className="space-y-2 rounded-xl border border-slate-200/80 bg-white/50 p-3 dark:border-white/8 dark:bg-[#121822]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    Role #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Copy Role Details"
                      onClick={() =>
                        copyToClipboard(
                          `${exp.role} at ${exp.company} (${exp.startDate} - ${exp.isCurrent ? 'Present' : exp.endDate})\n${exp.highlights}`,
                          `exp-${exp.id}`
                        )
                      }
                      className="text-slate-400 hover:text-sky-500"
                    >
                      {copiedKey === `exp-${exp.id}` ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExperienceItem(exp.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Job Title (e.g. Senior Frontend Dev)"
                    value={exp.role}
                    onChange={(e) => updateExperienceItem(exp.id, { role: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                  />
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={exp.company}
                    onChange={(e) => updateExperienceItem(exp.id, { company: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                  />
                  <input
                    type="text"
                    placeholder="Start Date (e.g. Jan 2022)"
                    value={exp.startDate}
                    onChange={(e) => updateExperienceItem(exp.id, { startDate: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                  />
                  <input
                    type="text"
                    placeholder={exp.isCurrent ? 'Present' : 'End Date (e.g. Present)'}
                    value={exp.endDate}
                    onChange={(e) => updateExperienceItem(exp.id, { endDate: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                  />
                </div>

                <textarea
                  rows={2}
                  placeholder="Responsibilities & Key Achievements (bullet points with metrics)..."
                  value={exp.highlights}
                  onChange={(e) => updateExperienceItem(exp.id, { highlights: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs leading-relaxed text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION 3: Education */}
      {activeSection === 'education' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Degrees & Certifications ({draft.education.length})
            </span>
            <button
              type="button"
              onClick={addEducation}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-600 hover:bg-sky-500/20 dark:text-sky-400"
            >
              <Plus className="h-3 w-3" />
              <span>Add Degree</span>
            </button>
          </div>

          {draft.education.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-white/10">
              No education listed. Click &quot;Add Degree&quot; to add your university or certifications.
            </div>
          ) : (
            draft.education.map((edu, idx) => (
              <div
                key={edu.id}
                className="space-y-2 rounded-xl border border-slate-200/80 bg-white/50 p-3 dark:border-white/8 dark:bg-[#121822]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    Degree #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Copy Education"
                      onClick={() =>
                        copyToClipboard(
                          `${edu.degree} in ${edu.fieldOfStudy}, ${edu.institution} (${edu.graduationYear})`,
                          `edu-${edu.id}`
                        )
                      }
                      className="text-slate-400 hover:text-sky-500"
                    >
                      {copiedKey === `edu-${edu.id}` ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEducationItem(edu.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Degree (e.g. B.S. Computer Science)"
                    value={edu.degree}
                    onChange={(e) => updateEducationItem(edu.id, { degree: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                  />
                  <input
                    type="text"
                    placeholder="Institution / University"
                    value={edu.institution}
                    onChange={(e) => updateEducationItem(edu.id, { institution: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                  />
                  <input
                    type="text"
                    placeholder="Field of Study / Major"
                    value={edu.fieldOfStudy}
                    onChange={(e) => updateEducationItem(edu.id, { fieldOfStudy: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                  />
                  <input
                    type="text"
                    placeholder="Graduation Year (e.g. 2024)"
                    value={edu.graduationYear}
                    onChange={(e) => updateEducationItem(edu.id, { graduationYear: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION 4: Skills */}
      {activeSection === 'skills' && (
        <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white/50 p-3 dark:border-white/8 dark:bg-[#121822]">
          {(
            [
              { key: 'technical', label: 'Technical Languages & Core Skills', placeholder: 'Add language (e.g. TypeScript, Python, Go)...' },
              { key: 'frameworks', label: 'Frameworks & Libraries', placeholder: 'Add framework (e.g. React, Next.js, Node.js)...' },
              { key: 'tools', label: 'Developer Tools & Cloud Infrastructure', placeholder: 'Add tool (e.g. Docker, AWS, Git, Postgres)...' },
              { key: 'soft', label: 'Key Methodologies & Competencies', placeholder: 'Add skill (e.g. System Design, Agile, Mentorship)...' },
            ] as const
          ).map((cat) => {
            const tags = draft.skills[cat.key] || [];
            return (
              <div key={cat.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    {cat.label}
                  </label>
                  <button
                    type="button"
                    title="Copy all tags in category"
                    onClick={() => copyToClipboard(tags.join(', '), `skills-${cat.key}`)}
                    className="text-[10px] text-sky-500 hover:underline"
                  >
                    {copiedKey === `skills-${cat.key}` ? 'Copied' : 'Copy All'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-[#0B0F17]">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-white/10 dark:text-slate-200"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeSkillTag(cat.key, tag)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={tags.length === 0 ? cat.placeholder : '+ tag'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const val = e.currentTarget.value.replace(/,/g, '');
                        addSkillTag(cat.key, val);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="min-w-[80px] flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION 5: Projects */}
      {activeSection === 'projects' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Key Projects & Portfolio Work ({draft.projects.length})
            </span>
            <button
              type="button"
              onClick={addProject}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-600 hover:bg-sky-500/20 dark:text-sky-400"
            >
              <Plus className="h-3 w-3" />
              <span>Add Project</span>
            </button>
          </div>

          {draft.projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-white/10">
              No projects added. Add key projects to quickly supply project descriptions during applications.
            </div>
          ) : (
            draft.projects.map((proj, idx) => (
              <div
                key={proj.id}
                className="space-y-2 rounded-xl border border-slate-200/80 bg-white/50 p-3 dark:border-white/8 dark:bg-[#121822]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    Project #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Copy Project"
                      onClick={() =>
                        copyToClipboard(
                          `${proj.title}\n${proj.description}\nLink: ${proj.link ?? ''}`,
                          `proj-${proj.id}`
                        )
                      }
                      className="text-slate-400 hover:text-sky-500"
                    >
                      {copiedKey === `proj-${proj.id}` ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProjectItem(proj.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Project Title"
                    value={proj.title}
                    onChange={(e) => updateProjectItem(proj.id, { title: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                  />
                  <input
                    type="url"
                    placeholder="Repository / Demo URL"
                    value={proj.link ?? ''}
                    onChange={(e) => updateProjectItem(proj.id, { link: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                  />
                </div>

                <textarea
                  rows={2}
                  placeholder="Problem solved, architecture, and impact..."
                  value={proj.description}
                  onChange={(e) => updateProjectItem(proj.id, { description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs leading-relaxed text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION 6: Logistics & Common Form Questions */}
      {activeSection === 'logistics' && (
        <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white/50 p-3 dark:border-white/8 dark:bg-[#121822]">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Work Authorization
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Authorized to work in US without sponsorship"
                  value={draft.logistics.workAuthorization}
                  onChange={(e) => updateLogistics('workAuthorization', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy Work Authorization"
                  onClick={() => copyToClipboard(draft.logistics.workAuthorization, 'workAuth')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'workAuth' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Notice Period
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 2 weeks / Immediate"
                  value={draft.logistics.noticePeriod}
                  onChange={(e) => updateLogistics('noticePeriod', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy Notice Period"
                  onClick={() => copyToClipboard(draft.logistics.noticePeriod, 'noticePeriod')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'noticePeriod' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Salary Expectations
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. $130,000 - $150,000 / year (Negotiable)"
                  value={draft.logistics.salaryExpectations}
                  onChange={(e) => updateLogistics('salaryExpectations', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy Salary Expectation"
                  onClick={() => copyToClipboard(draft.logistics.salaryExpectations, 'salary')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'salary' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Relocation & Remote
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Open to Remote / Hybrid / Relocation"
                  value={draft.logistics.relocation}
                  onChange={(e) => updateLogistics('relocation', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-7 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
                />
                <button
                  type="button"
                  title="Copy Relocation"
                  onClick={() => copyToClipboard(draft.logistics.relocation, 'relocation')}
                  className="absolute right-1.5 top-2 text-slate-400 hover:text-sky-500"
                >
                  {copiedKey === 'relocation' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: Custom Q&A Snippets */}
      {activeSection === 'snippets' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Reusable Q&A & Stories ({draft.snippets.length})
            </span>
            <button
              type="button"
              onClick={addSnippet}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-600 hover:bg-sky-500/20 dark:text-sky-400"
            >
              <Plus className="h-3 w-3" />
              <span>Add Snippet</span>
            </button>
          </div>

          {draft.snippets.map((snip) => (
            <div
              key={snip.id}
              className="space-y-2 rounded-xl border border-slate-200/80 bg-white/50 p-3 dark:border-white/8 dark:bg-[#121822]"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={snip.title}
                  onChange={(e) => updateSnippetItem(snip.id, { title: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-200"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Copy Answer"
                    onClick={() => copyToClipboard(snip.content, `snip-${snip.id}`)}
                    className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 hover:bg-sky-500/20 dark:text-sky-400"
                  >
                    {copiedKey === `snip-${snip.id}` ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSnippetItem(snip.id)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Write your reusable answer here..."
                value={snip.content}
                onChange={(e) => updateSnippetItem(snip.id, { content: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs leading-relaxed text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0B0F17] dark:text-slate-100"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
