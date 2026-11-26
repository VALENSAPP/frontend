import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useNavigation } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/Ionicons';
import { LogoIcon } from '../../assets/icons';
import { useAppTheme } from '../../theme/useApptheme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n';
import { isBusinessProfileType } from '../../theme/theme';

const { height } = Dimensions.get('window');

const PERSONA_LAUNCH = require('../../assets/Valens Stickers/Valens Stickers/PNG/launchnew.png');
const BUSINESS_LAUNCH = require('../../assets/Valens Stickers/Valens Stickers/PNG/launchG.png');
const PERSONA_LEADING = require('../../assets/Valens Stickers/Valens Stickers/PNG/leading-remove.png');
const BUSINESS_LEADING = require('../../assets/Valens Stickers/Valens Stickers/PNG/LeadingG.png');

const AuthHeader = ({
  title = 'VALENS',
  subtitle,
  showBackButton = true,
  onBackPress,
  headerHeight = height * 0.3,
  logoSize,
  titleSize = 30,
  subtitleSize = 14,
  fromsetAccountType = false,
  profileType,
  isFirstLaunch,
  mascotType, // 'launch' | 'leading'
  mascotSource, // optional direct override
  useLogoIcon = false, // fallback to SVG logo if needed
}) => {
  const isBusiness = isBusinessProfileType(profileType);
  const resolvedProfileType = isBusiness ? 'company' : 'user';
  const { bgStyle, textStyle, text, accent, mutedText, icon, card } = useAppTheme(resolvedProfileType);
  const { isDarkMode } = useThemeContext();
  const { t } = useLanguage();
  const navigation = useNavigation();

  const onPress = () => {
    navigation.navigate('Login');
  };

  const resolvedMascotType = mascotType || (fromsetAccountType ? 'leading' : 'launch');

  const resolvedMascotSource = useMemo(() => {
    if (mascotSource) return mascotSource;
    if (resolvedMascotType === 'leading') {
      return isBusiness ? BUSINESS_LEADING : PERSONA_LEADING;
    }
    return isBusiness ? BUSINESS_LAUNCH : PERSONA_LAUNCH;
  }, [mascotSource, resolvedMascotType, isBusiness]);

  const mascotWidth = logoSize || 120;
  const mascotHeight = logoSize ? logoSize * 0.95 : 115;

  return (
    <View style={[styles.headerGradient, { minHeight: headerHeight }, !fromsetAccountType && bgStyle]}>
      <View style={styles.headerContent}>
        {isFirstLaunch && showBackButton && (
          <TouchableOpacity
            style={[styles.backButton, { shadowColor: text, backgroundColor: isDarkMode ? card : 'rgba(255, 255, 255, 0.9)' }]}
            onPress={onBackPress}
          >
            <Icon name="arrow-back" size={24} color={icon} />
          </TouchableOpacity>
        )}

        <View style={styles.logoContainer}>
          {useLogoIcon ? (
            <View style={styles.logoBackground}>
              <LogoIcon height={logoSize || 80} width={logoSize || 80} />
            </View>
          ) : (
            <Image
              source={resolvedMascotSource}
              style={[styles.mascotImage, { width: mascotWidth, height: mascotHeight }]}
              resizeMode="contain"
            />
          )}

          <View style={styles.brandContainer}>
            <Text style={[styles.brandTitle, { fontSize: titleSize }, textStyle]}>
              {title}
            </Text>
            {subtitle && (
              <>
                <Text style={[styles.tagline, { fontSize: subtitleSize }, textStyle]}>
                  {subtitle}
                </Text>
                {fromsetAccountType && (
                  <View style={styles.loginContainer}>
                    <Text
                      style={[
                        styles.tagline,
                        {
                          fontSize: subtitleSize,
                          color: mutedText,
                          marginBottom: 0,
                        },
                      ]}>
                      {t('selectAccountType.alreadyHaveAccount')}
                    </Text>

                    <TouchableOpacity
                      onPress={onPress}
                      style={[styles.loginBtn, { borderColor: accent, backgroundColor: `${accent}22` }]}>
                      <Text style={[styles.loginBtnText, { color: accent }]}>
                        {t('selectAccountType.login')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.decorativeElements} />
      </View>
    </View>
  );
};

const styles = {
  headerGradient: {
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    position: 'absolute',
    top: 30,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  mascotImage: {
    marginBottom: 6,
  },
  logoBackground: {
    borderRadius: 35,
    padding: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 0,
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontWeight: '500',
    opacity: 0.8,
    marginTop: 0,
    marginBottom: 7,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  decorativeElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  loginBtn: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(90, 45, 130, 0.12)",
    borderWidth: 1.5,
    borderColor: "#5a2d82",
    overflow: "hidden",
  },
  loginBtnText: {
    color: "#5a2d82",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 14,
  },
};

export default AuthHeader;
