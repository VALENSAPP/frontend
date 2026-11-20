const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/search/BattleExplore.js');
let code = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const startMarker = '{/* Header */}';
const endMarker = '{/* List */}';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `{/* Top Search & Filter Bar matching Image 2 mockup */}
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
      </View>

      `;

  const updated = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('BattleExplore top section successfully replaced!');
} else {
  console.log('Markers not found', startIndex, endIndex);
}
