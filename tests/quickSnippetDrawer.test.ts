import { describe, expect, it } from 'vitest';
import type { PersonalProfile } from '../shared/types.ts';
import { extractVaultItems } from '../src/components/profile/QuickSnippetDrawer.tsx';

const sampleProfile: PersonalProfile = {
  personal: {
    fullName: 'Alex Morgan',
    title: 'Senior Full-Stack Engineer',
    email: 'alex.morgan@example.com',
    phone: '+1 (555) 987-6543',
    location: 'San Francisco, CA',
    linkedIn: 'https://linkedin.com/in/alexmorgan',
    github: 'https://github.com/alexmorgan',
    portfolio: 'https://alexmorgan.dev',
    summary: 'Seasoned engineer specializing in TypeScript, React, and scalable cloud architectures.',
  },
  education: [
    {
      id: 'edu-1',
      degree: 'B.S.',
      institution: 'UC Berkeley',
      fieldOfStudy: 'Computer Science',
      graduationYear: '2020',
      gpa: '3.85',
      highlights: 'Dean’s Honor List, Teaching Assistant for Algorithms.',
    },
  ],
  experience: [
    {
      id: 'exp-1',
      role: 'Staff Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      startDate: '2021',
      endDate: 'Present',
      isCurrent: true,
      highlights: 'Led architecture of microservices handling 20M daily active requests.',
    },
  ],
  skills: {
    technical: ['TypeScript', 'Node.js', 'Go', 'Python'],
    frameworks: ['React', 'Next.js', 'TailwindCSS'],
    tools: ['Docker', 'Kubernetes', 'Git', 'AWS'],
    soft: ['Team Leadership', 'Mentorship', 'Technical Writing'],
  },
  projects: [
    {
      id: 'proj-1',
      title: 'Vibha Desktop AI',
      role: 'Lead Architect',
      techStack: ['Electron', 'React', 'TailwindCSS'],
      link: 'https://github.com/example/vibha',
      description: 'Desktop AI assistant with zero cloud lock-in.',
      highlights: 'Sub-50ms shortcut response, local credential vault.',
    },
  ],
  logistics: {
    workAuthorization: 'US Citizen, no sponsorship required',
    noticePeriod: '2 weeks',
    salaryExpectations: '$180,000 - $210,000 USD',
    relocation: 'Open to relocation for hybrid/onsite',
    remotePreference: 'Remote preferred or Hybrid',
    veteranStatus: 'Not a protected veteran',
    disabilityStatus: 'No disability',
  },
  snippets: [
    {
      id: 'snip-1',
      title: 'Conflict Resolution (STAR)',
      category: 'behavioral',
      content:
        'Situation: Two teams disagreed on API schema. Task: Mediate and establish consensus. Action: Led RFC discussion. Result: Standardized schema delivered 2 weeks early.',
      tags: ['star', 'conflict', 'behavioral'],
    },
  ],
  updatedAt: 1700000000000,
};

describe('QuickSnippetDrawer & extractVaultItems', () => {
  it('extracts all contact details into searchable items', () => {
    const items = extractVaultItems(sampleProfile);
    const contactItems = items.filter((i) => i.category === 'contact');

    expect(contactItems.length).toBe(9);
    expect(contactItems.find((i) => i.id === 'contact-name')?.value).toBe('Alex Morgan');
    expect(contactItems.find((i) => i.id === 'contact-email')?.value).toBe('alex.morgan@example.com');
    expect(contactItems.find((i) => i.id === 'contact-title')?.value).toBe('Senior Full-Stack Engineer');
    expect(contactItems.find((i) => i.id === 'contact-github')?.value).toBe('https://github.com/alexmorgan');
    expect(contactItems.find((i) => i.id === 'contact-portfolio')?.value).toBe('https://alexmorgan.dev');
  });

  it('extracts education, experience, and projects into work category', () => {
    const items = extractVaultItems(sampleProfile);
    const workItems = items.filter((i) => i.category === 'work');

    expect(workItems.length).toBe(3); // 1 exp + 1 edu + 1 proj
    expect(workItems.some((i) => i.id === 'exp-exp-1')).toBe(true);
    expect(workItems.some((i) => i.id === 'edu-edu-1')).toBe(true);
    expect(workItems.some((i) => i.id === 'proj-proj-1')).toBe(true);

    const expItem = workItems.find((i) => i.id === 'exp-exp-1')!;
    expect(expItem.title).toContain('Staff Engineer');
    expect(expItem.title).toContain('TechCorp');
    expect(expItem.value).toContain('microservices');
  });

  it('extracts skills lists formatted as comma-separated values', () => {
    const items = extractVaultItems(sampleProfile);
    const skillItems = items.filter((i) => i.category === 'skills');

    expect(skillItems.length).toBe(4);
    const techSkills = skillItems.find((i) => i.id === 'skills-tech')!;
    expect(techSkills.value).toBe('TypeScript, Node.js, Go, Python');
    expect(techSkills.badge).toBe('4 skills');

    const tools = skillItems.find((i) => i.id === 'skills-tools')!;
    expect(tools.value).toBe('Docker, Kubernetes, Git, AWS');
  });

  it('extracts logistics and behavioral snippets with badges', () => {
    const items = extractVaultItems(sampleProfile);
    const logisticsItems = items.filter((i) => i.category === 'logistics');
    expect(logisticsItems.length).toBe(7);

    const authItem = logisticsItems.find((i) => i.id === 'logistics-auth')!;
    expect(authItem.value).toBe('US Citizen, no sponsorship required');

    const snippetItems = items.filter((i) => i.category === 'snippets');
    expect(snippetItems.length).toBe(1);
    expect(snippetItems[0].title).toBe('Conflict Resolution (STAR)');
    expect(snippetItems[0].badge).toBe('behavioral');
    expect(snippetItems[0].subtitle).toBe('star, conflict, behavioral');
  });

  it('omits empty profile fields so users only see populated data', () => {
    const emptyProfile: PersonalProfile = {
      personal: {
        fullName: 'Jane',
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
        remotePreference: '',
      },
      snippets: [],
      updatedAt: Date.now(),
    };

    const items = extractVaultItems(emptyProfile);
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('contact-name');
    expect(items[0].value).toBe('Jane');
  });
});
