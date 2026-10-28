const ENDED_BATTLE_TYPES = new Set([
  'battle_completed',
  'battle_closed',
  'battle_victory',
  'battle_result',
  'battle_forecast_missed',
  'battle_ended',
  'battle_finished',
  'battle_end',
  'marketplace_battle_ended',
  'marketplace_battle_completed',
  'marketplace_battle_closed',
  'marketplace_battle_finished',
]);

const firstText = (...values) => {
  const found = values.find(value => value != null && String(value).trim() !== '');
  return found == null ? '' : String(found).trim();
};

const parseBattleIdFromLink = link => {
  const value = String(link || '').trim();
  if (!value) return '';
  const query = value.match(/[?&](?:battleId|battle_id)=([^&#]+)/i);
  if (query?.[1]) {
    try {
      return decodeURIComponent(query[1]);
    } catch {
      return query[1];
    }
  }
  const path = value.match(/\/battles?\/([a-zA-Z0-9-]+)/i);
  return path?.[1] || '';
};

const cleanBattleId = value => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.includes(':') ? raw.split(':').pop() : raw;
};

export const extractBattleIdFromNotification = source => {
  const data = source?.data && typeof source.data === 'object' ? source.data : {};
  const raw = source?.raw && typeof source.raw === 'object' ? source.raw : {};
  const rawData = raw?.data && typeof raw.data === 'object' ? raw.data : {};
  const battle = data.battle || rawData.battle || raw.battle || source?.battle || {};
  const fromLink = parseBattleIdFromLink(
    data.deepLink || data.deeplink || data.link || rawData.deepLink || rawData.link,
  );

  return cleanBattleId(firstText(
    fromLink,
    source?.actionPayload?.battleId,
    source?.battleId,
    source?.battle_id,
    data.battleId,
    data.battle_id,
    raw.battleId,
    raw.battle_id,
    rawData.battleId,
    rawData.battle_id,
    battle.id,
    battle._id,
    battle.battleId,
  ));
};

export const resolveBattleNotificationRoute = source => {
  const data = source?.data && typeof source.data === 'object' ? source.data : {};
  const rawData = source?.raw?.data && typeof source.raw.data === 'object' ? source.raw.data : {};
  const type = firstText(
    source?.type,
    data.type,
    rawData.type,
    source?.raw?.type,
  ).toLowerCase();
  const title = firstText(
    source?.title,
    source?.notification?.title,
    data.title,
    data.expandedTitle,
    rawData.title,
  ).toLowerCase();
  const body = firstText(
    source?.body,
    source?.message,
    source?.notification?.body,
    data.body,
    data.expandedBody,
    rawData.body,
  ).toLowerCase();
  const text = `${type} ${title} ${body}`;
  const isBattle = type.includes('battle') || title.includes('battle') || body.includes('battle');
  if (!isBattle) return null;

  const battleId = extractBattleIdFromNotification(source);
  if (!battleId) return null;

  const format = firstText(source?.format, data.format, rawData.format, data.battle?.format).toUpperCase();
  const isMarketplace = type.includes('marketplace') || format === 'MARKETPLACE';
  const isEnded = ENDED_BATTLE_TYPES.has(type)
    || /\b(ended|completed|closed|finished|victory|result)\b/.test(text);
  const screen = isMarketplace
    ? (isEnded ? 'BattleResultsScreen' : 'BattleLive')
    : (isEnded ? 'BattleResults' : 'BattleInProgress');

  return {
    screen,
    params: {
      battleId,
      entryPoint: 'notifications',
      returnTo: { tab: 'HomeMain', screen: 'HeartNotification' },
    },
  };
};
