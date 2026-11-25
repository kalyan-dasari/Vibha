import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PERSONAL_PROFILE,
  ProfileService,
  sanitizePersonalProfile,
} from '../electron/services/profile/profileService.ts';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'floating-ai-prof-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('ProfileService', () => {
  it('initializes with default starter template and writes profile.json to disk', () => {
    const dir = createTempDir();
    const service = new ProfileService(dir);

    const profile = service.getProfile();
    expect(profile).toBeDefined();
    expect(profile.personal.fullName).toBe('');
    expect(profile.snippets.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(dir, 'profile.json'))).toBe(true);
  });

  it('updates personal details, skills, and logistics and persists to disk', () => {
    const dir = createTempDir();
    const service = new ProfileService(dir);

    const updateRes = service.updateProfile({
      personal: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1 (555) 123-4567',
        location: 'Seattle, WA',
        linkedIn: 'https://linkedin.com/in/janedoe',
        github: 'https://github.com/janedoe',
        portfolio: 'https://janedoe.dev',
        title: 'Principal AI Architect',
        summary: 'Expert in desktop AI systems and LLM pipelines.',
      },
      skills: {
        technical: ['TypeScript', 'Rust', 'Python'],
        frameworks: ['React', 'Electron', 'TailwindCSS'],
        tools: ['Docker', 'Git'],
        soft: ['Leadership', 'System Design'],
      },
      logistics: {
        workAuthorization: 'US Citizen',
        noticePeriod: '2 weeks',
        salaryExpectations: '$160k - $180k',
        relocation: 'Remote Only',
        remotePreference: '100% Remote',
      },
    });

    expect(updateRes.ok).toBe(true);
    expect(updateRes.profile.personal.fullName).toBe('Jane Doe');
    expect(updateRes.profile.skills.technical).toEqual(['TypeScript', 'Rust', 'Python']);
    expect(updateRes.profile.logistics.workAuthorization).toBe('US Citizen');

    // Reload from disk with a fresh service instance
    const freshService = new ProfileService(dir);
    const reloaded = freshService.getProfile();
    expect(reloaded.personal.fullName).toBe('Jane Doe');
    expect(reloaded.personal.email).toBe('jane@example.com');
    expect(reloaded.skills.technical).toEqual(['TypeScript', 'Rust', 'Python']);
    expect(reloaded.logistics.workAuthorization).toBe('US Citizen');
  });

  it('supports adding and updating education, experience, and projects', () => {
    const dir = createTempDir();
    const service = new ProfileService(dir);

    const updateRes = service.updateProfile({
      education: [
        {
          id: 'edu-1',
          degree: 'B.S. Computer Science',
          institution: 'University of Washington',
          fieldOfStudy: 'Computer Science',
          graduationYear: '2022',
          gpa: '3.9',
        },
      ],
      experience: [
        {
          id: 'exp-1',
          role: 'Full Stack Engineer',
          company: 'Acme Corp',
          startDate: '2022',
          endDate: 'Present',
          isCurrent: true,
          highlights: 'Architected high-throughput message bus.',
        },
      ],
      projects: [
        {
          id: 'proj-1',
          title: 'Vibha AI',
          role: 'Lead Developer',
          techStack: ['Electron', 'React', 'TailwindCSS'],
          description: 'Floating desktop assistant.',
        },
      ],
    });

    expect(updateRes.ok).toBe(true);
    expect(updateRes.profile.education).toHaveLength(1);
    expect(updateRes.profile.education[0].degree).toBe('B.S. Computer Science');
    expect(updateRes.profile.experience[0].company).toBe('Acme Corp');
    expect(updateRes.profile.projects[0].title).toBe('Vibha AI');
  });

  it('safely handles malformed and partial inputs without corrupting data', () => {
    const sanitized = sanitizePersonalProfile(null, DEFAULT_PERSONAL_PROFILE);
    expect(sanitized).toEqual(DEFAULT_PERSONAL_PROFILE);

    const partial = sanitizePersonalProfile(
      {
        personal: {
          fullName: 'Test User',
          // other fields missing
        } as unknown as typeof DEFAULT_PERSONAL_PROFILE.personal,
        skills: {
          technical: ['TypeScript', 123 as unknown as string, '  React  '],
        } as unknown as typeof DEFAULT_PERSONAL_PROFILE.skills,
      },
      DEFAULT_PERSONAL_PROFILE
    );

    expect(partial.personal.fullName).toBe('Test User');
    expect(partial.skills.technical).toEqual(['TypeScript', 'React']);
  });
});
