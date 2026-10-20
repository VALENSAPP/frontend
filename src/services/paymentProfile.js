import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserCredentials } from './post';

export async function getPaymentProfile() {
  // Do not let a stale profile or UI language select the buyer's payment provider.
  const userId = await AsyncStorage.getItem('userId');
  if (!userId) throw new Error('Payment profile unavailable');
  const response = await getUserCredentials(userId);
  if (![200, 201].includes(response?.statusCode)) {
    throw new Error('Payment profile unavailable');
  }
  const user = response.data?.user ?? response.data;
  if (!user || String(user.id ?? user.userId) !== String(userId)) {
    throw new Error('Payment profile unavailable');
  }
  return user;
}
