import { useCallback, useEffect, useState } from 'react';
import type {
  PersonalProfile,
  ProfileEducation,
  ProfileExperience,
  ProfileProject,
  ProfileSnippet,
} from '../types/index.ts';
import { getBridge } from '../services/electronBridge.ts';

export const INITIAL_EMPTY_PROFILE: PersonalProfile = {
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
      content: 'Authorized to work for any employer without sponsorship.',
      tags: ['authorization', 'visa', 'legal'],
    },
  ],
  updatedAt: Date.now(),
};

export function useProfile() {
  const [profile, setProfile] = useState<PersonalProfile>(INITIAL_EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const bridge = getBridge();
    setLoading(true);
    setError(null);
    try {
      if (bridge?.profile) {
        const loaded = await bridge.profile.get();
        setProfile(loaded);
      } else {
        // Fallback for browser preview environment
        const local = localStorage.getItem('vibha_profile_mock');
        if (local) {
          try {
            setProfile(JSON.parse(local));
          } catch {
            setProfile(INITIAL_EMPTY_PROFILE);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const saveProfile = useCallback(
    async (partial: Partial<PersonalProfile>): Promise<{ ok: boolean; error?: string }> => {
      const bridge = getBridge();
      setSaving(true);
      setError(null);
      try {
        if (bridge?.profile) {
          const res = await bridge.profile.update(partial);
          if (res.ok) {
            setProfile(res.profile);
            return { ok: true };
          }
          setError(res.error ?? 'Failed to update profile.');
          return { ok: false, error: res.error };
        } else {
          // Browser preview mock persistence
          const next = { ...profile, ...partial, updatedAt: Date.now() };
          setProfile(next);
          localStorage.setItem('vibha_profile_mock', JSON.stringify(next));
          return { ok: true };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unexpected save error.';
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setSaving(false);
      }
    },
    [profile]
  );

  return {
    profile,
    loading,
    saving,
    error,
    refreshProfile: loadProfile,
    saveProfile,
  };
}
