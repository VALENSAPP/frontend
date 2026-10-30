import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  PermissionsAndroid,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useToast } from 'react-native-toast-notifications';
import { showToastMessage } from '../../components/displaytoastmessage';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n';
import HexAvatar from '../../components/home/story.js/HexAvatar';
import { useAppTheme } from '../../theme/useApptheme';
import { BASE_URL } from '../../config/urls';
import { normalizeProfileType } from '../../utils/supportEligibility';

const ShareProfile = ({ navigation }) => {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const routeParams = useRoute().params || {};
  const { userData, targetUserId, fromUsersProfile } = routeParams;
  const viewShotRef = useRef(null);
  const ownProfileImage = useSelector(state => state.profileImage?.profileImg);
  const currentUser = useSelector(state => state.user?.profile || state.auth?.user);

  const profile = useMemo(() => {
    if (userData?.user && typeof userData.user === 'object') {
      return userData.user;
    }
    if (userData && Object.keys(userData).length > 0) {
      return userData;
    }
    return currentUser || {};
  }, [currentUser, userData]);

  const [username, setUsername] = useState('');

  const qrSize = 200;
  const qrAvatarSize = 56;
  const qrAvatarPos = (qrSize / 2) - (qrAvatarSize / 2);

  const resolvedProfileType = useMemo(() => normalizeProfileType(
    profile?.profile ??
    profile?.accountType ??
    userData?.profile ??
    routeParams?.profile
  ), [profile?.accountType, profile?.profile, routeParams?.profile, userData?.profile]);

  const { text } = useAppTheme(resolvedProfileType);
  const profileActionGradient =
    resolvedProfileType === 'company'
      ? ['#C9A15a', '#e0e0c7']
      : ['#50288a', '#7b2bb2', '#9f32bf', '#d942b0'];

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const normalizeFilePath = (path) => (
    typeof path === 'string' && path.startsWith('file://')
      ? path.replace('file://', '')
      : path
  );

  const downloadQRCode = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        Alert.alert(t('shareProfile.permissionDenied'));
        return;
      }

      if (!viewShotRef.current) {
        Alert.alert(t('shareProfile.errorTitle'), t('shareProfile.qrNotReady'));
        return;
      }

      const uri = await viewShotRef.current.capture();

      if (!uri) {
        Alert.alert(t('shareProfile.errorTitle'), t('shareProfile.captureFailed'));
        return;
      }

      const sourcePath = normalizeFilePath(uri);

      let saveUri = uri;

      if (Platform.OS === 'android') {
        const newPath = `${RNFS.PicturesDirectoryPath}/qr_${Date.now()}.png`;
        await RNFS.moveFile(sourcePath, newPath);
        saveUri = `file://${newPath}`;
      } else {
        saveUri = uri.startsWith('file://') ? uri : `file://${sourcePath}`;
      }

      await CameraRoll.save(saveUri, {
        type: 'photo',
        album: 'Valens',
      });

      showToastMessage(toast, 'success', t('shareProfile.qrSavedToGallery'));

    } catch (error) {
      console.log('FINAL ERROR:', error);
      Alert.alert(t('shareProfile.errorTitle'), error?.message || t('shareProfile.captureFailed'));
    }
  };

  const toBold = (str) =>
    String(str)
      .split('')
      .map((c) => {
        const code = c.codePointAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(code + 0x1D400 - 65);
        if (code >= 97 && code <= 122) return String.fromCodePoint(code + 0x1D41A - 97);
        if (code >= 48 && code <= 57) return String.fromCodePoint(code + 0x1D7CE - 48);
        return c;
      })
      .join('');

  const resolvedUsername = useMemo(() => (
    String(
      username ||
      profile?.userName ||
      profile?.username ||
      profile?.displayName ||
      '',
    ).trim()
  ), [profile, username]);

  const resolvedUserId = useMemo(() => (
    String(
      profile?.id ||
      profile?.userId ||
      profile?._id ||
      userData?.id ||
      userData?.userId ||
      userData?._id ||
      targetUserId ||
      '',
    ).trim()
  ), [profile, targetUserId, userData]);

  const currentUserId = useMemo(() => (
    String(
      currentUser?.id ||
      currentUser?.userId ||
      currentUser?._id ||
      '',
    ).trim()
  ), [currentUser]);

  const isOwnProfile = fromUsersProfile === true
    ? false
    : fromUsersProfile === false
      ? true
      : Boolean(resolvedUserId && currentUserId && resolvedUserId === currentUserId);

  const resolvedAvatarUri = useMemo(() => (
    profile?.image ||
    profile?.profileImage ||
    (isOwnProfile ? ownProfileImage : null) ||
    'https://cdn-icons-png.flaticon.com/512/149/149071.png'
  ), [isOwnProfile, ownProfileImage, profile?.image, profile?.profileImage]);

  const qrShareUrl = `${BASE_URL}/profile/${resolvedUserId}?username=${encodeURIComponent(resolvedUsername)}&callbackUrl=${encodeURIComponent('com.valens://')}`;
  useFocusEffect(
    useCallback(() => {
      const nextUsername = String(
        profile?.userName ||
        profile?.username ||
        '',
      ).trim();
      setUsername(nextUsername);
    }, [profile])
  );

  const getShareContent = () => {
    const currentUsername = String(resolvedUsername || username || '').trim();
    const profileLabel = currentUsername ? `@${currentUsername}` : 'this profile';
    const shareMessage = isOwnProfile
      ? t('shareProfile.shareMessageTemplate', {
        username: toBold(profileLabel),
      })
      : t('shareProfile.shareOtherMessageTemplate', {
        username: toBold(profileLabel),
        profileLink: qrShareUrl,
      });

    return {
      shareMessage,
      clipboardText: isOwnProfile ? `${shareMessage}\n${qrShareUrl}` : shareMessage,
    };
  };

  const copyToClipboard = () => {
    if (!qrShareUrl) {
      Alert.alert(t('shareProfile.errorTitle'), t('shareProfile.noLinkToCopy'));
      return;
    }

    Clipboard.setString(getShareContent().clipboardText);
    showToastMessage(toast, 'success', t('shareProfile.profileLinkCopied'));
  };

  const onShare = async () => {
    try {
      if (!resolvedUsername && !resolvedUserId) {
        Alert.alert(
          t('shareProfile.profileNotAvailable'),
          t('shareProfile.profileNotAvailableMessage'),
        );
        return;
      }

      const { shareMessage } = getShareContent();

      const result = await Share.share({
        ...(isOwnProfile ? { url: qrShareUrl } : {}),
        message: shareMessage,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared with activity type:', result.activityType);
        } else {
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      Alert.alert(
        t('shareProfile.shareErrorTitle'),
        t('shareProfile.shareErrorMessage', { error: error.message }),
      );
    }
  };

  const actionButtons = [
    {
      id: 'copy',
      icon: 'link',
      iconFamily: 'Feather',
      onPress: copyToClipboard,
      label: t('shareProfile.copyLink'),
    },
    {
      id: 'download',
      icon: 'download',
      iconFamily: 'Feather',
      onPress: downloadQRCode,
      label: t('shareProfile.save'),
    },
    {
      id: 'share',
      icon: 'share',
      iconFamily: 'Feather',
      onPress: onShare,
      label: t('shareProfile.share'),
    },
  ];

  const hasShareUrl = Boolean(qrShareUrl);

  return (
    <LinearGradient
      colors={profileActionGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientContainer}
    >
      {/* Background Decorative Sparkles */}
      <View style={styles.sparkle1} pointerEvents="none">
        <MaterialCommunityIcons name="star-four-points" size={24} color="#FFFFFF" />
      </View>
      <View style={styles.sparkle2} pointerEvents="none">
        <MaterialCommunityIcons name="star-four-points" size={18} color="#FFFFFF" />
      </View>
      <View style={styles.sparkle3} pointerEvents="none">
        <MaterialCommunityIcons name="star-four-points" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.sparkle4} pointerEvents="none">
        <MaterialCommunityIcons name="star-four-points" size={14} color="#FFFFFF" />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <View style={styles.closeButtonBackground}>
              <Ionicons name="close" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('shareProfile.headerTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 12) + 20 },
          ]}
        >
          <View style={styles.shareCard}>
            {/* Mascot on top-right */}
            {/* <Image
              source={require('../../assets/icons/pngicons/shareMascot.png')}
              style={styles.mascotImage}
              pointerEvents="none"
            /> */}

            <View style={styles.profileRow}>
              <HexAvatar
                uri={resolvedAvatarUri}
                size={58}
                borderWidth={2.5}
                borderColor="rgba(255,255,255,0.4)"
              />
              <View style={styles.profileText}>
                <Text style={styles.brandText}>{t('shareProfile.brandName')}</Text>
                <Text style={styles.handleText} numberOfLines={1}>
                  @{resolvedUsername || 'valens'}
                </Text>
                <Text style={styles.subtitle}>{t('shareProfile.scanOrShare')}</Text>
              </View>
            </View>

            <View style={styles.qrContainer}>
              <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
                <View style={styles.qrCard}>
                  <View style={[styles.qrCodeWrapper, { width: qrSize, height: qrSize }]}>
                    <QRCode
                      value={qrShareUrl}
                      size={qrSize}
                      color="#111"
                      backgroundColor="#ffffff"
                    />

                    <View style={[
                      styles.qrAvatarWrapper,
                      {
                        width: qrAvatarSize,
                        height: qrAvatarSize,
                        top: qrAvatarPos,
                        left: qrAvatarPos,
                      },
                    ]}>
                      <HexAvatar
                        uri={resolvedAvatarUri}
                        size={qrAvatarSize}
                        borderWidth={2.5}
                        borderColor={text || '#50288a'}
                      />
                    </View>
                  </View>
                </View>
              </ViewShot>
            </View>
          </View>

          <View style={styles.actionsGrid}>
            {actionButtons.map((button) => (
              <TouchableOpacity
                key={button.id}
                style={[styles.actionTile, !hasShareUrl && styles.actionTileDisabled]}
                onPress={button.onPress}
                activeOpacity={0.85}
                disabled={!hasShareUrl && (button.id === 'copy' || button.id === 'share')}
              >
                <View style={styles.actionIcon}>
                  {button.iconFamily === 'Feather' ? (
                    <Feather name={button.icon} size={20} color="#fff" />
                  ) : (
                    <Ionicons name={button.icon} size={20} color="#fff" />
                  )}
                </View>
                <Text style={styles.actionTileText}>{button.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  sparkle1: {
    position: 'absolute',
    top: 90,
    right: 28,
    opacity: 0.85,
    zIndex: 1,
  },
  sparkle2: {
    position: 'absolute',
    top: 175,
    left: 24,
    opacity: 0.75,
    zIndex: 1,
  },
  sparkle3: {
    position: 'absolute',
    top: 395,
    right: 18,
    opacity: 0.85,
    zIndex: 1,
  },
  sparkle4: {
    position: 'absolute',
    bottom: 110,
    left: 32,
    opacity: 0.65,
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeButton: {
    zIndex: 2,
  },
  closeButtonBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  shareCard: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 24,
    padding: 18,
    paddingTop: 22,
    overflow: 'visible',
  },
  mascotImage: {
    position: 'absolute',
    top: -42,
    right: -10,
    width: 175,
    height: 195,
    resizeMode: 'contain',
    zIndex: 10,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    maxWidth: '62%',
  },
  profileText: {
    flex: 1,
  },
  brandText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  handleText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrAvatarWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  linkRowDisabled: {
    opacity: 0.6,
  },
  linkText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionTileDisabled: {
    opacity: 0.6,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ShareProfile;
