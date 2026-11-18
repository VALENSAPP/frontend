import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACTIVE_PROMOTIONS_STORAGE_KEY = '@valens_active_promotions';

/**
 * Record an active promotion when a seller launches it.
 * This guarantees immediate explore delivery even if backend cache hasn't invalidated yet.
 */
export async function recordActivePromotion(productId, promoData = {}) {
  if (!productId) return;
  const pId = String(productId);
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_PROMOTIONS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : {};

    const prev = existing[pId] || {};
    const days = Number(promoData.days) || 7;
    const now = Date.now();
    const promotionEndAt = promoData.promotionEndAt || new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
    const isFreeShipping = Boolean(promoData.isFreeShipping || prev.isFreeShipping);
    const discount = Number(promoData.discount ?? promoData.discountPercent ?? prev.discountPercent) || 0;
    const hasPercentageOff = discount > 0;

    let defaultBadge = 'BATTLE WINNER SALE';
    if (isFreeShipping && hasPercentageOff) {
      defaultBadge = `BATTLE WINNER • ${discount}% OFF + FREE SHIP`;
    } else if (isFreeShipping) {
      defaultBadge = 'BATTLE WINNER - FREE SHIP';
    } else if (hasPercentageOff) {
      defaultBadge = `BATTLE WINNER ${discount}% OFF`;
    }

    existing[pId] = {
      productId: pId,
      battleId: promoData.battleId || prev.battleId || null,
      isPinnedOnTop: promoData.isPinnedOnTop !== false,
      priorityTier: promoData.priorityTier || prev.priorityTier || (promoData.battleId ? 1 : 2),
      primaryBadge: promoData.primaryBadge || defaultBadge,
      discountPercent: discount,
      hasPercentageOff,
      hasFreeShipping,
      promotionType: isFreeShipping ? (hasPercentageOff ? 'both' : 'free_shipping') : 'discount',
      promotionMessage: promoData.message || prev.promotionMessage || (isFreeShipping ? 'Free shipping on battle winner' : `${discount}% off battle winner`),
      promotedAt: promoData.promotedAt || prev.promotedAt || new Date(now).toISOString(),
      boostedAt: promoData.boostedAt || prev.boostedAt || new Date(now).toISOString(),
      promotionEndAt,
      remainingSeconds: Math.max(0, Math.floor((new Date(promotionEndAt).getTime() - now) / 1000)),
      updatedAt: new Date(now).toISOString(),
    };

    await AsyncStorage.setItem(ACTIVE_PROMOTIONS_STORAGE_KEY, JSON.stringify(existing));
    return existing[pId];
  } catch (err) {
    console.warn('⚠️ [recordActivePromotion] error persisting promotion:', err?.message || err);
    return null;
  }
}

/**
 * Get all active, unexpired promotions from local store.
 */
export async function getActivePromotions() {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_PROMOTIONS_STORAGE_KEY);
    if (!raw) return {};

    const all = JSON.parse(raw);
    const now = Date.now();
    const active = {};
    let hasExpired = false;

    Object.entries(all).forEach(([id, p]) => {
      const end = p.promotionEndAt ? new Date(p.promotionEndAt).getTime() : null;
      if (!end || end > now) {
        active[id] = p;
      } else {
        hasExpired = true;
      }
    });

    if (hasExpired) {
      // Purge expired promotions in background
      AsyncStorage.setItem(ACTIVE_PROMOTIONS_STORAGE_KEY, JSON.stringify(active)).catch(() => {});
    }

    return active;
  } catch {
    return {};
  }
}

/**
 * Calculates delivery rank and score for a product.
 *
 * Algorithm Tiers:
 * - Tier 1: Pinned on top OR priorityTier === 1 (Highest guaranteed delivery)
 * - Tier 2: Battle winner promotions (Paid promotions from battle insights)
 * - Tier 3: Standard active promotions / boosts (Discounts, free shipping, boosted)
 * - Tier 4: Organic products
 *
 * Inside each tier, items are ordered by recency of promotion (promotedAt / boostedAt).
 */
export function calculatePromotionDeliveryRank(item, localPromos = {}) {
  const pId = String(item.id || item._id || '');
  const local = localPromos[pId] || null;
  const promo = { ...(item.promotion || {}), ...(local || {}) };

  const now = Date.now();
  const isExpired = promo.promotionEndAt
    ? new Date(promo.promotionEndAt).getTime() <= now
    : (promo.remainingSeconds != null && Number(promo.remainingSeconds) <= 0);

  if (isExpired) {
    return {
      isPromoted: false,
      tier: 4,
      score: 0,
      isPinned: false,
      isBattleWinner: false,
      effectiveBadge: null,
      promoTimestamp: 0,
    };
  }

  const isPinned = promo.isPinnedOnTop === true;
  const isBattleWinner = Boolean(
    promo.battleId ||
    (promo.priorityTier && Number(promo.priorityTier) <= 2) ||
    String(promo.primaryBadge || '').toUpperCase().includes('WINNER') ||
    String(promo.promotionType || '').toLowerCase().includes('battle')
  );

  const isBoostedOrDiscounted = Boolean(
    (promo.priorityTier && Number(promo.priorityTier) === 3) ||
    promo.promotedAt ||
    promo.boostedAt ||
    item.promotedAt ||
    item.boostedAt ||
    promo.hasPercentageOff ||
    promo.hasFreeShipping ||
    promo.discountPercent ||
    (promo.remainingSeconds != null && Number(promo.remainingSeconds) > 0)
  );

  const isPromoted = isPinned || isBattleWinner || isBoostedOrDiscounted || (promo.priorityTier != null && Number(promo.priorityTier) < 4);

  if (!isPromoted) {
    return {
      isPromoted: false,
      tier: 4,
      score: 0,
      isPinned: false,
      isBattleWinner: false,
      effectiveBadge: null,
      promoTimestamp: 0,
    };
  }

  // Tier assignment
  let tier = 3;
  if (isPinned || Number(promo.priorityTier) === 1) {
    tier = 1;
  } else if (isBattleWinner || Number(promo.priorityTier) === 2) {
    tier = 2;
  } else if (Number(promo.priorityTier) === 3) {
    tier = 3;
  }

  // Recency of promotion in milliseconds
  const promoDate =
    promo.promotedAt ||
    promo.boostedAt ||
    item.promotedAt ||
    item.boostedAt ||
    item.updatedAt ||
    item.createdAt;
  const promoTimestamp = promoDate ? new Date(promoDate).getTime() : now;

  // Base weights guarantee Tier 1 > Tier 2 > Tier 3 > Tier 4
  const baseScores = {
    1: 10000000000, // 10 Billion
    2: 5000000000,  // 5 Billion
    3: 1000000000,  // 1 Billion
    4: 0,
  };

  // Higher score = higher placement
  const score = (baseScores[tier] || 1000000000) + Math.floor(promoTimestamp / 1000);

  // Determine badge text
  let effectiveBadge = promo.primaryBadge || null;
  if (!effectiveBadge) {
    if (isBattleWinner) {
      if (promo.hasFreeShipping) {
        effectiveBadge = 'WINNER • FREE SHIP';
      } else if (promo.discountPercent) {
        effectiveBadge = `WINNER • ${promo.discountPercent}% OFF`;
      } else {
        effectiveBadge = 'BATTLE WINNER';
      }
    } else if (isPinned) {
      effectiveBadge = 'FEATURED';
    } else if (promo.hasFreeShipping) {
      effectiveBadge = 'FREE SHIPPING';
    } else if (promo.discountPercent) {
      effectiveBadge = `${promo.discountPercent}% OFF`;
    } else {
      effectiveBadge = 'PROMOTED';
    }
  }

  return {
    isPromoted: true,
    tier,
    score,
    isPinned,
    isBattleWinner,
    effectiveBadge,
    promoTimestamp,
    effectivePromotion: promo,
  };
}

/**
 * Sorts products using the Explore Promotion Delivery Algorithm.
 *
 * For the default Explore view ('latest'):
 * 1. Delivers all paid promotions first, sorted by score (Tier 1 -> Tier 2 Battle Winner -> Tier 3).
 * 2. Delivers organic products next, sorted by createdAt descending.
 *
 * For 'popular':
 * Pinned & Battle Winner items stay on top, followed by soldCount.
 *
 * For price sorts:
 * Pinned items stay on top, followed by price asc / desc.
 */
export function sortExploreFeedWithAlgorithm(
  products = [],
  selectedSort = 'latest',
  sortBy = null,
  sortOrder = 'desc'
) {
  const result = [...products];

  // If specific sortBy & sortOrder from backend/Swagger are provided
  if (sortBy && sortBy !== 'all' && sortBy !== '--') {
    const isAsc = sortOrder === 'asc';
    result.sort((a, b) => {
      // Pinned items always stay on top
      const pinA = a._promoDelivery?.isPinned ? 1 : 0;
      const pinB = b._promoDelivery?.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;

      if (sortBy === 'price') {
        const valA = Number(a.price || 0);
        const valB = Number(b.price || 0);
        return isAsc ? valA - valB : valB - valA;
      }
      if (sortBy === 'priority') {
        const valA = a._promoDelivery?.score || 0;
        const valB = b._promoDelivery?.score || 0;
        return isAsc ? valA - valB : valB - valA;
      }
      if (sortBy === 'createdAt') {
        const valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return isAsc ? valA - valB : valB - valA;
      }
      if (sortBy === 'boostedAt') {
        const valA = (a.boostedAt || a._promoDelivery?.effectivePromotion?.boostedAt)
          ? new Date(a.boostedAt || a._promoDelivery?.effectivePromotion?.boostedAt).getTime()
          : 0;
        const valB = (b.boostedAt || b._promoDelivery?.effectivePromotion?.boostedAt)
          ? new Date(b.boostedAt || b._promoDelivery?.effectivePromotion?.boostedAt).getTime()
          : 0;
        return isAsc ? valA - valB : valB - valA;
      }
      if (sortBy === 'promotedAt') {
        const valA = (a.promotedAt || a._promoDelivery?.effectivePromotion?.promotedAt)
          ? new Date(a.promotedAt || a._promoDelivery?.effectivePromotion?.promotedAt).getTime()
          : 0;
        const valB = (b.promotedAt || b._promoDelivery?.effectivePromotion?.promotedAt)
          ? new Date(b.promotedAt || b._promoDelivery?.effectivePromotion?.promotedAt).getTime()
          : 0;
        return isAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
    return result;
  }

  if (selectedSort === 'latest') {
    result.sort((a, b) => {
      const scoreA = a._promoDelivery?.score || 0;
      const scoreB = b._promoDelivery?.score || 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Promoted items higher score first
      }
      // Both organic or identical promo score -> sort by creation recency
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  } else if (selectedSort === 'popular') {
    result.sort((a, b) => {
      const pinA = a._promoDelivery?.isPinned ? 1 : 0;
      const pinB = b._promoDelivery?.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return (b.soldCount || 0) - (a.soldCount || 0);
    });
  } else if (selectedSort === 'price_low') {
    result.sort((a, b) => {
      const pinA = a._promoDelivery?.isPinned ? 1 : 0;
      const pinB = b._promoDelivery?.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return (a.price || 0) - (b.price || 0);
    });
  } else if (selectedSort === 'price_high') {
    result.sort((a, b) => {
      const pinA = a._promoDelivery?.isPinned ? 1 : 0;
      const pinB = b._promoDelivery?.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return (b.price || 0) - (a.price || 0);
    });
  }

  return result;
}
