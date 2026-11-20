import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, AI_API_URL } from '../../config/urls';
import { findKnowledgeBaseMatch, isStaticQuestionMatch } from './valensKnowledgeBase';

/**
 * Backend endpoints provided for Dralens AI chat:
 * 1. GET  /api/v1/dralens-chat/welcome
 * 2. POST /api/v1/dralens-chat
 */
export const DRALENS_BACKEND_BASE = AI_API_URL;

// Candidate endpoints in priority order
const BACKEND_CANDIDATES = [
  AI_API_URL,
  'https://dev-ai.valens.app/api/v1',
  'https://dev-ai.valens.app',
];

let activeBaseUrl = BACKEND_CANDIDATES[0];

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
    // Ignore storage read error
  }
  return headers;
}

/**
 * Normalizes backend responses whether structured JSON or markdown/plain text
 */
function parseAiResponse(data) {
  if (!data) return null;
  console.log('[Dralens AI] parseAiResponse raw input:', JSON.stringify(data));
  const payload = data.data || data;

  // Case 1: Already structured with steps array
  if (Array.isArray(payload.steps) && payload.steps.length > 0) {
    const result = {
      intro: payload.intro || payload.message || payload.reply || payload.reply_text || '',
      steps: payload.steps,
      outro: payload.outro || '',
    };
    console.log('[Dralens AI] parseAiResponse matched Case 1 (structured steps):', result);
    return result;
  }

  const rawText =
    payload.intro ||
    payload.message ||
    payload.reply ||
    payload.reply_text ||
    payload.response ||
    payload.answer ||
    payload.result ||
    payload.content ||
    payload.text ||
    (typeof payload === 'string' ? payload : '');

  if (!rawText) {
    console.warn('[Dralens AI] parseAiResponse could not extract raw text from payload:', payload);
    return null;
  }

  // Case 2: Parse numbered steps from markdown / plain text (e.g. "1. Step one\n2. Step two")
  const stepRegex = /^\s*(\d+)[\.\)]\s*(.+)$/gm;
  const matches = [...rawText.matchAll(stepRegex)];

  if (matches.length >= 2) {
    const firstStepIndex = rawText.indexOf(matches[0][0]);
    const intro = rawText.substring(0, firstStepIndex).trim();
    const lastMatch = matches[matches.length - 1];
    const lastStepEnd = rawText.indexOf(lastMatch[0]) + lastMatch[0].length;
    const outro = rawText.substring(lastStepEnd).trim();
    const steps = matches.map((m) => m[2].trim());
    const result = {
      intro: intro || 'Here are the steps:',
      steps,
      outro,
    };
    console.log('[Dralens AI] parseAiResponse matched Case 2 (parsed numbered steps):', result);
    return result;
  }

  // Case 3: Plain conversational text
  const result = { intro: rawText };
  console.log('[Dralens AI] parseAiResponse matched Case 3 (plain text):', result);
  return result;
}

/**
 * Fetches initial welcome message and suggestions from the backend.
 * GET /api/v1/dralens-chat/welcome
 *
 * @returns {Promise<{ message?: string, suggestions?: Array<string|object> } | null>}
 */
export async function getDralensWelcome() {
  const headers = await getHeaders();

  // Try active base URL first, then other candidates
  const urlsToTry = [
    activeBaseUrl,
    ...BACKEND_CANDIDATES.filter((u) => u !== activeBaseUrl),
  ];

  for (const base of urlsToTry) {
    const url = `${base.replace(/\/+$/, '')}/dralens-chat/welcome`;
    try {
      console.log('[Dralens AI] Calling Welcome API:', url);
      const response = await axios.get(url, {
        headers,
        timeout: 4000,
      });

      console.log('[Dralens AI] Welcome API Response:', response?.status, response?.data);

      if (response?.data) {
        activeBaseUrl = base;
        const payload = response.data.data || response.data;
        const welcomeData = {
          message:
            payload.message ||
            payload.welcome ||
            payload.welcomeMessage ||
            payload.intro ||
            payload.greeting ||
            payload.reply_text ||
            payload.text,
          suggestions:
            payload.suggestions ||
            payload.quickPrompts ||
            payload.quickQuestions ||
            payload.questions ||
            payload.prompts ||
            (Array.isArray(payload) ? payload : undefined),
        };
        console.log('[Dralens AI] Formatted Welcome Data:', welcomeData);
        return welcomeData;
      }
    } catch (err) {
      console.warn(`[Dralens AI] Welcome API Error from ${url}:`, err?.response?.data || err?.message || err);
    }
  }

  return null;
}

/**
 * Sends a message and conversation history to Dralens AI backend.
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

  // 1. Static Questions (Local Knowledge Base has verified instant replies for these)
  const staticMatch = isStaticQuestionMatch(trimmed);
  if (staticMatch) {
    console.log('[Dralens AI] Matched static Knowledge Base question:', staticMatch.question);
    return {
      intro: staticMatch.intro,
      steps: staticMatch.steps,
      outro: staticMatch.outro,
    };
  }

  // Format history matching backend schema:
  // [{ role: 'user' | 'assistant', content: string }]
  const formattedHistory = (history || [])
    .slice(-6)
    .filter((m) => m && (m.text || m.intro || m.content))
    .map((m) => {
      let content = m.content || m.text || m.intro || '';
      if (Array.isArray(m.steps) && m.steps.length > 0) {
        content += '\n' + m.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
      }
      return {
        role: m.role === 'user' ? 'user' : 'assistant',
        content,
      };
    });

  const headers = await getHeaders();

  const urlsToTry = [
    activeBaseUrl,
    ...BACKEND_CANDIDATES.filter((u) => u !== activeBaseUrl),
  ];

  // 1. Try Backend POST endpoints
  for (const base of urlsToTry) {
    const url = `${base.replace(/\/+$/, '')}/dralens-chat`;
    try {
      console.log('[Dralens AI] Calling Chat API:', url, {
        message: trimmed,
        history: formattedHistory,
      });

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

      console.log('[Dralens AI] Chat API Response:', response?.status, response?.data);

      const parsed = parseAiResponse(response?.data);
      if (parsed && (parsed.intro || parsed.steps)) {
        activeBaseUrl = base;
        console.log('[Dralens AI] Final Chat Parsed Result:', parsed);
        return parsed;
      }
    } catch (err) {
      console.warn(`[Dralens AI] Chat API Error from ${url}:`, err?.response?.data || err?.message || err);
    }
  }

  console.log('[Dralens AI] Backend API did not return valid response, checking Knowledge Base fallback...');
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
