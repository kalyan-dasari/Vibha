import fs from 'node:fs';
import path from 'node:path';
import type {
  PersonalProfile,
  ProfileEducation,
  ProfileExperience,
  ProfileLogistics,
  ProfilePersonal,
  ProfileProject,
  ProfileSkills,
  ProfileSnippet,
} from '../../../shared/types.ts';

export const DEFAULT_PERSONAL_PROFILE: PersonalProfile = {
  personal: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    github: '',
    portfolio: '',
    title: '',
    summary: '',
  },
  education: [],
  experience: [],
  skills: {
    technical: [],
    frameworks: [],
    tools: [],
    soft: [],
  },
  projects: [],
  logistics: {
    workAuthorization: '',
    noticePeriod: '',
    salaryExpectations: '',
    relocation: '',
    remotePreference: 'Open to Remote / Hybrid',
    veteranStatus: '',
    disabilityStatus: '',
  },
  snippets: [
    {
      id: 'snippet-elevator-pitch',
      title: 'Elevator Pitch / Short Bio',
      category: 'bio',
      content:
        'Passionate software engineer focused on building robust, intuitive, and high-performance applications. Experienced across modern frontend frameworks, backend architecture, and AI integration.',
      tags: ['bio', 'intro', 'summary'],
    },
    {
      id: 'snippet-work-auth',
      title: 'Work Authorization Statement',
      category: 'general',
      content:
        'Authorized to work for any employer without sponsorship.',
      tags: ['authorization', 'visa', 'legal'],
    },
    {
      id: 'snippet-challenging-project',
      title: 'Challenging Problem / STAR Story',
      category: 'behavioral',
      content:
        'Situation: In our core platform, latency escalated during traffic spikes. Task: Identify the bottleneck and optimize the query pipeline. Action: Profiled API calls, introduced intelligent caching, and restructured indexing. Result: Reduced p99 response times by 65% with zero downtime.',
      tags: ['star', 'problem-solving', 'impact'],
    },
  ],
  updatedAt: Date.now(),
};

function sanitizeString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback;
}

function sanitizeStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
}

export function sanitizePersonalProfile(input: unknown, current: PersonalProfile): PersonalProfile {
  if (!input || typeof input !== 'object') {
    return structuredClone(current);
  }

  const raw = input as Partial<PersonalProfile>;

  // Personal section
  const rawPersonal = (raw.personal && typeof raw.personal === 'object') ? raw.personal : {};
  const personal: ProfilePersonal = {
    fullName: sanitizeString(rawPersonal.fullName, current.personal.fullName),
    email: sanitizeString(rawPersonal.email, current.personal.email),
    phone: sanitizeString(rawPersonal.phone, current.personal.phone),
    location: sanitizeString(rawPersonal.location, current.personal.location),
    linkedIn: sanitizeString(rawPersonal.linkedIn, current.personal.linkedIn),
    github: sanitizeString(rawPersonal.github, current.personal.github),
    portfolio: sanitizeString(rawPersonal.portfolio, current.personal.portfolio),
    title: sanitizeString(rawPersonal.title, current.personal.title),
    summary: sanitizeString(rawPersonal.summary, current.personal.summary),
  };

  // Education array
  const rawEducation = Array.isArray(raw.education) ? raw.education : current.education;
  const education: ProfileEducation[] = rawEducation.map((edu, idx) => ({
    id: sanitizeString(edu?.id, `edu-${idx + 1}-${Date.now()}`),
    degree: sanitizeString(edu?.degree),
    institution: sanitizeString(edu?.institution),
    fieldOfStudy: sanitizeString(edu?.fieldOfStudy),
    graduationYear: sanitizeString(edu?.graduationYear),
    gpa: edu?.gpa ? sanitizeString(edu.gpa) : undefined,
    highlights: edu?.highlights ? sanitizeString(edu.highlights) : undefined,
  }));

  // Experience array
  const rawExperience = Array.isArray(raw.experience) ? raw.experience : current.experience;
  const experience: ProfileExperience[] = rawExperience.map((exp, idx) => ({
    id: sanitizeString(exp?.id, `exp-${idx + 1}-${Date.now()}`),
    role: sanitizeString(exp?.role),
    company: sanitizeString(exp?.company),
    location: exp?.location ? sanitizeString(exp.location) : undefined,
    startDate: sanitizeString(exp?.startDate),
    endDate: sanitizeString(exp?.endDate),
    isCurrent: Boolean(exp?.isCurrent),
    highlights: sanitizeString(exp?.highlights),
  }));

  // Skills
  const rawSkills = (raw.skills && typeof raw.skills === 'object') ? raw.skills : {};
  const skills: ProfileSkills = {
    technical: sanitizeStringArray(rawSkills.technical ?? current.skills.technical),
    frameworks: sanitizeStringArray(rawSkills.frameworks ?? current.skills.frameworks),
    tools: sanitizeStringArray(rawSkills.tools ?? current.skills.tools),
    soft: sanitizeStringArray(rawSkills.soft ?? current.skills.soft),
  };

  // Projects
  const rawProjects = Array.isArray(raw.projects) ? raw.projects : current.projects;
  const projects: ProfileProject[] = rawProjects.map((p, idx) => ({
    id: sanitizeString(p?.id, `proj-${idx + 1}-${Date.now()}`),
    title: sanitizeString(p?.title),
    role: p?.role ? sanitizeString(p.role) : undefined,
    techStack: sanitizeStringArray(p?.techStack),
    link: p?.link ? sanitizeString(p.link) : undefined,
    description: sanitizeString(p?.description),
    highlights: p?.highlights ? sanitizeString(p.highlights) : undefined,
  }));

  // Logistics
  const rawLogistics = (raw.logistics && typeof raw.logistics === 'object') ? raw.logistics : {};
  const logistics: ProfileLogistics = {
    workAuthorization: sanitizeString(rawLogistics.workAuthorization, current.logistics.workAuthorization),
    noticePeriod: sanitizeString(rawLogistics.noticePeriod, current.logistics.noticePeriod),
    salaryExpectations: sanitizeString(rawLogistics.salaryExpectations, current.logistics.salaryExpectations),
    relocation: sanitizeString(rawLogistics.relocation, current.logistics.relocation),
    remotePreference: sanitizeString(rawLogistics.remotePreference, current.logistics.remotePreference),
    veteranStatus: rawLogistics.veteranStatus ? sanitizeString(rawLogistics.veteranStatus) : undefined,
    disabilityStatus: rawLogistics.disabilityStatus ? sanitizeString(rawLogistics.disabilityStatus) : undefined,
  };

  // Snippets
  const rawSnippets = Array.isArray(raw.snippets) ? raw.snippets : current.snippets;
  const snippets: ProfileSnippet[] = rawSnippets.map((s, idx) => ({
    id: sanitizeString(s?.id, `snip-${idx + 1}-${Date.now()}`),
    title: sanitizeString(s?.title, 'Untitled Snippet'),
    category: (['behavioral', 'bio', 'general', 'qa'].includes(s?.category)
      ? s.category
      : 'general') as ProfileSnippet['category'],
    content: sanitizeString(s?.content),
    tags: sanitizeStringArray(s?.tags),
  }));

  return {
    personal,
    education,
    experience,
    skills,
    projects,
    logistics,
    snippets,
    updatedAt: Date.now(),
  };
}

export class ProfileService {
  private readonly filePath: string;
  private cache: PersonalProfile;

  constructor(userDataDir: string) {
    this.filePath = path.join(userDataDir, 'profile.json');
    this.cache = this.loadFromDisk();
  }

  getProfile(): PersonalProfile {
    return structuredClone(this.cache);
  }

  updateProfile(partial: unknown): { ok: boolean; profile: PersonalProfile; error?: string } {
    try {
      this.cache = sanitizePersonalProfile(partial, this.cache);
      this.writeToDisk(this.cache);
      return { ok: true, profile: this.getProfile() };
    } catch (err) {
      return {
        ok: false,
        profile: this.getProfile(),
        error: err instanceof Error ? err.message : 'Failed to save profile.',
      };
    }
  }

  private loadFromDisk(): PersonalProfile {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        return sanitizePersonalProfile(parsed, DEFAULT_PERSONAL_PROFILE);
      }
    } catch {
      // Disk read/parse failure, fall back to default
    }

    const initial = structuredClone(DEFAULT_PERSONAL_PROFILE);
    this.writeToDisk(initial);
    return initial;
  }

  private writeToDisk(profile: PersonalProfile): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${this.filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(profile, null, 2), 'utf8');
    fs.renameSync(tempPath, this.filePath);
  }
}
