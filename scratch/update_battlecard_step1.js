const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/search/Battlecard.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update useBattleAccent
const oldUseBattleAccent = `const useBattleAccent = () => {
    const {
        primary,
        accent,
        isBusinessProfile,
        card,
        border,
        text,
        mutedText,
        screenBackground,
    } = useBusinessProfileTheme();
    const { isDarkMode } = useThemeContext();

    const brandAccent = accent || (isBusinessProfile ? '#CBA257' : '#402090');
    const brandCard = isDarkMode ? '#1E1729' : (card || '#FFFFFF');
    const brandBorder = isDarkMode ? '#382A4C' : (border || (isBusinessProfile ? '#E8D9BD' : '#EAE4F5'));

    const accentLight = isBusinessProfile
        ? (isDarkMode ? 'rgba(203,162,87,0.22)' : 'rgba(203,162,87,0.12)')
        : (isDarkMode ? 'rgba(64,32,144,0.25)' : '#F0EAFF');

    const accentSoftText = isDarkMode
        ? (isBusinessProfile ? '#F0E0B8' : '#E8DEFF')
        : brandAccent;

    return {
        accent: brandAccent,
        accentLight,
        accentDark: brandAccent,
        accentSoftText,
        isDarkMode,
        card: brandCard,
        border: brandBorder,
        text: brandAccent,
        mutedText: isDarkMode ? '#A59DB5' : (isBusinessProfile ? '#8C8270' : (mutedText || '#7A7289')),
        isBusinessProfile,
        background: isDarkMode ? '#121212' : (screenBackground || (isBusinessProfile ? '#FAF7F0' : '#FAF7FD')),
    };
};`;

const newUseBattleAccent = `const useBattleAccent = () => {
    const {
        primary,
        accent,
        isBusinessProfile,
        card,
        border,
        text,
        mutedText,
        screenBackground,
    } = useBusinessProfileTheme();
    const { isDarkMode } = useThemeContext();

    const brandAccent = accent || (isBusinessProfile ? '#CBA257' : '#402090');
    const brandCard = isDarkMode ? '#1E1729' : (card || '#FFFFFF');
    const brandBorder = isDarkMode ? '#382A4C' : (isBusinessProfile ? '#E8D9BD' : (border || '#EAE4F5'));

    const accentLight = isBusinessProfile
        ? (isDarkMode ? 'rgba(203,162,87,0.22)' : 'rgba(203,162,87,0.12)')
        : (isDarkMode ? 'rgba(64,32,144,0.25)' : '#F0EAFF');

    const accentSoftText = isDarkMode
        ? (isBusinessProfile ? '#F0E0B8' : '#E8DEFF')
        : brandAccent;

    return {
        accent: brandAccent,
        accentLight,
        accentDark: brandAccent,
        accentSoftText,
        isDarkMode,
        card: brandCard,
        border: brandBorder,
        text: brandAccent,
        mutedText: isDarkMode ? '#A59DB5' : (isBusinessProfile ? '#8C8270' : (mutedText || '#7A7289')),
        isBusinessProfile,
        background: isDarkMode ? '#121212' : (isBusinessProfile ? '#FAF7F0' : (screenBackground || '#FAF7FD')),
    };
};`;

if (code.includes(oldUseBattleAccent)) {
    code = code.replace(oldUseBattleAccent, newUseBattleAccent);
    console.log('useBattleAccent updated');
} else {
    console.log('useBattleAccent pattern not matched exactly, checking...');
}

// 2. Update ModeBadge
const oldModeBadge = `const ModeBadge = ({ format, ended, isLive, t }) => {
    const { isDarkMode } = useBattleAccent();
    return (
        <View
            style={[
                styles.modeBadge,
                {
                    backgroundColor: isDarkMode ? '#2B2338' : '#FFFFFF',
                    borderColor: isDarkMode ? '#3E3250' : '#ECE8F6',
                },
                ended && styles.modeBadgeEnded,
            ]}
        >
            {!ended && <View style={styles.modeBadgeDotGreen} />}
            <Text
                style={[
                    styles.modeBadgeText,
                    { color: isDarkMode ? '#E2D9F3' : '#321D50' },
                    ended && styles.modeBadgeTextEnded,
                ]}
                numberOfLines={1}
            >
                {format === 'POLL'
                    ? t('battleCard.poll', 'POLL')
                    : format === 'PREDICTION'
                        ? t('battleCard.prediction', 'PREDICTION')
                        : t('battleCard.battleMode', 'BATTLE')}
            </Text>
        </View>
    );
};`;

const newModeBadge = `const ModeBadge = ({ format, ended, isLive, t }) => {
    const { isDarkMode, isBusinessProfile } = useBattleAccent();
    return (
        <View
            style={[
                styles.modeBadge,
                {
                    backgroundColor: isDarkMode ? '#2B2338' : '#FFFFFF',
                    borderColor: isDarkMode ? '#3E3250' : (isBusinessProfile ? '#E8D9BD' : '#ECE8F6'),
                },
                ended && styles.modeBadgeEnded,
            ]}
        >
            {!ended && <View style={styles.modeBadgeDotGreen} />}
            <Text
                style={[
                    styles.modeBadgeText,
                    { color: isDarkMode ? '#E2D9F3' : (isBusinessProfile ? '#CBA257' : '#321D50') },
                    ended && styles.modeBadgeTextEnded,
                ]}
                numberOfLines={1}
            >
                {format === 'POLL'
                    ? t('battleCard.poll', 'POLL')
                    : format === 'PREDICTION'
                        ? t('battleCard.prediction', 'PREDICTION')
                        : t('battleCard.battleMode', 'BATTLE')}
            </Text>
        </View>
    );
};`;

if (code.includes(oldModeBadge)) {
    code = code.replace(oldModeBadge, newModeBadge);
    console.log('ModeBadge updated');
} else {
    console.log('ModeBadge pattern not matched');
}

// 3. Update OptionChip
const oldOptionChipRegex = /const OptionChip = \(\{[\s\S]*?return \([\s\S]*?<\/TouchableOpacity>\s*\);\s*\};/;
const newOptionChip = `const OptionChip = ({
    option,
    isSelected,
    onPress,
    disabled,
    avatarUrl,
    imageUrl,
    teamLogoUrl,
    percent,
    onImagePress,
}) => {
    const { accent, border, mutedText, isDarkMode, isBusinessProfile } = useBattleAccent();
    const safePercent = Number.isFinite(percent)
        ? Math.max(0, Math.min(100, Math.round(percent)))
        : 0;
    const label = option?.label || option;
    const labelColor = isDarkMode ? '#F5F0FF' : (isBusinessProfile ? '#CBA257' : '#1F1435');

    const resolvedImage = normalizeImageUrl(
        imageUrl || option?.image || option?.imageUrl || option?.picture || (avatarUrl !== DEFAULT_AVATAR ? avatarUrl : null)
    );

    const handleImagePress = (e) => {
        e?.stopPropagation?.();
        if (resolvedImage) {
            onImagePress?.(resolvedImage, label);
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.88}
            disabled={disabled}
            onPress={onPress}
            style={[
                styles.optionChip,
                {
                    backgroundColor: isDarkMode ? '#241D30' : '#FFFFFF',
                    borderColor: isSelected
                        ? (isDarkMode ? '#C084FC' : accent)
                        : (isDarkMode ? '#382A4C' : (isBusinessProfile ? '#E8D9BD' : border)),
                    borderWidth: isSelected ? 1.5 : 1,
                },
                isSelected && (isDarkMode ? styles.optionChipSelectedDark : (isBusinessProfile ? styles.optionChipSelectedBusiness : styles.optionChipSelected)),
                disabled && styles.optionDisabled,
            ]}
        >
            <View style={styles.optionContentRow}>
                {/* Team Logo / Image Thumbnail */}
                {resolvedImage ? (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleImagePress}
                        style={styles.optionThumbnailWrap}
                    >
                        <Image
                            source={{ uri: resolvedImage }}
                            style={styles.optionThumbnail}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                ) : teamLogoUrl ? (
                    <View style={styles.optionThumbnailWrap}>
                        <Image
                            source={{ uri: normalizeImageUrl(teamLogoUrl) }}
                            style={styles.optionThumbnail}
                            resizeMode="contain"
                        />
                    </View>
                ) : null}

                {/* Text: Label & Percent */}
                <View style={styles.optionTextContainer}>
                    <Text
                        style={[
                            styles.optionChipLabel,
                            { color: isSelected ? (isDarkMode ? '#F5F0FF' : accent) : labelColor },
                        ]}
                        numberOfLines={1}
                    >
                        {label}{' '}
                        <Text
                            style={[
                                styles.optionPercentInline,
                                { color: isSelected ? (isDarkMode ? '#C084FC' : accent) : (isDarkMode ? '#A598B8' : (isBusinessProfile ? '#CBA257' : mutedText)) },
                            ]}
                        >
                            {safePercent}%
                        </Text>
                    </Text>
                </View>

                {/* Radio Circle */}
                <View
                    style={[
                        styles.radioCircle,
                        {
                            borderColor: isSelected
                                ? (isDarkMode ? '#C084FC' : accent)
                                : (isDarkMode ? '#5C4E75' : (isBusinessProfile ? '#E8D9BD' : '#D1C8E5')),
                            backgroundColor: isDarkMode ? 'transparent' : '#FFFFFF',
                        },
                    ]}
                >
                    {isSelected && (
                        <View
                            style={[
                                styles.radioInner,
                                { backgroundColor: isDarkMode ? '#C084FC' : accent },
                            ]}
                        />
                    )}
                </View>
            </View>

            {/* Progress Bar at Bottom */}
            <View
                style={[
                    styles.optionProgressTrack,
                    { backgroundColor: isDarkMode ? '#352B44' : (isBusinessProfile ? '#FAF7F0' : '#EFEBF8') },
                ]}
            >
                <View
                    style={[
                        styles.optionProgressFill,
                        {
                            width: \`\${safePercent}%\`,
                            backgroundColor: isDarkMode ? '#A855F7' : accent,
                        },
                    ]}
                />
            </View>
        </TouchableOpacity>
    );
};`;

if (oldOptionChipRegex.test(code)) {
    code = code.replace(oldOptionChipRegex, newOptionChip);
    console.log('OptionChip updated');
} else {
    console.log('OptionChip regex not matched');
}

// 4. Update the poll footer
const oldFooterRegex = /{\/\* Soft modern footer matching mockup \*\/}[\s\S]*?<\/View>\s*<\/View>\s*<\/View>/;
// Let's inspect the exact lines around line 722 of Battlecard.js first!
fs.writeFileSync(filePath, code, 'utf8');
console.log('Updated Battlecard.js step 1');
