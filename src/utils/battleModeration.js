import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkContentModeration, parseModerationResult } from '../services/moderation';

const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const isRemoteMediaUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

export const buildBattleModerationText = ({ question = '', options = [], description = '' } = {}) => {
  const optionText = (Array.isArray(options) ? options : [])
    .map(option => (typeof option === 'string' ? option : option?.text || option?.name || ''))
    .map(option => String(option || '').trim())
    .filter(Boolean)
    .map((option, index) => `Option ${OPTION_LETTERS[index] || index + 1}: ${option}`)
    .join(', ');

  return [String(question || '').trim(), optionText, String(description || '').trim()]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const collectRemoteMediaRefs = (values) => {
  const refs = [];
  const visit = (value) => {
    if (value == null) return;
    if (typeof value === 'string' || typeof value === 'number') {
      const uri = String(value).trim();
      if (isRemoteMediaUrl(uri) && !refs.includes(uri)) refs.push(uri);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') {
      visit(value.uri || value.url || value.image || value.imageUrl || value.src || value.path);
    }
  };
  visit(values);
  return refs;
};

export async function moderateBattleContent({
  text,
  mediaRefs = [],
  contentId,
  language = 'en',
  t,
}) {
  const userId = (await AsyncStorage.getItem('userId')) || '';
  const response = await checkContentModeration({
    user_id: userId,
    content_id: contentId || `temp_battle_${Date.now()}`,
    content_type: 'battle',
    feature: 'battle',
    text: String(text || '').trim(),
    media_refs: Array.isArray(mediaRefs) ? mediaRefs : [],
    language: language || 'en',
  });
  console.log('Moderation check response Battle screen:', response);
  const parsed = parseModerationResult(response);
  return resolveModerationDecision(parsed, response, t, 'openBattle');
};

const resolveModerationDecision = (parsed, response, t, namespace) => {
  if (!parsed?.decision) {
    throw new Error(response?.message || 'Moderation check failed');
  }

  if (parsed.decision === 'BLOCK') {
    Alert.alert(
      t(`${namespace}.moderationBlockTitle`),
      parsed.reason
        ? t(`${namespace}.moderationBlockReason`, { reason: parsed.reason })
        : t(`${namespace}.moderationBlock`),
    );
    return null;
  }

  if (parsed.decision === 'WARN') {
    return new Promise(resolve => {
      Alert.alert(
        t(`${namespace}.moderationWarnTitle`),
        t(`${namespace}.moderationWarnMessage`),
        [
          { text: t(`${namespace}.moderationNo`), style: 'cancel', onPress: () => resolve(null) },
          { text: t(`${namespace}.moderationYes`), onPress: () => resolve('ALLOW') },
        ],
        { cancelable: true, onDismiss: () => resolve(null) },
      );
    });
  }

  return parsed.decision;
};

export async function moderateBattleComment({
  text,
  contentId,
  replyToContentId,
  contextIds = [],
  language = 'en',
  t,
}) {
  const userId = (await AsyncStorage.getItem('userId')) || '';
  const response = await checkContentModeration({
    user_id: userId,
    content_id: contentId || `temp_bcmt_${Date.now()}`,
    content_type: 'battle_comment',
    feature: 'battle',
    text: String(text || '').trim(),
    reply_to_content_id: String(replyToContentId || ''),
    context_ids: (Array.isArray(contextIds) ? contextIds : [])
      .map(id => String(id || '').trim())
      .filter(Boolean),
    language: language || 'en',
  });

  console.log('Moderation check response Battle comment screen:', response);
  return resolveModerationDecision(parseModerationResult(response), response, t, 'battleInProgress');
};
