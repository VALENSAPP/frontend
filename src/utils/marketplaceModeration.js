import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkContentModeration, parseModerationResult } from '../services/moderation';
import { collectRemoteMediaRefs } from './battleModeration';

export const buildProductModerationText = (draft = {}) => {
  const name = String(draft.itemName || draft.name || '').trim();
  const brand = String(draft.brand || '').trim();
  const title = [brand, name].filter(Boolean).join(' ');
  const size = String(draft.size || '').trim();
  const headline = [title, size ? `Size ${size}` : ''].filter(Boolean).join(' - ');
  const condition = String(draft.condition || '').trim();
  const description = String(draft.description || '').trim();

  return [headline, condition, description]
    .filter(Boolean)
    .join('. ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const collectProductMediaRefs = (draft = {}) =>
  collectRemoteMediaRefs([
    draft.photos,
    draft.images,
    draft.image,
    draft.media,
  ]);

const resolveProductDecision = (parsed, response, t) => {
  if (!parsed?.decision) {
    throw new Error(response?.message || 'Moderation check failed');
  }

  if (parsed.decision === 'BLOCK') {
    Alert.alert(
      t('myClosetAddItemReview.moderationBlockTitle'),
      parsed.reason
        ? t('myClosetAddItemReview.moderationBlockReason', { reason: parsed.reason })
        : t('myClosetAddItemReview.moderationBlock'),
    );
    return null;
  }

  if (parsed.decision === 'WARN') {
    return new Promise(resolve => {
      Alert.alert(
        t('myClosetAddItemReview.moderationWarnTitle'),
        t('myClosetAddItemReview.moderationWarnMessage'),
        [
          {
            text: t('myClosetAddItemReview.moderationNo'),
            style: 'cancel',
            onPress: () => resolve(null),
          },
          {
            text: t('myClosetAddItemReview.moderationYes'),
            onPress: () => resolve('ALLOW'),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(null) },
      );
    });
  }

  return parsed.decision;
};

export async function moderateMarketplaceProduct({
  draft,
  contentId,
  language = 'en',
  t,
}) {
  const userId = (await AsyncStorage.getItem('userId')) || '';
  const response = await checkContentModeration({
    user_id: userId,
    content_id: contentId || `temp_prod_${Date.now()}`,
    content_type: 'product',
    feature: 'marketplace',
    text: buildProductModerationText(draft),
    media_refs: collectProductMediaRefs(draft),
    language: language || 'en',
  });
  console.log('Moderation check response Marketplace product screen:', response);
  return resolveProductDecision(parseModerationResult(response), response, t);
};
