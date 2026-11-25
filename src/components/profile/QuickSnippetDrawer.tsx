import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  Briefcase,
  Check,
  ClipboardList,
  Compass,
  Copy,
  ExternalLink,
  GraduationCap,
  Mail,
  Search,
  Settings,
  Sparkles,
  User,
  Wrench,
  X,
} from 'lucide-react';
import type { PersonalProfile } from '../../types/index.ts';
import { useProfile } from '../../hooks/useProfile.ts';

export type VaultCategory = 'all' | 'contact' | 'snippets' | 'work' | 'skills' | 'logistics';

export interface VaultItem {
  id: string;
  category: 'contact' | 'snippets' | 'work' | 'skills' | 'logistics';
  title: string;
  value: string;
  subtitle?: string;
  badge?: string;
}

interface QuickSnippetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfileSettings: () => void;
  onInsertIntoChat?: (text: string) => void;
}

export function extractVaultItems(profile: PersonalProfile): VaultItem[] {
  const items: VaultItem[] = [];

  // 1. Contact & Identity
  if (profile.personal.fullName) {
    items.push({
      id: 'contact-name',
      category: 'contact',
      title: 'Full Name',
      value: profile.personal.fullName,
    });
  }
  if (profile.personal.title) {
    items.push({
      id: 'contact-title',
      category: 'contact',
      title: 'Job / Professional Title',
      value: profile.personal.title,
    });
  }
  if (profile.personal.email) {
    items.push({
      id: 'contact-email',
      category: 'contact',
      title: 'Email Address',
      value: profile.personal.email,
    });
  }
  if (profile.personal.phone) {
    items.push({
      id: 'contact-phone',
      category: 'contact',
      title: 'Phone Number',
      value: profile.personal.phone,
    });
  }
  if (profile.personal.location) {
    items.push({
      id: 'contact-location',
      category: 'contact',
      title: 'Location / City',
      value: profile.personal.location,
    });
  }
  if (profile.personal.linkedIn) {
    items.push({
      id: 'contact-linkedin',
      category: 'contact',
      title: 'LinkedIn Profile',
      value: profile.personal.linkedIn,
    });
  }
  if (profile.personal.github) {
    items.push({
      id: 'contact-github',
      category: 'contact',
      title: 'GitHub Profile',
      value: profile.personal.github,
    });
  }
  if (profile.personal.portfolio) {
    items.push({
      id: 'contact-portfolio',
      category: 'contact',
      title: 'Portfolio / Website',
      value: profile.personal.portfolio,
    });
  }
  if (profile.personal.summary) {
    items.push({
      id: 'contact-summary',
      category: 'contact',
      title: 'Professional Summary',
      value: profile.personal.summary,
    });
  }

  // 2. Custom Q&A Snippets & STAR Stories
  for (const snippet of profile.snippets || []) {
    if (snippet.content) {
      items.push({
        id: `snippet-${snippet.id}`,
        category: 'snippets',
        title: snippet.title || 'Untitled Snippet',
        value: snippet.content,
        subtitle: snippet.tags && snippet.tags.length > 0 ? snippet.tags.join(', ') : undefined,
        badge: snippet.category,
      });
    }
  }

  // 3. Work Experience, Education & Projects
  for (const exp of profile.experience || []) {
    const dates = `${exp.startDate || ''} – ${exp.isCurrent ? 'Present' : exp.endDate || ''}`;
    const desc = exp.highlights || `${exp.role} at ${exp.company} (${dates})`;
    items.push({
      id: `exp-${exp.id}`,
      category: 'work',
      title: `${exp.role || 'Role'} @ ${exp.company || 'Company'}`,
      subtitle: `${dates}${exp.location ? ' · ' + exp.location : ''}`,
      value: desc,
      badge: 'Experience',
    });
  }

  for (const edu of profile.education || []) {
    const subtitle = `${edu.institution || ''}${edu.graduationYear ? ' (' + edu.graduationYear + ')' : ''}${
      edu.gpa ? ' · GPA: ' + edu.gpa : ''
    }`;
    const desc =
      edu.highlights || `${edu.degree || 'Degree'} in ${edu.fieldOfStudy || 'Field'} from ${edu.institution || 'School'}`;
    items.push({
      id: `edu-${edu.id}`,
      category: 'work',
      title: `${edu.degree || 'Degree'} · ${edu.fieldOfStudy || 'Study'}`,
      subtitle,
      value: desc,
      badge: 'Education',
    });
  }

  for (const proj of profile.projects || []) {
    const content = [
      proj.description,
      proj.highlights ? `Key highlights:\n${proj.highlights}` : '',
      proj.link ? `Link: ${proj.link}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    items.push({
      id: `proj-${proj.id}`,
      category: 'work',
      title: proj.title || 'Project',
      subtitle: proj.techStack && proj.techStack.length > 0 ? proj.techStack.join(', ') : undefined,
      value: content || proj.title,
      badge: 'Project',
    });
  }

  // 4. Skills
  if (profile.skills.technical && profile.skills.technical.length > 0) {
    items.push({
      id: 'skills-tech',
      category: 'skills',
      title: 'Technical & Programming Skills',
      value: profile.skills.technical.join(', '),
      badge: `${profile.skills.technical.length} skills`,
    });
  }
  if (profile.skills.frameworks && profile.skills.frameworks.length > 0) {
    items.push({
      id: 'skills-frameworks',
      category: 'skills',
      title: 'Frameworks & Libraries',
      value: profile.skills.frameworks.join(', '),
      badge: `${profile.skills.frameworks.length} frameworks`,
    });
  }
  if (profile.skills.tools && profile.skills.tools.length > 0) {
    items.push({
      id: 'skills-tools',
      category: 'skills',
      title: 'Developer Tools & Platforms',
      value: profile.skills.tools.join(', '),
      badge: `${profile.skills.tools.length} tools`,
    });
  }
  if (profile.skills.soft && profile.skills.soft.length > 0) {
    items.push({
      id: 'skills-soft',
      category: 'skills',
      title: 'Soft Skills & Leadership',
      value: profile.skills.soft.join(', '),
      badge: `${profile.skills.soft.length} skills`,
    });
  }

  // 5. Logistics
  if (profile.logistics.workAuthorization) {
    items.push({
      id: 'logistics-auth',
      category: 'logistics',
      title: 'Work Authorization',
      value: profile.logistics.workAuthorization,
    });
  }
  if (profile.logistics.noticePeriod) {
    items.push({
      id: 'logistics-notice',
      category: 'logistics',
      title: 'Notice Period / Availability',
      value: profile.logistics.noticePeriod,
    });
  }
  if (profile.logistics.salaryExpectations) {
    items.push({
      id: 'logistics-salary',
      category: 'logistics',
      title: 'Salary Expectations',
      value: profile.logistics.salaryExpectations,
    });
  }
  if (profile.logistics.remotePreference) {
    items.push({
      id: 'logistics-remote',
      category: 'logistics',
      title: 'Remote / Work Setup Preference',
      value: profile.logistics.remotePreference,
    });
  }
  if (profile.logistics.relocation) {
    items.push({
      id: 'logistics-relocation',
      category: 'logistics',
      title: 'Relocation Preference',
      value: profile.logistics.relocation,
    });
  }
  if (profile.logistics.veteranStatus) {
    items.push({
      id: 'logistics-veteran',
      category: 'logistics',
      title: 'Veteran Status',
      value: profile.logistics.veteranStatus,
    });
  }
  if (profile.logistics.disabilityStatus) {
    items.push({
      id: 'logistics-disability',
      category: 'logistics',
      title: 'Disability Disclosure',
      value: profile.logistics.disabilityStatus,
    });
  }

  return items;
}

const CATEGORY_TABS: Array<{ id: VaultCategory; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'contact', label: 'Contact', icon: User },
  { id: 'snippets', label: 'Snippets', icon: Sparkles },
  { id: 'work', label: 'Work & Edu', icon: Briefcase },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'logistics', label: 'Logistics', icon: Compass },
];

export const QuickSnippetDrawer: React.FC<QuickSnippetDrawerProps> = ({
  isOpen,
  onClose,
  onOpenProfileSettings,
  onInsertIntoChat,
}) => {
  const { profile } = useProfile();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VaultCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);

  // Close drawer on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const allItems = useMemo(() => extractVaultItems(profile), [profile]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.badge && item.badge.toLowerCase().includes(q))
      );
    });
  }, [allItems, selectedCategory, search]);

  const handleCopy = async (item: VaultItem) => {
    try {
      await navigator.clipboard.writeText(item.value);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleInsert = (item: VaultItem) => {
    if (onInsertIntoChat) {
      onInsertIntoChat(item.value);
      setInsertedId(item.id);
      setTimeout(() => setInsertedId(null), 1500);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Application Vault & Quick Snippets"
      className="absolute inset-0 z-30 flex flex-col bg-white/98 text-slate-900 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 dark:bg-[#0B0F17]/98 dark:text-slate-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 px-3.5 py-2.5 dark:border-white/8 bg-white/50 dark:bg-[#0B0F17]/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
            <ClipboardList className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Application Vault
              </h2>
              <span className="rounded-full bg-sky-500/15 px-1.5 py-0.2 text-[9px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                1-Click Copy
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Paste directly into forms or insert into chat
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close drawer (Esc)"
          aria-label="Close drawer"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="p-2.5 border-b border-slate-200/60 dark:border-white/6 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search details, skills, answers, links..."
            autoFocus
            className="w-full rounded-xl border border-slate-200/80 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500/60 focus:outline-none focus:ring-2 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder-slate-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="mt-2 flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/8'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Snippets / Items List */}
      <div className="floating-scroll flex-1 space-y-2 overflow-y-auto p-2.5">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <ClipboardList className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {search ? 'No matching details found' : 'No data in this section yet'}
            </p>
            <p className="mt-1 max-w-[240px] text-[11px] text-slate-500 dark:text-slate-400">
              {search
                ? `Try adjusting your search query or switch categories.`
                : 'Fill in your personal and career details in Profile Settings to unlock instant 1-click answers.'}
            </p>
            <button
              type="button"
              onClick={onOpenProfileSettings}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Configure in Profile Settings</span>
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCopied = copiedId === item.id;
            const isInserted = insertedId === item.id;
            const isMultiline = item.value.includes('\n') || item.value.length > 90;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col rounded-xl border border-slate-200/80 bg-white/90 p-2.5 shadow-xs transition-all hover:border-sky-500/40 hover:shadow-sm dark:border-white/8 dark:bg-slate-900/60 dark:hover:border-sky-400/30"
              >
                {/* Item Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.2 text-[9px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Actions: Copy & Insert buttons */}
                  <div className="flex shrink-0 items-center gap-1">
                    {onInsertIntoChat && (
                      <button
                        type="button"
                        onClick={() => handleInsert(item)}
                        title="Insert into chat prompt"
                        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-all ${
                          isInserted
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-700 dark:bg-white/8 dark:text-slate-300 dark:hover:bg-sky-900/40 dark:hover:text-sky-300'
                        }`}
                      >
                        {isInserted ? (
                          <>
                            <Check className="h-3 w-3 stroke-[2.5]" />
                            <span>Inserted!</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="h-3 w-3" />
                            <span>Insert</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopy(item)}
                      title="Copy to clipboard"
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 active:scale-95 shadow-xs'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3 stroke-[2.5]" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content preview */}
                <div className="mt-1.5">
                  <p
                    className={`text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-black/30 rounded-lg p-1.5 border border-slate-100 dark:border-white/5 break-words select-all ${
                      isMultiline ? 'max-h-24 overflow-y-auto floating-scroll whitespace-pre-wrap' : 'truncate'
                    }`}
                  >
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Navigation to Profile Settings */}
      <div className="flex items-center justify-between border-t border-slate-200/80 px-3.5 py-2 text-xs bg-slate-50/80 dark:border-white/8 dark:bg-white/[0.02]">
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} available
        </span>
        <button
          type="button"
          onClick={onOpenProfileSettings}
          className="flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
        >
          <Settings className="h-3 w-3" />
          <span>Edit Full Profile in Settings</span>
        </button>
      </div>
    </div>
  );
};
