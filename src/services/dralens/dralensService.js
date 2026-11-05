import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/urls';
import { findKnowledgeBaseMatch } from './valensKnowledgeBase';

// Primary backend endpoint provided by backend team
export const DRALENS_BACKEND_BASE = 'http://192.168.1.15:8081/api/v1';

/**
 * Helper to build auth headers with current token
 */
async function getHeaders() {
  const headers = {
    accept: '*/*',
    'Content-Type': 'application/json',
  };
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // Ignore storage error
  }
  return headers;
}

/**
 * Normalizes backend responses whether structured or markdown/plain text
 */
function parseAiResponse(data) {
  if (!data) return null;
  const payload = data.data || data;

  // Case 1: Already structured with steps array
  if (Array.isArray(payload.steps) && payload.steps.length > 0) {
    return {
      intro: payload.intro || payload.message || payload.reply || '',
      steps: payload.steps,
      outro: payload.outro || '',
    };
  }

  const rawText =
    payload.intro ||
    payload.message ||
    payload.reply ||
    payload.response ||
    (typeof payload === 'string' ? payload : '');

  if (!rawText) return null;

  // Case 2: Parse numbered steps from markdown / plain text
  const stepRegex = /^\s*(\d+)[\.\)]\s*(.+)$/gm;
  const matches = [...rawText.matchAll(stepRegex)];

  if (matches.length >= 2) {
    const firstStepIndex = rawText.indexOf(matches[0][0]);
    const intro = rawText.substring(0, firstStepIndex).trim();
    const lastMatch = matches[matches.length - 1];
    const lastStepEnd = rawText.indexOf(lastMatch[0]) + lastMatch[0].length;
    const outro = rawText.substring(lastStepEnd).trim();
    const steps = matches.map((m) => m[2].trim());
    return {
      intro: intro || 'Here are the steps:',
      steps,
      outro,
    };
  }

  // Case 3: Plain conversational text
  return { intro: rawText };
}

/**
 * Fetches initial welcome message and suggestions from the backend.
 * GET /api/v1/dralens-chat/welcome
 *
 * @returns {Promise<{ message?: string, suggestions?: Array<string|object> } | null>}
 */
export async function getDralensWelcome() {
  const endpoints = [
    `${DRALENS_BACKEND_BASE}/dralens-chat/welcome`,
    `${BASE_URL}/api/v1/dralens-chat/welcome`,
  ];

  const headers = await getHeaders();

  for (const url of endpoints) {
    try {
      const response = await axios.get(url, {
        headers,
        timeout: 4000,
      });

      if (response?.data) {
        const payload = response.data.data || response.data;
        return {
          message:
            payload.message ||
            payload.welcomeMessage ||
            payload.intro ||
            payload.greeting,
          suggestions:
            payload.suggestions ||
            payload.quickPrompts ||
            payload.questions ||
            payload.prompts,
        };
      }
    } catch (err) {
      // Try next endpoint or fallback
    }
  }

  return null;
}

/**
 * Sends a message and history to Dralens AI backend.
 * POST /api/v1/dralens-chat
 *
 * @param {string} userMessage - User query
 * @param {Array} history - Previous messages
 * @returns {Promise<{ intro: string, steps?: string[], outro?: string }>}
 */
export async function askDralensAi(userMessage, history = []) {
  const trimmed = userMessage?.trim();
  if (!trimmed) {
    return {
      intro: 'Hi! How can I help you today with Valens?',
    };
  }

  // Format history matching backend schema: [{ role: 'user'|'assistant', content: string }]
  const formattedHistory = (history || [])
    .slice(-6)
    .filter((m) => m && (m.text || m.intro || m.content))
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text || m.intro || m.content || '',
    }));

  const headers = await getHeaders();

  const endpoints = [
    `${DRALENS_BACKEND_BASE}/dralens-chat`,
    `${BASE_URL}/api/v1/dralens-chat`,
  ];

  // 1. Try Backend POST endpoints
  for (const url of endpoints) {
    try {
      const response = await axios.post(
        url,
        {
          message: trimmed,
          history: formattedHistory,
        },
        {
          headers,
          timeout: 8000,
        }
      );

      const parsed = parseAiResponse(response?.data);
      if (parsed && (parsed.intro || parsed.steps)) {
        return parsed;
      }
    } catch (err) {
      // Endpoint error / network down — try next or fallback
    }
  }

  // 2. Grounded Fallback via verified local Knowledge Base
  const kbMatch = findKnowledgeBaseMatch(trimmed);
  if (kbMatch) {
    return {
      intro: kbMatch.intro,
      steps: kbMatch.steps,
      outro: kbMatch.outro,
    };
  }

  // 3. Fallback when unknown
  return {
    intro:
      "I'm here to help you navigate and use everything inside the Valens app!\n\n" +
      'You can ask me about:\n' +
      '• Connecting PagBank or Stripe payouts\n' +
      '• Posting Missions & buying credits\n' +
      '• Selling items in My Closet\n' +
      '• Creating Services or publishing Ebooks\n' +
      '• Color Together battles & Private Circle',
    steps: [
      'Type your question or choose one of the suggested topics above',
      'If you have an account issue, you can also reach out to Support in Settings > Help Center',
    ],
  };
}
