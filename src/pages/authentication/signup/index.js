import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { AppleLogo, Google, Twitter } from '../../../assets/icons';
import { hideLoader, showLoader } from '../../../redux/actions/LoaderAction';
import { showToastMessage } from '../../../components/displaytoastmessage';
import { useToast } from 'react-native-toast-notifications';
import useSignupStyles from './Style';
import {
  onAppleButtonPress,
  onGoogleButtonPress,
  twitterOAuthLogin,
} from '../socialLogin';
import { signup, checkUsername } from '../../../services/authentication';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthHeader } from '../../../components/auth';
import DeviceInfo from 'react-native-device-info';
import { useAppTheme } from '../../../theme/useApptheme';
import { setUserProfile } from '../../../redux/actions/UserProfileAction';
import { setSignupFormData, clearSignupFormData } from '../../../redux/actions/SignupFormAction';
import { useLanguage } from '../../../i18n';
import { validateUsername } from '../../../utils/validation';
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback';

const countryCodeToFlag = (cca2 = '') => {
  const code = String(cca2).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(
    ...[...code].map(char => 0x1f1e6 - 65 + char.charCodeAt(0)),
  );
};

const isEmojiFlag = value =>
  typeof value === 'string' &&
  value.length >= 2 &&
  !value.toLowerCase().startsWith('flag-');

// Load country data from the installed library's asset
let ALL_COUNTRIES = [];
try {
  const countriesData = require('react-native-country-picker-modal/lib/assets/data/countries-emoji.json');
  ALL_COUNTRIES = Object.entries(countriesData)
    .map(([cca2, data]) => ({
      cca2,
      name: data && data.name ? (data.name.common || cca2) : cca2,
      flag: isEmojiFlag(data?.flag) ? data.flag : countryCodeToFlag(cca2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
} catch (e) {
  console.warn('Could not load countries data:', e);
}

export default function SignupScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const dispatch = useDispatch();
  const { t } = useLanguage();

  const savedFormData = useSelector(state => state.signupForm);

  const [email, setEmail] = useState('');
  const [userName, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [countryName, setCountryName] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryKeyboardHeight, setCountryKeyboardHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const lastCheckedUsernameRef = useRef('');

  const profileFromRoute = route?.params?.profile || 'user';
  const styles = useSignupStyles();
  const profile = profileFromRoute;
  const { bgStyle, text, accent, mutedText, bg, card, border } = useAppTheme(profile);
  const isSignupDisabled = usernameStatus === 'taken' || isCheckingUsername;

  // Filtered country list based on search
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return ALL_COUNTRIES;
    const q = countrySearch.trim().toLowerCase();
    return ALL_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.cca2.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  useEffect(() => {
    if (!showCountryPicker) {
      setCountryKeyboardHeight(0);
      return undefined;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = event => {
      setCountryKeyboardHeight(event?.endCoordinates?.height || 0);
    };
    const onHide = () => setCountryKeyboardHeight(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [showCountryPicker]);

  const countrySheetHeight = useMemo(() => {
    const closedHeight = Math.round(windowHeight * 0.85);
    if (!countryKeyboardHeight) return closedHeight;
    return Math.max(Math.round(windowHeight * 0.42), windowHeight - countryKeyboardHeight);
  }, [windowHeight, countryKeyboardHeight]);

  const checkUsernameAvailability = async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed.length < 2) {
      setIsCheckingUsername(false);
      setUsernameStatus(null);
      setUsernameSuggestions([]);
      return;
    }

    lastCheckedUsernameRef.current = trimmed;
    setIsCheckingUsername(true);
    setUsernameStatus('checking');
    setUsernameSuggestions([]);

    try {
      const resp = await checkUsername({ userName: trimmed, username: trimmed });
      console.log('Username check response:', resp);

      if (lastCheckedUsernameRef.current !== trimmed) {
        return;
      }

      const isSuccess =
        resp &&
        (resp.statusCode === 200 || resp.statusCode === 201) &&
        resp.success !== false;
      const data = resp?.data || {};
      const isAvail =
        isSuccess &&
        data.isAvailable !== false &&
        data.status !== 'taken';
      const suggestions = data.suggestions || resp?.suggestions || [];
      const message = data.message || resp?.message;

      if (isAvail) {
        setUsernameStatus('approved');
        setUsernameSuggestions([]);
        setErrors(prev => {
          const next = { ...prev };
          delete next.userName;
          return next;
        });
      } else {
        setUsernameStatus('taken');
        if (suggestions.length > 0) {
          setUsernameSuggestions(suggestions);
        }
        setErrors(prev => ({
          ...prev,
          userName:
            message ||
            t('signup.usernameTaken') ||
            t('createProfile.usernameTaken'),
        }));
      }
    } catch (err) {
      console.error('Username check error:', err);
      if (lastCheckedUsernameRef.current === trimmed) {
        setUsernameStatus(null);
      }
    } finally {
      if (lastCheckedUsernameRef.current === trimmed) {
        setIsCheckingUsername(false);
      }
    }
  };

  const debouncedCheckUsername = useDebouncedCallback(checkUsernameAvailability, 500);

  const handleUsernameChange = (value) => {
    setUsername(value);
    const userNameError = validateUsername(value, t);
    setErrors(prev => {
      const next = { ...prev };
      if (userNameError) next.userName = userNameError;
      else delete next.userName;
      return next;
    });

    const trimmed = value.trim();
    if (!userNameError && trimmed.length >= 2) {
      setIsCheckingUsername(true);
      setUsernameStatus('checking');
      debouncedCheckUsername(trimmed);
    } else {
      setIsCheckingUsername(false);
      setUsernameStatus(null);
      setUsernameSuggestions([]);
    }
  };

  const selectUsernameSuggestion = (suggestion) => {
    setUsername(suggestion);
    setUsernameSuggestions([]);
    setErrors(prev => {
      const next = { ...prev };
      delete next.userName;
      return next;
    });
    checkUsernameAvailability(suggestion);
  };

  useFocusEffect(
    useCallback(() => {
      setEmail(savedFormData?.email || '');
      const savedUser = savedFormData?.userName || '';
      setUsername(savedUser);
      setPassword(savedFormData?.password || '');
      setReferralCode(savedFormData?.referralCode || '');
      setCountry(savedFormData?.country || '');
      setCountryName(savedFormData?.countryName || '');
      if (savedUser && savedUser.trim().length >= 2) {
        checkUsernameAvailability(savedUser);
      }
    }, [savedFormData])
  );

  useEffect(() => {
    dispatch(setUserProfile(profile));
  }, [profile, dispatch]);

  useEffect(() => {
    const loadDeviceId = async () => {
      const DeviceId = await DeviceInfo.getDeviceName();
      console.log('Saved Device ID:', DeviceId);
    };
    loadDeviceId();
  }, []);

  const validate = () => {
    const errs = {};

    if (!email.trim()) errs.email = t('signup.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = t('signup.emailInvalid');
    }

    const userNameError = validateUsername(userName, t);
    if (userNameError) {
      errs.userName = userNameError;
    } else if (usernameStatus === 'taken') {
      errs.userName = errors.userName || t('signup.usernameTaken') || t('createProfile.usernameTaken');
    }

    if (!country) {
      errs.country = t('signup.countryRequired');
    }

    if (!password) {
      errs.password = t('signup.passwordRequired');
    } else if (password.length < 8) {
      errs.password = t('signup.passwordMinLength');
    } else if (
      !/(?=.*[A-Z])/.test(password) ||
      !/(?=.*[a-z])/.test(password) ||
      !/(?=.*\d)/.test(password) ||
      !/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)
    ) {
      errs.password = t('signup.passwordRules');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignUp = async () => {
    Keyboard.dismiss();
    if (!validate()) return;

    const normalizedEmail = email.trim();
    const normalizedUserName = userName.trim();
    const normalizedReferralCode = referralCode.trim();

    if (isCheckingUsername) {
      showToastMessage(
        toast,
        'warning',
        t('signup.usernameChecking') || 'Checking username availability, please wait...'
      );
      return;
    }

    if (usernameStatus === 'taken') {
      showToastMessage(
        toast,
        'danger',
        errors.userName || t('signup.usernameTaken') || t('createProfile.usernameTaken')
      );
      return;
    }

    dispatch(showLoader());

    if (usernameStatus !== 'approved') {
      try {
        const checkResp = await checkUsername({
          userName: normalizedUserName,
          username: normalizedUserName,
        });
        const isSuccess =
          checkResp &&
          (checkResp.statusCode === 200 || checkResp.statusCode === 201) &&
          checkResp.success !== false;
        const checkData = checkResp?.data || {};
        const isAvail =
          isSuccess &&
          checkData.isAvailable !== false &&
          checkData.status !== 'taken';

        if (!isAvail) {
          dispatch(hideLoader());
          setUsernameStatus('taken');
          const errMsg =
            checkData.message ||
            checkResp?.message ||
            t('signup.usernameTaken') ||
            t('createProfile.usernameTaken');
          const suggestions = checkData.suggestions || checkResp?.suggestions || [];
          if (suggestions.length > 0) setUsernameSuggestions(suggestions);
          setErrors(prev => ({ ...prev, userName: errMsg }));
          showToastMessage(toast, 'danger', errMsg);
          return;
        }
        setUsernameStatus('approved');
      } catch (checkErr) {
        console.warn('Username pre-check error:', checkErr);
      }
    }

    try {
      const signupPayload = {
        email: normalizedEmail,
        password,
        registrationType: 'NORMAL',
        userName: normalizedUserName,
        country,
        profile,
      };

      if (normalizedReferralCode) {
        signupPayload.referrerCode = normalizedReferralCode;
      }

      const signupResponse = await signup(signupPayload);
      if (
        signupResponse &&
        (signupResponse.statusCode === 200 || signupResponse.statusCode === 201)
      ) {
        dispatch(hideLoader());
        dispatch(setSignupFormData({
          email: normalizedEmail,
          userName: normalizedUserName,
          password,
          referralCode: normalizedReferralCode,
          country,
          countryName,
        }));
        navigation.navigate('OTPScreen', {
          email: normalizedEmail,
          password,
          type: 'signup',
          profile,
        });
      } else {
        dispatch(hideLoader());
        showToastMessage(toast, 'danger', signupResponse?.message || 'Signup failed.');
      }
    } catch (error) {
      showToastMessage(
        toast,
        'danger',
        error?.response?.message || error?.message || 'Signup failed.',
      );
      dispatch(hideLoader());
    }
  };

  const handleGoogleButtonPress = async () => {
    dispatch(showLoader());
    try {
      await onGoogleButtonPress(dispatch, navigation, toast, profile, t);
    } finally {
      dispatch(hideLoader());
    }
  };

  const handlAppleLogin = async () => {
    dispatch(showLoader());
    try {
      await onAppleButtonPress(dispatch, navigation, toast, profile, t);
    } catch (error) {
      // handled inside
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleTwitterButtonPress = async () => {
    dispatch(showLoader());
    twitterOAuthLogin(dispatch, toast, navigation, profile, t);
    dispatch(hideLoader());
  };

  const handleBackPress = () => {
    dispatch(clearSignupFormData());
    dispatch(setUserProfile('user'));
    setUsernameStatus(null);
    setUsernameSuggestions([]);
    navigation.navigate('SelectAccountType');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={24}
        extraHeight={Platform.OS === 'ios' ? 120 : 150}
        resetScrollToCoords={{ x: 0, y: 0 }}
      >
        {/* Header */}
        <AuthHeader
          subtitle={t('signup.headerSubtitle')}
          profileType={profile}
          onBackPress={handleBackPress}
          isFirstLaunch={true}
        />

        {/* Form Card */}
        <View style={styles.formWrapper}>
          <View style={styles.card}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>{t('signup.welcomeTitle')}</Text>
              <Text style={styles.welcomeSubtitle}>{t('signup.welcomeSubtitle')}</Text>
            </View>

            <View style={styles.inputContainer}>
              {/* Email */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{t('signup.emailLabel')}</Text>
                <View style={[styles.inputGroup, errors.email && styles.inputError]}>
                  <View style={[styles.inputIconContainer, bgStyle]}>
                    <Icon name="mail-outline" size={22} color={text} />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('signup.emailPlaceholder')}
                    placeholderTextColor={mutedText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={value => {
                      setEmail(value);
                      if (errors.email) {
                        const next = { ...errors };
                        delete next.email;
                        setErrors(next);
                      }
                    }}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Username */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{t('signup.usernameLabel')}</Text>
                <View style={[styles.inputGroup, errors.userName && styles.inputError]}>
                  <View style={[styles.inputIconContainer, bgStyle]}>
                    <Icon name="person-outline" size={22} color={text} />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('signup.usernamePlaceholder')}
                    placeholderTextColor={mutedText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={userName}
                    onChangeText={handleUsernameChange}
                  />
                  {isCheckingUsername && (
                    <ActivityIndicator
                      size="small"
                      color={accent || '#6B7280'}
                      style={styles.statusIndicator}
                    />
                  )}
                  {usernameStatus === 'approved' && !isCheckingUsername && (
                    <Icon
                      name="checkmark-circle"
                      size={20}
                      color="#10B981"
                      style={styles.statusIndicator}
                    />
                  )}
                  {usernameStatus === 'taken' && !isCheckingUsername && (
                    <Icon
                      name="close-circle"
                      size={20}
                      color="#EF4444"
                      style={styles.statusIndicator}
                    />
                  )}
                </View>
                {errors.userName && <Text style={styles.errorText}>{errors.userName}</Text>}

                {usernameSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionsTitle}>
                      {t('signup.suggestions') || t('createProfile.suggestions') || 'Suggestions:'}
                    </Text>
                    <FlatList
                      data={usernameSuggestions}
                      keyExtractor={(item, index) => index.toString()}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.suggestionChip}
                          onPress={() => selectUsernameSuggestion(item)}
                        >
                          <Text style={styles.suggestionText}>{item}</Text>
                        </TouchableOpacity>
                      )}
                      contentContainerStyle={styles.suggestionsList}
                    />
                  </View>
                )}
              </View>

              {/* Country */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{t('signup.countryLabel')}</Text>
                <TouchableOpacity
                  style={[styles.inputGroup, errors.country && styles.inputError]}
                  onPress={() => {
                    setCountrySearch('');
                    setShowCountryPicker(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.inputIconContainer, bgStyle]}>
                    <Icon name="earth-outline" size={22} color={text} />
                  </View>
                  <Text
                    style={[
                      styles.textInput,
                      !country && { color: mutedText },
                    ]}
                    numberOfLines={1}
                  >
                    {countryName
                      ? `${ALL_COUNTRIES.find(c => c.cca2 === country)?.flag || ''} ${countryName}`
                      : t('signup.countryPlaceholder')}
                  </Text>
                  <Icon name="chevron-down" size={20} color={mutedText} />
                </TouchableOpacity>
                {errors.country && <Text style={styles.errorText}>{errors.country}</Text>}
              </View>

              {/* Custom Country Picker Modal */}
              <Modal
                visible={showCountryPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCountryPicker(false)}
              >
                <View
                  style={[
                    styles.countryModalOverlay,
                    countryKeyboardHeight > 0 && {
                      justifyContent: 'flex-end',
                      paddingBottom: countryKeyboardHeight,
                    },
                  ]}
                >
                  <SafeAreaView
                    style={[
                      styles.countryModalContainer,
                      {
                        backgroundColor: card,
                        height: countrySheetHeight,
                      },
                    ]}
                  >
                    {/* Modal Header */}
                    <View style={[styles.countryModalHeader, { borderBottomColor: border }]}>
                      <Text style={[styles.countryModalTitle, { color: text }]}>
                        {t('signup.countryLabel')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowCountryPicker(false)}
                        style={styles.countryModalClose}
                      >
                        <Icon name="close" size={24} color={text} />
                      </TouchableOpacity>
                    </View>

                    {/* Search Input */}
                    <View style={[styles.countrySearchWrapper, { backgroundColor: bg, borderColor: border }]}>
                      <Icon name="search-outline" size={18} color={mutedText} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.countrySearchInput, { color: text }]}
                        placeholder="Search country..."
                        placeholderTextColor={mutedText}
                        value={countrySearch}
                        onChangeText={setCountrySearch}
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                      {countrySearch.length > 0 && (
                        <TouchableOpacity onPress={() => setCountrySearch('')}>
                          <Icon name="close-circle" size={18} color={mutedText} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Country List */}
                    <FlatList
                      data={filteredCountries}
                      keyExtractor={item => item.cca2}
                      style={styles.countryList}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.countryItem,
                            { borderBottomColor: border },
                            country === item.cca2 && { backgroundColor: `${accent}18` },
                          ]}
                          onPress={() => {
                            setCountry(item.cca2);
                            setCountryName(item.name);
                            setShowCountryPicker(false);
                            setCountrySearch('');
                            setErrors(prev => {
                              const next = { ...prev };
                              delete next.country;
                              return next;
                            });
                          }}
                        >
                          <Text style={styles.countryItemFlag}>{item.flag}</Text>
                          <Text style={[styles.countryItemName, { color: text }]}>{item.name}</Text>
                          {country === item.cca2 && (
                            <Icon name="checkmark" size={18} color={accent} />
                          )}
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        <Text style={[styles.countryEmptyText, { color: mutedText }]}>
                          No countries found
                        </Text>
                      }
                    />
                  </SafeAreaView>
                </View>
              </Modal>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{t('signup.passwordLabel')}</Text>
                <View style={[styles.inputGroup, errors.password && styles.inputError]}>
                  <View style={[styles.inputIconContainer, bgStyle]}>
                    <Icon name="lock-closed-outline" size={22} color={text} />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('signup.passwordPlaceholder')}
                    placeholderTextColor={mutedText}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={password}
                    onChangeText={value => {
                      setPassword(value);
                      if (errors.password) {
                        const next = { ...errors };
                        delete next.password;
                        setErrors(next);
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon
                      name={showPassword ? 'eye' : 'eye-off'}
                      size={20}
                      color={mutedText}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Referral Code */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>{t('signup.referralLabel')}</Text>
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalBadgeText}>{t('signup.referralOptional')}</Text>
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('signup.referralPlaceholder')}
                    placeholderTextColor={mutedText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={referralCode}
                    onChangeText={setReferralCode}
                  />
                </View>
                <Text style={styles.helperText}>{t('signup.referralHelper')}</Text>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  { backgroundColor: accent },
                  isSignupDisabled && styles.signupButtonDisabled,
                ]}
                disabled={isSignupDisabled}
                onPress={handleSignUp}
                activeOpacity={isSignupDisabled ? 1 : 0.8}
              >
                <Text style={styles.signupButtonText}>{t('signup.createAccountButton')}</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.orText}>{t('signup.dividerOr')}</Text>
                <View style={styles.divider} />
              </View>

              {/* Social Section */}
              <View style={styles.socialSectionHeader}>
                <Text style={[styles.socialSectionTitle, { color: text }]}>
                  {t('signup.socialSection')}
                </Text>
              </View>

              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity style={styles.socialButton} onPress={handleGoogleButtonPress}>
                  <Google width={24} height={24} />
                  <Text style={styles.socialButtonText}>{t('signup.google')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.socialButton} onPress={handleTwitterButtonPress}>
                  <Twitter width={24} height={24} />
                  <Text style={styles.socialButtonText}>{t('signup.twitter')}</Text>
                </TouchableOpacity>
              </View>

              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.appleSocialButton} onPress={handlAppleLogin}>
                  <AppleLogo width={24} height={24} />
                  <Text style={styles.socialButtonText}>{t('signup.apple')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Already have account */}
            <View style={styles.loginSection}>
              <Text style={styles.loginText}>
                {t('signup.alreadyHaveAccount')}{' '}
                <Text
                  style={[styles.loginLink, { color: text }]}
                  onPress={() => navigation.navigate('Login')}
                >
                  {t('signup.logIn')}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
}
