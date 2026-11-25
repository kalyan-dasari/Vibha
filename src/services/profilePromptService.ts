import type { PersonalProfile } from '../types/index.ts';

export const REFINEMENT_PROMPTS = {
  shorter:
    'Rewrite the previous answer to be more concise (under 100 words), preserving key metrics and accomplishments from my profile.',
  detailed:
    'Expand the previous answer with more concrete technical responsibilities, architecture decisions, and measurable outcomes from my profile.',
  formal:
    'Rewrite the previous answer with a formal, polished executive tone suitable for a senior leadership or enterprise job application.',
  star:
    'Restructure the previous answer into a clear STAR format (Situation, Task, Action, Result) using my verified experience.',
} as const;

export function countCharactersAndWords(text: string): { chars: number; words: number } {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  return { chars, words };
}

export function buildFormCopilotSystemPrompt(profile: PersonalProfile): string {
  const parts: string[] = [
    "You are Vibha, serving as the user's personal Form & Job Application Assistant.",
    'Your mission is to directly draft compelling, accurate, ready-to-paste answers for job application form fields, online questions, screening surveys, and behavioral interview prompts.',
    '',
    '=== USER VERIFIED CAREER & PERSONAL PROFILE ===',
  ];

  // 1. Personal & Contact
  const p = profile.personal;
  if (p) {
    const contactLines: string[] = [];
    if (p.fullName) contactLines.push(`- Full Name: ${p.fullName}`);
    if (p.title) contactLines.push(`- Professional Title: ${p.title}`);
    if (p.email) contactLines.push(`- Email: ${p.email}`);
    if (p.phone) contactLines.push(`- Phone: ${p.phone}`);
    if (p.location) contactLines.push(`- Location: ${p.location}`);
    if (p.linkedIn) contactLines.push(`- LinkedIn: ${p.linkedIn}`);
    if (p.github) contactLines.push(`- GitHub: ${p.github}`);
    if (p.portfolio) contactLines.push(`- Portfolio: ${p.portfolio}`);
    if (contactLines.length > 0) {
      parts.push('Contact & Identity:\n' + contactLines.join('\n'));
    }
    if (p.summary) {
      parts.push(`Executive Summary / Bio:\n${p.summary}`);
    }
  }

  // 2. Work Experience
  if (profile.experience && profile.experience.length > 0) {
    const expLines: string[] = [];
    for (const exp of profile.experience) {
      const dates = `${exp.startDate || ''} – ${exp.isCurrent ? 'Present' : exp.endDate || ''}`;
      expLines.push(
        `- ${exp.role || 'Role'} at ${exp.company || 'Company'} (${dates}${exp.location ? ', ' + exp.location : ''}):`
      );
      if (exp.highlights) {
        expLines.push(`  Highlights: ${exp.highlights}`);
      }
    }
    parts.push('Work Experience:\n' + expLines.join('\n'));
  }

  // 3. Education
  if (profile.education && profile.education.length > 0) {
    const eduLines: string[] = [];
    for (const edu of profile.education) {
      eduLines.push(
        `- ${edu.degree || 'Degree'} in ${edu.fieldOfStudy || 'Field'} from ${edu.institution || 'School'} (${edu.graduationYear || 'N/A'})${
          edu.gpa ? ' [GPA: ' + edu.gpa + ']' : ''
        }`
      );
      if (edu.highlights) {
        eduLines.push(`  Highlights: ${edu.highlights}`);
      }
    }
    parts.push('Education:\n' + eduLines.join('\n'));
  }

  // 4. Skills
  const s = profile.skills;
  if (s) {
    const skillLines: string[] = [];
    if (s.technical && s.technical.length > 0) {
      skillLines.push(`- Technical & Languages: ${s.technical.join(', ')}`);
    }
    if (s.frameworks && s.frameworks.length > 0) {
      skillLines.push(`- Frameworks & Libraries: ${s.frameworks.join(', ')}`);
    }
    if (s.tools && s.tools.length > 0) {
      skillLines.push(`- Tools & Platforms: ${s.tools.join(', ')}`);
    }
    if (s.soft && s.soft.length > 0) {
      skillLines.push(`- Soft Skills & Leadership: ${s.soft.join(', ')}`);
    }
    if (skillLines.length > 0) {
      parts.push('Skills & Competencies:\n' + skillLines.join('\n'));
    }
  }

  // 5. Projects
  if (profile.projects && profile.projects.length > 0) {
    const projLines: string[] = [];
    for (const proj of profile.projects) {
      projLines.push(
        `- ${proj.title}${proj.role ? ' (' + proj.role + ')' : ''} [Stack: ${proj.techStack?.join(', ') || 'N/A'}]:`
      );
      if (proj.description) projLines.push(`  Description: ${proj.description}`);
      if (proj.highlights) projLines.push(`  Highlights: ${proj.highlights}`);
      if (proj.link) projLines.push(`  URL: ${proj.link}`);
    }
    parts.push('Key Projects:\n' + projLines.join('\n'));
  }

  // 6. Logistics
  const l = profile.logistics;
  if (l) {
    const logLines: string[] = [];
    if (l.workAuthorization) logLines.push(`- Work Authorization: ${l.workAuthorization}`);
    if (l.noticePeriod) logLines.push(`- Notice Period: ${l.noticePeriod}`);
    if (l.salaryExpectations) logLines.push(`- Salary Expectations: ${l.salaryExpectations}`);
    if (l.remotePreference) logLines.push(`- Work Preference: ${l.remotePreference}`);
    if (l.relocation) logLines.push(`- Relocation: ${l.relocation}`);
    if (l.veteranStatus) logLines.push(`- Veteran Status: ${l.veteranStatus}`);
    if (l.disabilityStatus) logLines.push(`- Disability Disclosure: ${l.disabilityStatus}`);
    if (logLines.length > 0) {
      parts.push('Application Logistics & Preferences:\n' + logLines.join('\n'));
    }
  }

  // 7. Snippets & Custom Q&A Stories
  if (profile.snippets && profile.snippets.length > 0) {
    const snipLines: string[] = [];
    for (const snip of profile.snippets) {
      snipLines.push(`[${snip.title}] (${snip.category}):\n${snip.content}`);
    }
    parts.push('STAR Stories & Custom Q&A Bank:\n' + snipLines.join('\n\n'));
  }

  parts.push(
    '',
    '=== INSTRUCTIONS FOR ANSWER GENERATION ===',
    '1. WRITE AS THE APPLICANT: Respond directly in the first person ("I", "my") as the applicant.',
    '2. FACTUAL FIDELITY: Strictly draw from the user\'s verified career history above. NEVER fabricate companies, degrees, metrics, or years of experience.',
    '3. STRICT CONSTRAINTS: If a screenshot or prompt mentions a character limit (e.g., "Max 500 characters", "Limit 1000 chars") or word limit (e.g., "150 words"), adhere to it strictly. Never exceed stated limits.',
    '4. NO CONVERSATIONAL FLUFF: Do not output meta-commentary like "Here is your response:" or "Hope this helps!". Jump directly into the clean, copy-pasteable answer.',
    '5. IMPACT-DRIVEN: Use active verbs, clear structure, and focus on concrete actions and business impact.'
  );

  return parts.join('\n');
}
