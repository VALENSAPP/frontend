const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/search/BattleExplore.js');
let code = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// Replace Header + Search + ExploreBannerRow with topSearchRow matching Image 2
const oldTopSectionRegex = /{\/\* Header \*\/}[\s\S]*?{\/\* Explore Banner & Filter row matching mockup \*\/}[\s\S]*?<\/View>\s*<\/View>/;

const newTopSection = `{/* Top Search & Filter Bar matching Image 2 mockup */}
      <View style={styles.topSearchRow}>
        {!!onClose && (
          <TouchableOpacity onPress={() => onClose?.()} style={styles.backBtnInline}>
            <Icon name="arrow-back" size={24} color={icon} />
          </TouchableOpacity>
        )}
        <View style={[styles.searchContainer, { backgroundColor: card, borderColor: border, flex: 1, marginBottom: 0 }]}>
          <Icon name="search" size={20} color={mutedText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: labelColor }]}
            placeholder={t('search.searchBattlesUsersPlaceholder', 'Search battles, users or businesses...')}
            placeholderTextColor={mutedText}
            value={searchText}
            onChangeText={handleSearch}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              style={styles.clearSearchBtn}>
              <Icon name="close-circle" size={18} color={mutedText} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterCircleBtn,
            {
              backgroundColor: isBusinessProfile ? '#F5EEDD' : (isDarkMode ? '#241D30' : card),
              borderColor: border,
            },
          ]}
          activeOpacity={0.8}
          onPress={() => {
            showToastMessage(toastRef.current, 'normal', t('battleExplore.filtersNotice', 'Filters'));
          }}
          accessibilityRole="button"
          accessibilityLabel={t('search.filter', 'Filter')}
        >
          <Icon name="options-outline" size={20} color={isBusinessProfile ? '#8C6010' : accent} />
        </TouchableOpacity>
      </View>`;

if (oldTopSectionRegex.test(code)) {
  code = code.replace(oldTopSectionRegex, newTopSection);
  console.log('BattleExplore top section replaced');
} else {
  console.log('BattleExplore top section regex failed');
}

// Add topSearchRow, backBtnInline, filterCircleBtn styles
const newExploreStyles = `
  topSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Platform.OS === 'android' ? 40 : 55,
    marginBottom: 12,
  },
  backBtnInline: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
`;

code = code.replace('const styles = StyleSheet.create({', 'const styles = StyleSheet.create({' + newExploreStyles);

fs.writeFileSync(filePath, code, 'utf8');
console.log('BattleExplore.js updated for Image 2 mockup');
