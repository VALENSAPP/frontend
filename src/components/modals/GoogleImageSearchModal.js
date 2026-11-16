import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppTheme } from '../../theme/useApptheme';
import { useLanguage } from '../../i18n';
import { searchOnlineImages } from '../../services/imageSearch';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 12;
const PADDING = 16;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - PADDING * 2 - COLUMN_GAP) / 2);

export default function GoogleImageSearchModal({
  visible,
  initialQuery = '',
  onSelectImage,
  onClose,
}) {
  const { bg, card, text, border, mutedText, accent, isDarkMode } = useAppTheme();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);

  const performSearch = useCallback(async query => {
    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 2) {
      setImages([]);
      setHasSearched(false);
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);
    setSelectedImage(null);

    try {
      const results = await searchOnlineImages(trimmed);
      setImages(results || []);
    } catch (error) {
      console.warn('[GoogleImageSearchModal] Search error:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      const initial = (initialQuery || '').trim();
      setSearchQuery(initial);
      setSelectedImage(null);
      if (initial.length >= 2) {
        performSearch(initial);
      } else {
        setImages([]);
        setHasSearched(false);
      }
    }
  }, [visible, initialQuery, performSearch]);

  const handleSearchSubmit = () => {
    performSearch(searchQuery);
  };

  const handleSelectCard = item => {
    if (selectedImage?.url === item.url) {
      setSelectedImage(null);
    } else {
      setSelectedImage(item);
    }
  };

  const handleUseImage = () => {
    if (selectedImage?.url && onSelectImage) {
      onSelectImage(selectedImage.url);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedImage?.url === item.url;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
            borderColor: isSelected ? accent : 'transparent',
            borderWidth: isSelected ? 3 : 1,
          },
        ]}
        onPress={() => handleSelectCard(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.thumbUrl || item.url }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        {isSelected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={24} color={accent} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
        {/* Header with Search Bar */}
        <View style={[styles.header, { backgroundColor: card, borderBottomColor: border }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={text} />
          </TouchableOpacity>

          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' },
            ]}
          >
            <Ionicons name="search" size={18} color={mutedText} style={{ marginRight: 6 }} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('openBattle.searchGooglePlaceholder', 'Search images...')}
              placeholderTextColor={mutedText}
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={mutedText} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: accent }]}
            onPress={handleSearchSubmit}
          >
            <Ionicons name="search" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Helper Hint */}
        <View style={[styles.hintBanner, { backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff' }]}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#3b82f6"
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.hintText, { color: isDarkMode ? '#93c5fd' : '#1d4ed8' }]}>
            {t('openBattle.selectImageHint', 'Tap any image to select it, then press "Use Image".')}
          </Text>
        </View>

        {/* Content Area */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={[styles.loadingText, { color: mutedText }]}>
              {t('openBattle.searchingImages', 'Searching images...')}
            </Text>
          </View>
        ) : images.length > 0 ? (
          <FlatList
            data={images}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
          />
        ) : hasSearched ? (
          <View style={styles.centerContainer}>
            <Ionicons name="image-outline" size={56} color={mutedText} style={{ opacity: 0.6 }} />
            <Text style={[styles.emptyTitle, { color: text }]}>
              {t('openBattle.noImagesFound', 'No images found')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: mutedText }]}>
              {t('openBattle.tryDifferentSearch', 'Try searching for another keyword or city name.')}
            </Text>
          </View>
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="search-outline" size={56} color={mutedText} style={{ opacity: 0.6 }} />
            <Text style={[styles.emptyTitle, { color: text }]}>
              {t('openBattle.searchImagesPrompt', 'Search for Images')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: mutedText }]}>
              {t('openBattle.searchImagesPromptDesc', 'Type a city, food, or landmark above to find photos.')}
            </Text>
          </View>
        )}

        {/* Bottom Action Bar */}
        {selectedImage && (
          <SafeAreaView
            edges={['bottom']}
            style={[styles.bottomBar, { backgroundColor: card, borderTopColor: border }]}
          >
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: selectedImage.thumbUrl || selectedImage.url }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.previewTextCol}>
                <Text style={[styles.previewTitle, { color: text }]} numberOfLines={1}>
                  {selectedImage.title || t('openBattle.imageSelected', 'Image Selected')}
                </Text>
                <Text style={[styles.previewSubtitle, { color: mutedText }]} numberOfLines={1}>
                  {t('openBattle.readyToUse', 'Ready to attach to option')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.previewClearBtn}
                onPress={() => setSelectedImage(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle-outline" size={24} color={mutedText} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.useImageBtn, { backgroundColor: accent }]}
              onPress={handleUseImage}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.useImageBtnText}>
                {t('openBattle.useImage', 'Use This Image')}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    padding: 6,
    marginRight: 6,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  listContent: {
    padding: PADDING,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: COLUMN_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 4 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  previewTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  previewClearBtn: {
    padding: 6,
  },
  useImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
  },
  useImageBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
