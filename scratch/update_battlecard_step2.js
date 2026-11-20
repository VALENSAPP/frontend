const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/search/Battlecard.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update useBattleAccent using regex
const useBattleAccentRegex = /const useBattleAccent = \(\) => \{[\s\S]*?return \{[\s\S]*?background:[\s\S]*?\};\s*\};/;
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

if (useBattleAccentRegex.test(code)) {
    code = code.replace(useBattleAccentRegex, newUseBattleAccent);
    console.log('useBattleAccent updated successfully');
} else {
    console.log('useBattleAccent regex failed');
}

// 2. Update ModeBadge using regex
const modeBadgeRegex = /const ModeBadge = \(\{ format, ended, isLive, t \}\) => \{[\s\S]*?<\/View>\s*\);\s*\};/;
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

if (modeBadgeRegex.test(code)) {
    code = code.replace(modeBadgeRegex, newModeBadge);
    console.log('ModeBadge updated successfully');
} else {
    console.log('ModeBadge regex failed');
}

// 3. Update the footer in poll card:
// In lines around line 650-700
const oldFooterBlockRegex = /{\/\* Soft modern footer matching mockup \*\/}[\s\S]*?{\/\* End Date \*\/}[\s\S]*?<\/View>\s*<\/View>/;
const newFooterBlock = `{/* Soft modern footer matching mockup */}
                    <View style={[styles.pollFooterRow, { borderTopColor: isDarkMode ? '#382A4C' : (isBusinessProfile ? '#E8D9BD' : '#EAE4F5') }]}>
                        {/* Stakes */}
                        <View style={[styles.footerStakePill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusinessProfile ? '#FAF7F0' : accentLight) }]}>
                            <Icon name="flash" size={11} color={accent} style={{ marginRight: 4 }} />
                            <Text style={[styles.footerStakeText, { color: accent }]}>
                                {t('battleCard.stakes', 'Stakes')}: <Text style={[styles.footerStakeAmount, { color: accent }]}>{formatAmount(item.stakeAmount || 0)}</Text>
                            </Text>
                        </View>

                        {/* End Date */}
                        <View style={styles.footerDateRow}>
                            <Text style={[styles.footerDateLabel, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#CBA257' : mutedText) }]}>
                                {t('battleCard.ends', 'Ends')}: <Text style={[styles.footerDateVal, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#CBA257' : '#402090') }]}>{formattedEndDate || t('battleCard.noEndDate', '--/--')}</Text>
                            </Text>
                        </View>
                    </View>

                    {/* Participants & Comments centered below */}
                    <View style={styles.footerStatsRowCentered}>
                        <View style={styles.footerStatItem}>
                            <Icon name="people-outline" size={14} color={isBusinessProfile ? '#8C8270' : mutedText} />
                            <Text style={[styles.footerStatText, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#8C8270' : '#402090') }]}>
                                {formatBattleCount(item.totalParticipants || 0)}
                            </Text>
                        </View>
                        <Text style={[styles.footerDot, { color: isBusinessProfile ? '#8C8270' : mutedText }]}>•</Text>
                        <View style={styles.footerStatItem}>
                            <Icon name="chatbubble-outline" size={12} color={isBusinessProfile ? '#8C8270' : mutedText} />
                            <Text style={[styles.footerStatText, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#8C8270' : '#402090') }]}>
                                {formatBattleCount(item.totalComments || 0)}
                            </Text>
                        </View>
                    </View>`;

if (oldFooterBlockRegex.test(code)) {
    code = code.replace(oldFooterBlockRegex, newFooterBlock);
    console.log('Poll footer block updated successfully');
} else {
    console.log('Poll footer regex failed');
}

// 4. Update pollOptions & option styles in StyleSheet:
// Replace pollOptions: { width: '100%', gap: 8, marginBottom: 10 },
const oldPollOptionsRegex = /pollOptions:\s*\{\s*width:\s*'100%',\s*gap:\s*8,\s*marginBottom:\s*10\s*\},/;
const newPollOptions = `pollOptions: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },`;

if (oldPollOptionsRegex.test(code)) {
    code = code.replace(oldPollOptionsRegex, newPollOptions);
    console.log('pollOptions style updated successfully');
} else {
    console.log('pollOptions style regex failed');
}

// Replace optionChip and add side-by-side styles
const oldOptionChipStyleRegex = /optionChip:\s*\{[\s\S]*?marginVertical:\s*4,[\s\S]*?gap:\s*6,\s*\},/;
const newOptionChipStyles = `optionChip: {
        flex: 1,
        minWidth: 120,
        borderRadius: 14,
        paddingVertical: 7,
        paddingHorizontal: 8,
        marginVertical: 4,
        backgroundColor: '#fff',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    optionContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        minHeight: 26,
    },
    optionThumbnailWrap: {
        width: 22,
        height: 22,
        borderRadius: 11,
        overflow: 'hidden',
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    optionThumbnail: {
        width: '100%',
        height: '100%',
    },
    optionTextContainer: {
        flex: 1,
        minWidth: 0,
        marginRight: 4,
    },
    optionPercentInline: {
        fontSize: 12,
        fontWeight: '800',
    },
    optionChipSelectedBusiness: {
        borderColor: '#CBA257',
        backgroundColor: '#FFFFFF',
    },
    footerStatsRowCentered: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingTop: 6,
    },`;

if (oldOptionChipStyleRegex.test(code)) {
    code = code.replace(oldOptionChipStyleRegex, newOptionChipStyles);
    console.log('optionChip styles updated successfully');
} else {
    console.log('optionChipStyle regex failed');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Battlecard.js fully written');
