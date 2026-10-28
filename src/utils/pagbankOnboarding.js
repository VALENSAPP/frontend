/** Only the authenticated server response can confirm a PagBank connection. */
export function parsePagbankOnboardingStatus(response) {
  let data = response;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (data.success === false || data.error) return null;
    if (data.statusCode != null && ![200, 201].includes(Number(data.statusCode))) return null;
    if (data.provider === 'PAGBANK' && typeof data.canReceivePayments === 'boolean') {
      if (data.canReceivePayments && (typeof data.accountId !== 'string' || !data.accountId.trim())) return null;
      return { connected: data.canReceivePayments };
    }
    data = data.data;
  }
  return null;
}
