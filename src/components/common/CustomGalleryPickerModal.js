import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAppTheme } from '../../theme/useApptheme';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 4;
const GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - (NUM_COLUMNS - 1) * GAP) / NUM_COLUMNS;

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const requestGalleryPermission = async () => {
  if (Platform.OS !== 'android') return true;
  try {
    if (Platform.Version >= 33) {
      const statuses = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      ]);
      return (
        statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === PermissionsAndroid.RESULTS.GRANTED ||
        statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (e) {
    console.warn('Gallery permission request error:', e);
    return false;
  }
};

const resolveAssetFileUri = async (item) => {
  if (!item?.uri) return item;
  if (Platform.OS !== 'ios' || !item.uri.startsWith('ph://')) {
    return item;
  }

  const isVid = item.type === 'video' || (item.duration && item.duration > 0);
  const ext = isVid ? 'mp4' : 'jpg';
  const dest = `${RNFS.CachesDirectoryPath}/gallery_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    if (isVid && typeof RNFS.copyAssetsVideoIOS === 'function') {
      const path = await RNFS.copyAssetsVideoIOS(item.uri, dest);
      return { ...item, uri: `file://${path}` };
    } else if (typeof RNFS.copyAssetsFileIOS === 'function') {
      const path = await RNFS.copyAssetsFileIOS(item.uri, dest, 0, 0);
      return { ...item, uri: `file://${path}` };
    }
  } catch (err) {
    console.warn('resolveAssetFileUri via RNFS failed:', err);
  }

  try {
    if (typeof CameraRoll.iosGetImageDataById === 'function') {
      const res = await CameraRoll.iosGetImageDataById(item.uri);
      const filePath = res?.node?.image?.filepath;
      if (filePath) {
        return { ...item, uri: filePath.startsWith('file://') ? filePath : `file://${filePath}` };
      }
    }
  } catch (err) {
    console.warn('resolveAssetFileUri via iosGetImageDataById failed:', err);
  }

  return item;
};

export default function CustomGalleryPickerModal({
  visible = false,
  onClose,
  onSelect,
  onOpenCamera,
  maxSelection = 10,
  mediaType = 'mixed',
}) {
  const insets = useSafeAreaInsets();
  const { bgStyle, textStyle, text, cardStyle, border, accent, mutedText } = useAppTheme();
  const { t } = useLanguage();

  const [photos, setPhotos] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const endCursorRef = useRef(null);

  const fetchPhotos = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      endCursorRef.current = null;
    } else {
      setLoadingMore(true);
    }

    try {
      const permitted = await requestGalleryPermission();
      if (!permitted) {
        setHasPermission(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      setHasPermission(true);

      const assetType =
        mediaType === 'video'
          ? 'Videos'
          : mediaType === 'photo'
          ? 'Photos'
          : 'All';

      const params = {
        first: 40,
        assetType,
      };

      if (!reset && endCursorRef.current) {
        params.after = endCursorRef.current;
      }

      const res = await CameraRoll.getPhotos(params);
      const edges = res?.edges || [];
      const newPhotos = edges.map((edge) => {
        const node = edge?.node || {};
        const image = node.image || {};
        const isVid =
          node.type === 'video' ||
          (image.playableDuration != null && image.playableDuration > 0);

        return {
          id: node.id || image.uri,
          uri: image.uri,
          type: isVid ? 'video' : 'image',
          duration: image.playableDuration ? Math.round(image.playableDuration) : undefined,
          width: image.width,
          height: image.height,
          filename: image.filename,
        };
      });

      endCursorRef.current = res?.page_info?.end_cursor || null;
      setHasNextPage(Boolean(res?.page_info?.has_next_page));

      if (reset) {
        setPhotos(newPhotos);
      } else {
        setPhotos((prev) => {
          const existingIds = new Set(prev.map((p) => p.id || p.uri));
          const unique = newPhotos.filter((p) => !existingIds.has(p.id || p.uri));
          return [...prev, ...unique];
        });
      }
    } catch (error) {
      console.warn('CameraRoll.getPhotos error:', error);
      if (reset) {
        setHasPermission(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [mediaType]);

  useEffect(() => {
    if (visible) {
      setSelectedItems([]);
      fetchPhotos(true);
    }
  }, [visible, fetchPhotos]);

  const handleOpenSystemPicker = () => {
    launchImageLibrary(
      {
        mediaType: mediaType === 'video' ? 'video' : mediaType === 'photo' ? 'photo' : 'mixed',
        selectionLimit: maxSelection,
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
      },
      (response) => {
        if (response?.didCancel || response?.errorCode) return;
        const assets = response?.assets || [];
        if (!assets.length) return;
        const normalized = assets.map((a) => ({
          uri: a.uri,
          type: a.type?.startsWith('video') ? 'video' : 'image',
          duration: a.duration ? a.duration : undefined,
          width: a.width,
          height: a.height,
          filename: a.fileName,
        }));
        onClose?.();
        onSelect?.(normalized);
      },
    );
  };

  const handleToggleSelect = (item) => {
    const isSelected = selectedItems.some((s) => s.uri === item.uri);
    if (isSelected) {
      setSelectedItems((prev) => prev.filter((s) => s.uri !== item.uri));
    } else {
      if (selectedItems.length >= maxSelection) {
        Alert.alert(
          t('post.selectionLimitTitle', 'Selection Limit'),
          t('post.selectionLimitMessage', `You can select up to ${maxSelection} items.`),
        );
        return;
      }
      setSelectedItems((prev) => [...prev, item]);
    }
  };

  const handleConfirmSelection = async () => {
    if (selectedItems.length === 0 || isConfirming) return;
    setIsConfirming(true);

    try {
      const resolved = await Promise.all(
        selectedItems.map((item) => resolveAssetFileUri(item)),
      );
      setIsConfirming(false);
      onClose?.();
      onSelect?.(resolved);
    } catch (err) {
      console.warn('Error confirming gallery selection:', err);
      setIsConfirming(false);
      onClose?.();
      onSelect?.(selectedItems);
    }
  };

  const handlePressCamera = () => {
    onClose?.();
    onOpenCamera?.();
  };

  // Combine Camera tile at index 0 followed by gallery photos
  const gridData = [{ id: '__camera__', isCameraTile: true }, ...photos];

  const contentContainerPadding = useMemo(() => [
    styles.gridContent,
    { paddingBottom: selectedItems.length > 0 ? 100 : insets.bottom + 20 },
  ], [selectedItems.length, insets.bottom]);

  const renderItem = ({ item }) => {
    if (item.isCameraTile) {
      return (
        <TouchableOpacity
          style={[styles.cameraTile, cardStyle, { borderColor: border }]}
          onPress={handlePressCamera}
          activeOpacity={0.7}
        >
          <View style={styles.cameraIconCircle}>
            <Icon name="camera" size={32} color={text} />
          </View>
          <Text style={[styles.cameraTileLabel, textStyle]}>
            {t('stories.camera', 'Camera')}
          </Text>
        </TouchableOpacity>
      );
    }

    const selIndex = selectedItems.findIndex((s) => s.uri === item.uri);
    const isSelected = selIndex >= 0;

    return (
      <TouchableOpacity
        style={styles.photoTile}
        onPress={() => handleToggleSelect(item)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.uri }} style={styles.photoImage} />

        {item.type === 'video' && (
          <View style={styles.videoBadge}>
            <Icon name="play" size={10} color="#fff" style={styles.videoIcon} />
            <Text style={styles.videoDurationText}>
              {formatDuration(item.duration)}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.selectCircle,
            isSelected && [styles.selectCircleActive, { backgroundColor: accent || '#25D366' }],
          ]}
        >
          {isSelected ? (
            <Text style={styles.selectNumberText}>{selIndex + 1}</Text>
          ) : null}
        </View>

        {isSelected && <View style={styles.selectedOverlay} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, bgStyle]}>
        {/* Header */}
        <View
          style={[
            styles.headerRow,
            bgStyle,
            {
              paddingTop: Math.max(insets.top, 12),
              borderBottomColor: border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="close" size={26} color={text} />
          </TouchableOpacity>

          <View style={styles.headerTabs}>
            <View style={[styles.tabPill, { backgroundColor: cardStyle?.backgroundColor || '#e4e4e7' }]}>
              <Text style={[styles.tabPillText, textStyle]}>
                {t('stories.addDropsGallery', 'Photos')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleOpenSystemPicker}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="albums-outline" size={24} color={text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {!hasPermission ? (
          <View style={styles.permissionBox}>
            <Icon name="images-outline" size={60} color={mutedText} />
            <Text style={[styles.permissionTitle, textStyle]}>
              {t('post.permissionGalleryTitle', 'Photo Library Access')}
            </Text>
            <Text style={[styles.permissionDesc, { color: mutedText }]}>
              {t(
                'post.permissionGalleryMessage',
                'Please grant photo library access to select photos, or open the system picker.',
              )}
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: accent || '#007AFF' }]}
              onPress={() => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }}
            >
              <Text style={styles.actionBtnText}>{t('post.openSettings', 'Open Settings')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, { borderColor: border }]}
              onPress={handleOpenSystemPicker}
            >
              <Text style={[styles.secondaryActionBtnText, textStyle]}>
                {t('galleryPicker.openSystemPicker', 'Open System Gallery')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : loading && photos.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : (
          <FlatList
            data={gridData}
            renderItem={renderItem}
            keyExtractor={(item, i) => (item.id || item.uri || `photo_${i}`).toString()}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={contentContainerPadding}
            onEndReached={() => {
              if (hasNextPage && !loadingMore && !loading) {
                fetchPhotos(false);
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={accent} />
                </View>
              ) : null
            }
          />
        )}

        {/* Bottom Bar if items are selected */}
        {selectedItems.length > 0 && (
          <View
            style={[
              styles.bottomBar,
              bgStyle,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                borderTopColor: border,
              },
            ]}
          >
            <View style={styles.bottomBarLeft}>
              <Image
                source={{ uri: selectedItems[selectedItems.length - 1].uri }}
                style={styles.selectedPreviewThumb}
              />
              <Text style={[styles.selectedCountText, textStyle]}>
                {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: accent || '#25D366' }]}
              onPress={handleConfirmSelection}
              disabled={isConfirming}
              activeOpacity={0.8}
            >
              {isConfirming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="paper-plane" size={20} color="#fff" />
                  <View style={styles.sendBadge}>
                    <Text style={styles.sendBadgeText}>{selectedItems.length}</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTabs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabPillText: {
    fontSize: 15,
    fontWeight: '600',
  },
  columnWrapper: {
    gap: GAP,
  },
  gridContent: {
    paddingTop: GAP,
  },
  cameraTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginBottom: GAP,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cameraIconCircle: {
    marginBottom: 4,
  },
  cameraTileLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  photoTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginBottom: GAP,
    position: 'relative',
    backgroundColor: '#333',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoIcon: {
    marginRight: 3,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  selectCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircleActive: {
    borderColor: '#ffffff',
  },
  selectNumberText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  bottomBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPreviewThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  selectedCountText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sendBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#000',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
