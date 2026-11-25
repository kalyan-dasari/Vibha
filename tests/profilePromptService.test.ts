import { describe, expect, it } from 'vitest';
import type { PersonalProfile } from '../shared/types.ts';
import { validateChatStreamRequest } from '../electron/services/security/validators.ts';
import {
  buildFormCopilotSystemPrompt,
  countCharactersAndWords,
  REFINEMENT_PROMPTS,
} from '../src/services/profilePromptService.ts';

const mockProfile: PersonalProfile = {
  personal: {
    fullName: 'Samantha Rivera',
    title: 'Senior DevOps & Cloud Architect',
    email: 'samantha@example.com',
    phone: '+1 (555) 345-6789',
    location: 'Austin, TX',
    linkedIn: 'https://linkedin.com/in/samantharivera',
    github: 'https://github.com/samantharivera',
    portfolio: 'https://rivera-cloud.dev',
    summary: 'Cloud architect with 8+ years designing zero-downtime Kubernetes clusters on AWS and GCP.',
  },
  education: [
    {
      id: 'edu-1',
      degree: 'B.S.',
      institution: 'University of Texas at Austin',
      fieldOfStudy: 'Electrical & Computer Engineering',
      graduationYear: '2016',
      gpa: '3.9',
      highlights: 'Summa Cum Laude, President of IEEE student chapter.',
    },
  ],
  experience: [
    {
      id: 'exp-1',
      role: 'Principal Infrastructure Engineer',
      company: 'ScaleScale Inc.',
      location: 'Austin, TX',
      startDate: '2020',
      endDate: 'Present',
      isCurrent: true,
      highlights: 'Reduced AWS infrastructure costs by 42% while improving P99 API latency from 450ms to 65ms.',
    },
  ],
  skills: {
    technical: ['Go', 'Python', 'Rust', 'Bash'],
    frameworks: ['Terraform', 'Pulumi', 'Ansible'],
    tools: ['Kubernetes', 'Docker', 'AWS', 'GCP', 'Prometheus', 'Grafana'],
    soft: ['Incident Response Leadership', 'Cross-Functional Collaboration'],
  },
  projects: [
    {
      id: 'proj-1',
      title: 'KubeAutoScaler',
      role: 'Author & Maintainer',
      techStack: ['Go', 'Kubernetes API', 'Helm'],
      link: 'https://github.com/example/kube-autoscaler',
      description: 'Open-source predictive autoscaler with 1.5k GitHub stars.',
      highlights: 'Adopted by 30+ enterprise engineering organizations.',
    },
  ],
  logistics: {
    workAuthorization: 'US Citizen, no sponsorship required',
    noticePeriod: '3 weeks',
    salaryExpectations: '$190,000 - $220,000 USD',
    remotePreference: 'Remote only or 1 day hybrid',
    relocation: 'Not open to relocation',
    veteranStatus: 'No',
    disabilityStatus: 'Decline to self-identify',
  },
  snippets: [
    {
      id: 'snip-1',
      title: 'Major Outage Incident Leadership',
      category: 'behavioral',
      content:
        'Situation: Core payment API went down during Black Friday. Task: Restore cluster traffic within 15 minutes. Action: Diagnosed connection pool exhaustion and applied hotfix. Result: Restored 100% traffic in 8 minutes with zero data loss.',
      tags: ['incident', 'star', 'leadership'],
    },
  ],
  updatedAt: 1700000000000,
};

describe('profilePromptService & Form Copilot', () => {
  it('builds system prompt containing all profile data and instructions', () => {
    const prompt = buildFormCopilotSystemPrompt(mockProfile);

    expect(prompt).toContain('Samantha Rivera');
    expect(prompt).toContain('Senior DevOps & Cloud Architect');
    expect(prompt).toContain('samantha@example.com');
    expect(prompt).toContain('ScaleScale Inc.');
    expect(prompt).toContain('Reduced AWS infrastructure costs by 42%');
    expect(prompt).toContain('University of Texas at Austin');
    expect(prompt).toContain('Go, Python, Rust, Bash');
    expect(prompt).toContain('KubeAutoScaler');
    expect(prompt).toContain('US Citizen, no sponsorship required');
    expect(prompt).toContain('Major Outage Incident Leadership');

    // Instructions verification
    expect(prompt).toContain('WRITE AS THE APPLICANT');
    expect(prompt).toContain('FACTUAL FIDELITY');
    expect(prompt).toContain('STRICT CONSTRAINTS');
    expect(prompt).toContain('NO CONVERSATIONAL FLUFF');
  });

  it('handles empty profile gracefully without throwing', () => {
    const emptyProfile: PersonalProfile = {
      personal: {
        fullName: '',
        title: '',
        email: '',
        phone: '',
        location: '',
        linkedIn: '',
        github: '',
        portfolio: '',
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

    const prompt = buildFormCopilotSystemPrompt(emptyProfile);
    expect(prompt).toBeDefined();
    expect(prompt).toContain('Vibha');
    expect(prompt).toContain('INSTRUCTIONS FOR ANSWER GENERATION');
  });

  it('accurately counts characters and words', () => {
    const text1 = 'Hello world, this is a test.';
    const counts1 = countCharactersAndWords(text1);
    expect(counts1.chars).toBe(28);
    expect(counts1.words).toBe(6);

    const text2 = '   Multiple    spaces   between   words.  \n\nNew line. ';
    const counts2 = countCharactersAndWords(text2);
    expect(counts2.words).toBe(6);

    const emptyCounts = countCharactersAndWords('');
    expect(emptyCounts.chars).toBe(0);
    expect(emptyCounts.words).toBe(0);
  });

  it('defines structured refinement prompts for tone and length', () => {
    expect(REFINEMENT_PROMPTS.shorter).toContain('100 words');
    expect(REFINEMENT_PROMPTS.detailed).toContain('technical responsibilities');
    expect(REFINEMENT_PROMPTS.formal).toContain('formal');
    expect(REFINEMENT_PROMPTS.star).toContain('STAR');
  });

  it('validates systemPrompt in validateChatStreamRequest', () => {
    const validPayload = {
      requestId: 'req-123',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Why should we hire you?' }],
      systemPrompt: 'You are Vibha.',
    };

    const res = validateChatStreamRequest(validPayload);
    expect(res.valid).toBe(true);
    expect(res.data?.systemPrompt).toBe('You are Vibha.');

    const oversizedPayload = {
      ...validPayload,
      systemPrompt: 'x'.repeat(60000), // > 50KB limit
    };
    const invalidRes = validateChatStreamRequest(oversizedPayload);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.error).toContain('Invalid system prompt');
  });
});
