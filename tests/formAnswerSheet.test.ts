import { describe, expect, it } from 'vitest';
import {
  formatAllAnswersForClipboard,
  MULTI_QUESTION_FORM_PROMPT,
  parseFormAnswerSheet,
} from '../src/services/profilePromptService.ts';

describe('FormAnswerSheet & Multi-Question Form Parsing', () => {
  const sampleAnswerSheetMarkdown = `
### Q1: Why are you interested in this software engineering position?
**Limit:** Max 500 characters
**Answer:**
I have closely followed your team's contributions to distributed cloud databases. With 6 years architecting high-throughput Go and Kubernetes microservices handling 20M daily queries, I am excited to scale your data layer while maintaining high availability.

---

### Q2: Describe a challenging technical bug you diagnosed and solved.
**Limit:** 200 words
**Answer:**
During Black Friday, our primary Kubernetes payment API experienced connection pool exhaustion under sudden 4x traffic spikes. I led the incident response, identified leaked Redis sockets in the auth middleware, deployed a hotfix in 8 minutes, and added proactive Grafana alerting, ensuring zero lost transactions.

---

### Q3: What is your work authorization status and notice period?
**Answer:**
I am a US Citizen authorized to work for any employer without sponsorship, and my standard notice period is 2 weeks.
`;

  it('correctly parses 3 structured questions and answers from markdown', () => {
    const cards = parseFormAnswerSheet(sampleAnswerSheetMarkdown);

    expect(cards).not.toBeNull();
    expect(cards?.length).toBe(3);

    // Q1
    const q1 = cards![0];
    expect(q1.index).toBe(1);
    expect(q1.question).toBe('Why are you interested in this software engineering position?');
    expect(q1.limit).toBe('Max 500 characters');
    expect(q1.answer).toContain('I have closely followed your team');
    expect(q1.chars).toBeGreaterThan(100);
    expect(q1.words).toBeGreaterThan(20);

    // Q2
    const q2 = cards![1];
    expect(q2.index).toBe(2);
    expect(q2.question).toBe('Describe a challenging technical bug you diagnosed and solved.');
    expect(q2.limit).toBe('200 words');
    expect(q2.answer).toContain('Black Friday');
    expect(q2.answer).toContain('zero lost transactions');

    // Q3
    const q3 = cards![2];
    expect(q3.index).toBe(3);
    expect(q3.question).toBe('What is your work authorization status and notice period?');
    expect(q3.limit).toBeUndefined();
    expect(q3.answer).toContain('US Citizen');
    expect(q3.answer).toContain('2 weeks');
  });

  it('supports alternative question prefixes (e.g. Question 1, 1.)', () => {
    const altMarkdown = `
### Question 1: What are your primary technical skills?
**Limit:** None
Over the past 5 years, my core focus has been TypeScript, React, Node.js, and Docker.

---

### Question 2: What are your compensation expectations?
**Answer:**
My target salary range is $180,000 to $210,000 USD base, negotiable depending on equity and benefits.
`;

    const cards = parseFormAnswerSheet(altMarkdown);
    expect(cards).not.toBeNull();
    expect(cards?.length).toBe(2);
    expect(cards![0].question).toBe('What are your primary technical skills?');
    expect(cards![1].question).toBe('What are your compensation expectations?');
    expect(cards![1].answer).toContain('$180,000 to $210,000 USD');
  });

  it('returns null for regular non-form conversational text or single answers', () => {
    const conversational = 'Here is how you can configure a Docker container with React and Vite:\n```bash\nnpm run build\n```';
    expect(parseFormAnswerSheet(conversational)).toBeNull();

    const singleQ = '### Q1: Tell me about yourself.\nI am a software engineer with 5 years experience.';
    expect(parseFormAnswerSheet(singleQ)).toBeNull(); // Minimum 2 for sheet mode

    expect(parseFormAnswerSheet('')).toBeNull();
  });

  it('formats all answers cleanly into a composite clipboard text', () => {
    const cards = parseFormAnswerSheet(sampleAnswerSheetMarkdown)!;
    const compositeText = formatAllAnswersForClipboard(cards);

    expect(compositeText).toContain('Q1: Why are you interested in this software engineering position? (Max 500 characters)');
    expect(compositeText).toContain('Q2: Describe a challenging technical bug you diagnosed and solved. (200 words)');
    expect(compositeText).toContain('Q3: What is your work authorization status and notice period?');
    expect(compositeText).toContain('US Citizen');
  });

  it('has a descriptive multi-question prompt template', () => {
    expect(MULTI_QUESTION_FORM_PROMPT).toContain('Parse this job application form page');
    expect(MULTI_QUESTION_FORM_PROMPT).toContain('Form Answer Sheet');
    expect(MULTI_QUESTION_FORM_PROMPT).toContain('verified profile');
  });
});
