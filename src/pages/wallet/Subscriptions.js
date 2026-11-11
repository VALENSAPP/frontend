import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    StyleSheet,
    Alert,
    PermissionsAndroid,
    Platform,
    Linking,
    Image,
    DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { PostStory } from '../../services/stories';
import { buildStoryMetaPayload } from '../../utils/buildStoryMeta';
import {
    appendStoryAudioFiles,
    prepareStoryClipsAudioForUpload,
} from '../../utils/storyAudioUpload';
import { useToast } from 'react-native-toast-notifications';
import StoryComposer from '../../components/home/story.js/StoryComposer';
import CustomGalleryPickerModal from '../../components/common/CustomGalleryPickerModal';
import { showToastMessage } from '../../components/displaytoastmessage';
import { useDispatch } from 'react-redux';
import { hideLoader, showLoader } from '../../redux/actions/LoaderAction';
import { getSubscriptionByUserID, setPrivateSubscription, setUserSubscription } from '../../services/wallet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useBusinessProfileTheme } from '../../theme/useBusinessProfileTheme';
import { useThemeContext } from '../../theme/ThemeContext';
import TermCondition from '../../components/modals/Term&Condition';
import SubscriptionActivationPopup from '../../components/modals/SubscriptionActivationPopUp';
import ConnectStripeModal from '../../components/modals/ConnectStripeModal';
import { BusinessPlanModal, BusinessReminderModal, BusinessSuccessModal } from '../../components/modals/BusinessPlanModals';
import { useStripeOnboarding } from '../../hooks/useStripeOnboarding';
import {
    createOnboardingLink,
    describeRequestFailure,
    getOnboardingStatus,
    getOnboardingUrl,
    getStripeErrorMessages,
} from '../../utils/stripeOnboarding';
import { createCheckoutSession } from '../../services/stirpe';
import { ensureKycApprovedForPayment } from '../../utils/kycPaymentGuard';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { getUserCredentials } from '../../services/post';
import {
    formatProviderAmount,
    getActivePaymentProvider,
    hydratePaymentProvider,
    persistPaymentProvider,
    persistUserCountry,
    readPaymentProvider,
    readUserCountry,
} from '../../utils/paymentCurrency';
import { useLanguage } from '../../i18n';
import { formatLocalizedDate } from '../../utils/dateTimeFormatter';
import FanSubscriptionIntroBanner from '../../components/wallet/FanSubscriptionIntroBanner';
import { postMessagePrivate, getMessagesPrivateById, getMyMessagesPrivate, updateMessages } from '../../services/post';

const STRIPE_ONBOARDING_STATUS_KEY = 'stripeOnboardingStatus';
const SUBVENTION_TERMS_AGREED_KEY_PREFIX = 'subventionTermsAgreed';

const getPrivateMessagesPayload = response =>
    response?.data?.data ?? response?.data ?? response ?? {};

const hasActiveSubscriptionAccess = (data) => {
    const status = String(data?.subscriptionStatus || '').toUpperCase();
    const endDateValue = data?.subscriptionEnd || data?.currentPeriodEnd;
    const endDate = endDateValue ? new Date(endDateValue) : null;
    const hasValidEndDate = endDate && !Number.isNaN(endDate.getTime());
    const hasFutureAccess = hasValidEndDate ? endDate >= new Date() : status === 'ACTIVE';

    if (status === 'ACTIVE') return hasFutureAccess;
    if (status === 'CANCELED') return hasFutureAccess;
    return false;
};

const SubventionSetupScreen = () => {
    const [price, setPrice] = useState('55');
    const [subscriptionId, setSubscriptionId] = useState(null);
    const [selectedTab, setSelectedTab] = useState('ebook');
    const [isEditingPrice, setIsEditingPrice] = useState(false);
    const [showPrintWarning, setShowPrintWarning] = useState(false);
    const [printAttempts, setPrintAttempts] = useState(0);
    const [hasExistingSubscription, setHasExistingSubscription] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
    const navigation = useNavigation();

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);
    const toast = useToast();
    const dispatch = useDispatch();
    const { isBusinessProfile, bgStyle, textStyle, text, cardStyle, accent, mutedText, border, card, icon } = useBusinessProfileTheme();
    const { isDarkMode } = useThemeContext();
    const [credential, setCredential] = useState(null);
    const { t, currentLanguage } = useLanguage();
    const [paymentProvider, setPaymentProvider] = useState(getActivePaymentProvider);
    const currencySign = formatProviderAmount(0, paymentProvider).replace(/0\.00$/, '');
    const maxPriceLabel = `${currencySign}1000`;
    const feeLabel = formatProviderAmount(9.9, paymentProvider);
    const stripeErrorMessages = getStripeErrorMessages(t);

    const [composerVisible, setComposerVisible] = useState(false);
    const [galleryPickerVisible, setGalleryPickerVisible] = useState(false);
    const [composerList, setComposerList] = useState([]);
    const [subscriptionAmount, setSubscriptionAmount] = useState(9);
    const [showModal, setShowModal] = useState(false);
    const [showActivationPopup, setShowActivationPopup] = useState(false);
    const [showBusinessReminderPopup, setShowBusinessReminderPopup] = useState(false);
    const [showBusinessSuccessPopup, setShowBusinessSuccessPopup] = useState(false);
    const [showStripeSetupModal, setShowStripeSetupModal] = useState(false);
    const [rawAmount, setRawAmount] = useState('9');
    const [comment, setComment] = useState('');
    // Custom private-content messages (photos/videos/ebooks)
    const [photoMessage, setPhotoMessage] = useState('');
    const [videoMessage, setVideoMessage] = useState('');
    const [ebookMessage, setEbookMessage] = useState('');
    const [editingMessageType, setEditingMessageType] = useState(null); // 'photo' | 'video' | 'ebook' | null
    const [editingMessageText, setEditingMessageText] = useState('');
    const [editingModalVisible, setEditingModalVisible] = useState(false);

    const { openOnboarding } = useStripeOnboarding({ fetchOnMount: true });
    const activationInFlightRef = useRef(false);
    const credentialRequestRef = useRef(0);

    const contentTabs = [
        { id: 'posts', label: t('subventionSetup.tabMint', 'Mint'), icon: 'notebook-edit-outline', iconType: 'MaterialCommunityIcons', hint: 'Unlimited access', iconColor: null },
        { id: 'reels', label: t('subventionSetup.tabFlips', 'Flips'), icon: 'movie-open-outline', iconType: 'MaterialCommunityIcons', hint: 'Unlimited access', iconColor: null },
        { id: 'stories', label: t('subventionSetup.tabDrops', 'Drops'), icon: 'star-four-points', iconType: 'MaterialCommunityIcons', hint: 'Unlimited access', iconColor: '#F59E0B' },
        { id: 'videos', label: 'Videos', icon: 'videocam-outline', iconType: 'Ionicons', hint: '30 min max', iconColor: null },
        { id: 'ebook', label: t('subventionSetup.tabEbook', 'E-book'), icon: 'book-multiple-outline', iconType: 'MaterialCommunityIcons', hint: 'Unlimited access', iconColor: null },
    ];
    const selectedTabMeta = contentTabs.find(tab => tab.id === selectedTab) || contentTabs[0];

    const loadTermsAgreement = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            const key = `${SUBVENTION_TERMS_AGREED_KEY_PREFIX}:${userId || 'unknown'}`;
            const stored = await AsyncStorage.getItem(key);
            const agreed = stored === 'true';
            setHasAgreedTerms(agreed);
            if (agreed) setIsChecked(true);
        } catch (_e) {
            // Non-fatal: keep default false.
        }
    };

    const persistTermsAgreement = async () => {
        const userId = await AsyncStorage.getItem('userId');
        const key = `${SUBVENTION_TERMS_AGREED_KEY_PREFIX}:${userId || 'unknown'}`;
        await AsyncStorage.setItem(key, 'true');
        setHasAgreedTerms(true);
        setIsChecked(true);
    };

    const formatPrice = (value) => {
        if (!value) return "";
        const stringValue = value.toString();
        if (stringValue.includes(".")) return stringValue;
        const cleaned = stringValue.replace(/\D/g, "");
        if (!cleaned) return "";
        const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return `${formatted},00`;
    };

    const openTerms = async () => {
        const url = 'https://valens.app/creator-terms';
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            }
        } catch (error) {
            console.error('Error opening terms link:', error);
        }
    };

    const openPrivacyPolicy = async () => {
        const url = 'https://valenstechnologies.app/privacy-policy';
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            }
        } catch (error) {
            console.error('Error opening privacy policy link:', error);
        }
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const isBrowserCancelled = (result) => result?.type === 'cancel' || result?.type === 'dismiss';
    const isOnboardingReady = (status) => status?.canReceivePayments === true && Boolean(status?.accountId);

    const GetInbordingstatus = async () => {
        try {
            const response = await getOnboardingStatus();
            if (response?.statusCode === 200) {
                const latestStatus = response?.data ?? null;
                if (latestStatus) {
                    await AsyncStorage.setItem(STRIPE_ONBOARDING_STATUS_KEY, JSON.stringify(latestStatus));
                }
                return latestStatus;
            }
            return null;
        } catch (error) {
            return null;
        }
    };

    const GetInbordingLink = async () => {
        const response = await createOnboardingLink();
        const onboardingUrl = getOnboardingUrl(response);

        if (!onboardingUrl) {
            const latestStatus = await GetInbordingstatus();
            if (isOnboardingReady(latestStatus)) return { alreadyOnboarded: true };
            throw new Error(
                describeRequestFailure(response, stripeErrorMessages, stripeErrorMessages.ONBOARDING_FAILED),
            );
        }

        setShowActivationPopup(false);
        setShowBusinessReminderPopup(false);
        await delay(450);
        if (await InAppBrowser.isAvailable()) {
            const browserResult = await InAppBrowser.open(onboardingUrl, {
                dismissButtonStyle: 'close',
                preferredBarTintColor: '#000',
                preferredControlTintColor: '#fff',
                showTitle: true,
                toolbarColor: '#000',
                enableUrlBarHiding: true,
                enableDefaultShare: false,
            });
            credentialRequestRef.current += 1;
            await delay(400);
            return browserResult;
        }

        await Linking.openURL(onboardingUrl);
        return { type: 'opened_external' };
    };

    const waitForOnboardingCompletion = async () => {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const status = await GetInbordingstatus();
            if (isOnboardingReady(status)) return status;
            await delay(2000);
        }
        return null;
    };

    const navigateToWalletDashboard = () => {
        navigation.navigate('MainApp', {
            screen: 'wallet',
            params: { screen: 'Dashboard' }
        });
    };

    const handleActivationConfirm = async () => {
        if (activationInFlightRef.current) return;
        const isKycApproved = await ensureKycApprovedForPayment({
            navigation,
            toast,
            t,
            onNavigateKyc: () => {
                setShowActivationPopup(false);
                setShowBusinessReminderPopup(false);
                navigation.navigate('kycverify');
            },
        });
        if (!isKycApproved) {
            return;
        }

        activationInFlightRef.current = true;
        credentialRequestRef.current += 1;
        try {
            setShowActivationPopup(false);
            const onboardingStatus = await GetInbordingstatus();
            if (isOnboardingReady(onboardingStatus)) {
                await getUserSubscription();
                return;
            }

            const onboardingResult = await GetInbordingLink();
            if (onboardingResult?.alreadyOnboarded) {
                await getUserSubscription();
                return;
            }

            if (isBrowserCancelled(onboardingResult)) {
                return;
            }

            const updatedStatus = await waitForOnboardingCompletion();
            if (isOnboardingReady(updatedStatus)) {
                await getUserSubscription();
                return;
            }

            showToastMessage(toast, 'warning', t('subventionSetup.stripeIncomplete'));
        } catch (error) {
            showToastMessage(toast, 'danger', error?.message || stripeErrorMessages.ONBOARDING_FAILED);
        } finally {
            activationInFlightRef.current = false;
            setShowActivationPopup(false);
        }
    };

    const closeBusinessFlow = () => {
        setShowActivationPopup(false);
        setShowBusinessReminderPopup(false);
    };

    const handleBusinessActivatedSuccess = async () => {
        await AsyncStorage.setItem('businessPlanMode', 'active');
        closeBusinessFlow();
        setShowBusinessSuccessPopup(true);
        setTimeout(() => {
            setShowBusinessSuccessPopup(false);
            navigateToWalletDashboard();
        }, 1400);
    };

    const handleBusinessActivationConfirm = async () => {
        if (activationInFlightRef.current) return;
        const isKycApproved = await ensureKycApprovedForPayment({
            navigation,
            toast,
            t,
            onNavigateKyc: () => {
                setShowActivationPopup(false);
                setShowBusinessReminderPopup(false);
                navigation.navigate('kycverify');
            },
        });
        if (!isKycApproved) {
            return;
        }

        activationInFlightRef.current = true;
        try {
            dispatch(showLoader());

            const onboardingStatus = await GetInbordingstatus();
            if (isOnboardingReady(onboardingStatus)) {
                const paymentResult = await getUserSubscription();
                if (paymentResult?.cancelled) { closeBusinessFlow(); navigateToWalletDashboard(); return; }
                await handleBusinessActivatedSuccess();
                return;
            }

            const onboardingResult = await GetInbordingLink();
            if (onboardingResult?.alreadyOnboarded) {
                const paymentResult = await getUserSubscription();
                if (paymentResult?.cancelled) { closeBusinessFlow(); navigateToWalletDashboard(); return; }
                await handleBusinessActivatedSuccess();
                return;
            }

            if (isBrowserCancelled(onboardingResult)) {
                closeBusinessFlow();
                navigateToWalletDashboard();
                return;
            }

            const updatedStatus = await waitForOnboardingCompletion();
            if (isOnboardingReady(updatedStatus)) {
                const paymentResult = await getUserSubscription();
                if (paymentResult?.cancelled) { closeBusinessFlow(); navigateToWalletDashboard(); return; }
                await handleBusinessActivatedSuccess();
                return;
            }

            closeBusinessFlow();
            navigateToWalletDashboard();
            showToastMessage(toast, 'warning', t('subventionSetup.stripeIncomplete'));
        } catch (error) {
            showToastMessage(toast, 'danger', error?.message || stripeErrorMessages.ONBOARDING_FAILED);
        } finally {
            activationInFlightRef.current = false;
            dispatch(hideLoader());
        }
    };

    const handleBusinessContinueBasic = () => setShowBusinessReminderPopup(true);

    const handleBusinessContinueLimited = async () => {
        await AsyncStorage.setItem('businessPlanMode', 'basic');
        closeBusinessFlow();
        showToastMessage(toast, 'warning', t('subventionSetup.businessBasicMode'));
    };

    useEffect(() => {
        let cancelled = false;
        hydratePaymentProvider().then((provider) => {
            if (!cancelled && provider) setPaymentProvider(provider);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const getCredential = useCallback(async () => {
        const requestId = credentialRequestRef.current;
        try {
            const id = await AsyncStorage.getItem('userId');
            if (!id) return;
            const response = await getUserCredentials(id);
            if (requestId !== credentialRequestRef.current || activationInFlightRef.current) return;
            const data = response?.data ?? response;
            setCredential(data);
            const profileProvider = readPaymentProvider(data?.user || data);
            if (profileProvider !== undefined) {
                const savedProvider = await persistPaymentProvider(profileProvider);
                if (requestId === credentialRequestRef.current) setPaymentProvider(savedProvider);
            }
            const profileCountry = readUserCountry(data?.user || data);
            if (profileCountry !== undefined) {
                await persistUserCountry(profileCountry);
            }
            const hasActiveAccess = hasActiveSubscriptionAccess(data);
            if (hasActiveAccess) {
                setShowActivationPopup(false);
                setShowBusinessReminderPopup(false);
                setHasAgreedTerms(true);
                setIsChecked(true);
            } else {
                setShowBusinessReminderPopup(false);
                setShowActivationPopup(true);
                setHasAgreedTerms(false);
                setIsChecked(false);
            }
        } catch (error) {
        }
    }, []);

    const loadCustomMessages = async () => {
        try {
            const resp = await getMyMessagesPrivate();
            const data = getPrivateMessagesPayload(resp);
            if (data) {
                setPhotoMessage(data.messageForPhotos || '');
                setVideoMessage(data.messageForVideos || '');
                setEbookMessage(data.messageForEbooks || '');
            }
        } catch (error) {
        }
    };

    const saveCustomMessage = async (type, text) => {
        try {
            const nextPhoto = type === 'photos' ? (text || '') : (photoMessage || '');
            const nextVideo = type === 'videos' ? (text || '') : (videoMessage || '');
            const nextEbook = type === 'ebooks' ? (text || '') : (ebookMessage || '');

            let existing = null;
            try {
                existing = await getMyMessagesPrivate();
            } catch (e) {
                // ignore — we'll attempt to POST if GET fails
            }

            const existingData = getPrivateMessagesPayload(existing);
            const hasServerMessage = !!(existing && (
                existingData?.id ||
                existingData?.messageForPhotos ||
                existingData?.messageForVideos ||
                existingData?.messageForEbooks
            ));

            try {
                if (hasServerMessage) {
                    await updateMessages({
                        messageForPhotos: nextPhoto,
                        messageForVideos: nextVideo,
                        messageForEbooks: nextEbook,
                    });
                    showToastMessage(toast, 'success', t('subventionSetup.messageUpdateSuccess'));
                } else {
                    await postMessagePrivate({
                        messageForPhotos: nextPhoto,
                        messageForVideos: nextVideo,
                        messageForEbooks: nextEbook,
                    });
                    showToastMessage(toast, 'success', t('subventionSetup.messageAddSuccess'));
                }

                // update local UI state
                if (type === 'photos') setPhotoMessage(text || '');
                if (type === 'videos') setVideoMessage(text || '');
                if (type === 'ebooks') setEbookMessage(text || '');
                return true;
            } catch (err) {
                showToastMessage(toast, 'danger', t('subventionSetup.messageSaveFail'));
                return false;
            }
        } catch (error) {
            return false;
        }
    };

    const openEditModal = async (type) => {
        setEditingMessageType(type);
        try {
            const resp = await getMyMessagesPrivate();
            const data = getPrivateMessagesPayload(resp);
            const nextText = type === 'photos'
                ? (data?.messageForPhotos || photoMessage || '')
                : type === 'videos'
                    ? (data?.messageForVideos || videoMessage || '')
                    : (data?.messageForEbooks || ebookMessage || '');
            setEditingMessageText(nextText);
        } catch (error) {
            const currentText = type === 'photos' ? photoMessage : type === 'videos' ? videoMessage : ebookMessage;
            setEditingMessageText(currentText || '');
        }
        setEditingModalVisible(true);
    };

    const fetchSubscriptionByUserId = useCallback(async () => {
        try {
            const id = await AsyncStorage.getItem('userId');
            dispatch(showLoader());
            const response = await getSubscriptionByUserID(id);
            if (response?.statusCode === 200) {
                const subscriptions = response?.data?.subscriptions;
                if (subscriptions && subscriptions.length > 0) {
                    const amount = subscriptions[0].subscriptionAmount;
                    const subId = subscriptions[0].id;
                    setComment(subscriptions[0].comment);
                    setSubscriptionAmount(amount);
                    setSubscriptionId(subId);
                    setPrice(formatPrice(amount));
                    setRawAmount(amount.toString());
                    setHasExistingSubscription(true);
                    setShowModal(false);
                    setShowActivationPopup(false);
                } else {
                    setSubscriptionAmount(null);
                    setSubscriptionId(null);
                    setHasExistingSubscription(false);
                    setShowModal(true);
                    setShowActivationPopup(false);
                }
            } else {
                showToastMessage(toast, 'danger', response.data.message);
                setHasExistingSubscription(false);
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
            setHasExistingSubscription(false);
        } finally {
            dispatch(hideLoader());
        }
    }, [dispatch, toast]);

    useFocusEffect(
        useCallback(() => {
            const initializeScreen = async () => {
                await loadTermsAgreement();
                await fetchSubscriptionByUserId();
                await loadCustomMessages();
                await getCredential();
            };
            initializeScreen();
        }, [fetchSubscriptionByUserId, getCredential])
    );

    const handlePriceChange = (text) => {
        const clean = text.replace(/[^0-9.]/g, "");
        setRawAmount(clean);
        setPrice(clean);
    };

    const handlePriceBlur = () => {
        if (!rawAmount) { setPrice(''); setRawAmount(''); return; }
        const hasDecimal = rawAmount.includes('.');
        const numValue = parseFloat(rawAmount);
        let finalValue = numValue;
        if (numValue < 9) finalValue = 9;
        if (numValue > 1000) finalValue = 1000;
        setRawAmount(finalValue.toString());
        if (hasDecimal) {
            setPrice(finalValue.toString());
        } else {
            setPrice(formatPrice(finalValue.toString()));
        }
    };

    const getUserSubscription = async () => {
        const isKycApproved = await ensureKycApprovedForPayment({
            navigation,
            toast,
            t,
            onNavigateKyc: () => {
                setShowActivationPopup(false);
                navigation.navigate('kycverify');
            },
        });
        if (!isKycApproved) {
            setShowActivationPopup(false);
            return;
        }

        let response;
        try {
            response = await createCheckoutSession();
            const checkoutUrl = response?.data?.url || (typeof response?.url === 'string' ? response.url : null);
            if (!checkoutUrl || response?.success === false) {
                const apiErrorMessage =
                    response?.message ||
                    response?.data?.message ||
                    response?.error?.message ||
                    (typeof response?.error === 'string' ? response.error : null) ||
                    'Checkout URL not received';
                throw new Error(apiErrorMessage);
            }
            setShowActivationPopup(false);
            setShowBusinessReminderPopup(false);
            await delay(450);
            if (await InAppBrowser.isAvailable()) {
                const browserResult = await InAppBrowser.open(checkoutUrl, {
                    dismissButtonStyle: 'close',
                    preferredBarTintColor: '#000',
                    preferredControlTintColor: '#fff',
                    showTitle: true,
                    toolbarColor: '#000',
                    enableUrlBarHiding: true,
                    enableDefaultShare: false,
                });
                // Ignore the focus refresh that runs as the browser closes.
                // That refresh was reopening this modal and freezing the screen.
                credentialRequestRef.current += 1;
                await delay(400);
                return { response, cancelled: isBrowserCancelled(browserResult) };
            } else {
                await Linking.openURL(checkoutUrl);
                return { response, cancelled: false };
            }
        } catch (error) {
            if (response?.data?.url) await Linking.openURL(response.data.url);
            throw error;
        }
    };

    const formatSubscriptionDate = (dateValue) => {
        if (!dateValue) return 'N/A';
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) return 'N/A';
        return formatLocalizedDate(parsed, currentLanguage) || 'N/A';
    };

    const handlePrintAttempt = () => {
        const newAttempts = printAttempts + 1;
        setPrintAttempts(newAttempts);
        setShowPrintWarning(true);
    };

    const requestCameraPermission = async () => {
        if (Platform.OS !== 'android') return true;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA,
                {
                    title: t('subventionSetup.cameraPermissionTitle'),
                    message: t('subventionSetup.cameraPermissionMessage'),
                    buttonNeutral: t('subventionSetup.cameraPermissionAskLater'),
                    buttonNegative: t('subventionSetup.cameraPermissionCancel'),
                    buttonPositive: 'OK',
                },
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn(err);
            return false;
        }
    };

    const openCamera = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
            Alert.alert(t('subventionSetup.permissionDeniedTitle'), t('subventionSetup.permissionDeniedMessage'));
            return;
        }
        const options = { mediaType: 'mixed', includeBase64: false, maxHeight: 2000, maxWidth: 2000, includeExtra: true, presentationStyle: 'fullScreen' };
        launchCamera(options, response => {
            if (response?.didCancel) return;
            if (response?.errorCode) { Alert.alert(t('subventionSetup.cameraError'), response.errorMessage || response.errorCode); return; }
            handleMediaSelected(response);
        });
    };

    const openGallery = () => {
        setGalleryPickerVisible(true);
    };

    const handleGallerySelect = assets => {
        setGalleryPickerVisible(false);
        if (!assets || !assets.length) return;
        const list = assets.map(a => ({
            uri: a.uri,
            type: a.type?.startsWith('video') ? 'video' : 'image',
            duration: a.duration ? a.duration * 1000 : undefined,
        }));
        setComposerList(list);
        setComposerVisible(true);
    };

    const handleMediaSelected = response => {
        const asset = response?.assets?.[0];
        if (!asset || !asset.uri) { Alert.alert(t('subventionSetup.errorTitle'), t('subventionSetup.mediaReadError')); return; }
        const type = asset.type?.startsWith('video') ? 'video' : 'image';
        const list = [{ uri: asset.uri, type, duration: type === 'video' ? (asset.duration ? asset.duration * 1000 : 15000) : 5000 }];
        setComposerList(list);
        setComposerVisible(true);
    };

    const handleAddStory = () => {
        Alert.alert(t('subventionSetup.addDropsTitle'), t('subventionSetup.addDropsMessage'), [
            { text: t('subventionSetup.addDropsCamera'), onPress: () => openCamera() },
            { text: t('subventionSetup.addDropsGallery'), onPress: () => openGallery() },
            { text: t('subventionSetup.cancel'), style: 'cancel' },
        ]);
    };

    const handleComposerDone = async (processedArray) => {
        try {
            const clips = await prepareStoryClipsAudioForUpload(processedArray);
            setComposerVisible(false);
            const formData = new FormData();
            formData.append('caption', '');
            formData.append('type', 'subscription-content');
            clips.forEach((item, index) => {
                const fileUri = item.processedUri || item.original.uri;
                const fileName = `story_${Date.now()}_${index}.${item.isVideo ? 'mp4' : 'jpg'}`;
                const fileType = item.isVideo ? 'video/mp4' : 'image/jpeg';
                formData.append('media', { uri: fileUri, type: fileType, name: fileName });
            });
            formData.append('storyMeta', JSON.stringify(buildStoryMetaPayload(clips)));
            await appendStoryAudioFiles(formData, clips);
            const response = await PostStory(formData);
            if (response?.success) {
                showToastMessage(toast, 'success', t('subventionSetup.storyUploadSuccess'));
            } else {
                showToastMessage(toast, 'danger', t('subventionSetup.storyUploadFail'));
            }
        } catch (error) {
            console.error('Error uploading story:', error);
            showToastMessage(toast, 'danger', t('subventionSetup.somethingWentWrong'));
        }
    };

    const handleCreateContent = (contentType) => {
        const findNavigatorWithRoute = (nav, routeName) => {
            let current = nav;
            while (current) {
                const state = current.getState?.();
                const routeNames = state?.routeNames;
                const routes = state?.routes;
                const hasRoute =
                    (Array.isArray(routeNames) && routeNames.includes(routeName)) ||
                    (Array.isArray(routes) && routes.some(r => r?.name === routeName));
                if (hasRoute) return current;
                current = current.getParent?.();
            }
            return nav;
        };

        const navigateToCreate = (params) => {
            const navWithAdd = findNavigatorWithRoute(navigation, 'Add');
            navWithAdd?.navigate?.('Add', { screen: 'Add', params });
        };

        switch (contentType) {
            case 'posts': navigateToCreate({ postType: 'private', type: 'post', fromSubscription: true, returnTo: { tab: 'wallet', screen: 'SubscriptionSetup' } }); break;
            case 'reels': navigateToCreate({ postType: 'private', type: 'Flips', fromSubscription: true, returnTo: { tab: 'wallet', screen: 'SubscriptionSetup' } }); break;
            case 'videos': navigateToCreate({ postType: 'private', type: 'video', fromSubscription: true, returnTo: { tab: 'wallet', screen: 'SubscriptionSetup' } }); break;
            case 'ebook': navigation.push('EbookPublisher', { type: 'private', format: 'ebook' }); break;
            case 'stories': handleAddStory(); break;
            default: break;
        }
    };

    const PrintWarningModal = () => (
        <Modal visible={showPrintWarning} transparent={true} animationType="fade" onRequestClose={() => setShowPrintWarning(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalIcon}>🚫</Text>
                    <Text style={styles.modalTitle}>{t('subventionSetup.printWarningTitle')}</Text>
                    <Text style={styles.modalText}>{t('subventionSetup.printWarningText')}</Text>
                    <View style={styles.warningBox}>
                        <Text style={styles.warningIcon}>⚠️</Text>
                        <Text style={styles.warningText}>{t('subventionSetup.printWarningSubText')}</Text>
                    </View>
                    <Text style={styles.footerText}>{t('subventionSetup.printWarningFooter')}</Text>
                    <TouchableOpacity style={styles.understandButton} onPress={() => setShowPrintWarning(false)}>
                        <Text style={styles.understandButtonText}>{t('subventionSetup.iUnderstand')}</Text>
                    </TouchableOpacity>
                    {/* <Text style={styles.attemptCounter}>{t('subventionSetup.attempts')}: {printAttempts}/3</Text> */}
                </View>
            </View>
        </Modal>
    );

    const handleSaveSubscription = async () => {
        try {
            if (!hasAgreedTerms && !isChecked) {
                showToastMessage(toast, 'warning', t('subventionSetup.agreementRequired'));
                return;
            }
            const subscriptionAmount = parseFloat(rawAmount) || 0;
            dispatch(showLoader());
            let response;
            if (hasExistingSubscription && subscriptionId) {
                const dataToSend = { subscriptionAmount, status: "ACTIVE", isDelete: 0, comment: comment || '' };
                response = await setUserSubscription(dataToSend, subscriptionId);
            } else {
                const dataToSend = { subscriptionAmount, status: "ACTIVE", comment: comment || '' };
                response = await setPrivateSubscription(dataToSend);
                setShowActivationPopup(false);
            }
            if (response?.statusCode === 200) {
                setComment('');
                showToastMessage(toast, 'success', hasExistingSubscription ? t('subventionSetup.updateSuccess') : t('subventionSetup.createSuccess'));
                await persistTermsAgreement();
                await fetchSubscriptionByUserId();
            } else {
                showToastMessage(toast, 'danger', response?.data?.message || t('subventionSetup.saveFail'));
            }
        } catch (error) {
            console.error('Error saving subscription:', error);
            showToastMessage(toast, 'danger', t('subventionSetup.somethingWentWrong'));
        } finally {
            dispatch(hideLoader());
        }
    };

    const hasActiveSubscription = hasActiveSubscriptionAccess(credential);
    const subscriptionEndDate = formatSubscriptionDate(credential?.subscriptionEnd || credential?.currentPeriodEnd);
    const subscriptionStatus = credential?.subscriptionStatus || 'INACTIVE';
    const isSubscriptionActive = hasActiveSubscription;
    const shouldShowAgreedButton = hasActiveSubscription && hasAgreedTerms;
    const canSaveSubscription = shouldShowAgreedButton || isChecked;



    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#0F0C15' : '#FBF8FD' }]} edges={['top', 'left', 'right']}>
            <View style={styles.headerBar}>
                <TouchableOpacity
                    style={styles.headerMenuButton}
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else if (navigation.openDrawer) {
                            navigation.openDrawer();
                        }
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Open menu"
                >
                    <Ionicons name="menu" size={28} color={isDarkMode ? '#FFFFFF' : '#3B0D66'} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitleTop, { color: isDarkMode ? '#FFFFFF' : '#3B0D66' }]}>Subscription Program</Text>
                    <Text style={[styles.headerTitleBottom, { color: isDarkMode ? '#FFFFFF' : '#3B0D66' }]}>Setup</Text>
                </View>

                <View style={styles.headerRightSpacer} />
            </View>

            <ScrollView
                style={[styles.container, { backgroundColor: isDarkMode ? '#0F0C15' : '#FBF8FD' }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Banner Card */}
                <View style={[styles.heroCard, { backgroundColor: isDarkMode ? '#241838' : '#F5EEFA', borderColor: isDarkMode ? '#3B2A57' : '#EDE2F7' }]}>
                    <View style={styles.heroLeftCol}>
                        <Text style={[styles.heroTitle, { color: isDarkMode ? '#FFFFFF' : '#3B0D66' }]}>Your content. Your price.</Text>
                        <Text style={[styles.heroBody1, { color: isDarkMode ? '#D4C8E6' : '#554B64' }]}>
                            Fan Subscriptions where Creators set their own price for exclusive fan access, up to $1,000/month — open pricing.
                        </Text>
                        <Text style={[styles.heroBody2, { color: isDarkMode ? '#B0A2C7' : '#6B5E80' }]}>
                            Valens charges $9.90/month for creators to activate their subscription channel.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.heroRightCol}
                        activeOpacity={0.8}
                        onPress={() => DeviceEventEmitter.emit('OPEN_DRALENS_AI')}
                        accessibilityLabel="Ask Dralens AI"
                    >
                        <View style={styles.dralensBubble}>
                            <Text style={styles.dralensBubbleText}>Ask Dralens ✨</Text>
                        </View>
                        <View style={styles.mascotWrapper}>
                            <Image
                                source={require('../../assets/icons/pngicons/welcome.png')}
                                style={styles.mascotImage}
                                resizeMode="contain"
                            />
                            <Image
                                source={require('../../assets/icons/pngicons/private.png')}
                                style={styles.padlockImage}
                                resizeMode="contain"
                            />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* 💰 1. Subscription Price */}
                <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? card : '#FFFFFF', borderColor: isDarkMode ? border : '#ECE4F5' }]}>
                    <Text style={[styles.sectionHeading, { color: isDarkMode ? text : '#3B0D66' }]}>💰 1. Subscription Price</Text>
                    <Text style={[styles.sectionSubheading, { color: isDarkMode ? mutedText : '#706484' }]}>Set your monthly rate per subscriber</Text>

                    <View style={styles.priceRowContainer}>
                        <View style={[styles.priceInputGroup, { borderBottomColor: accent || '#581C87' }]}>
                            <Text style={[styles.priceCurrencySymbol, { color: accent || '#581C87' }]}>$ </Text>
                            <TextInput
                                style={[styles.priceTextInput, { color: isDarkMode ? text : '#3B0D66' }]}
                                value={price}
                                onChangeText={handlePriceChange}
                                onBlur={handlePriceBlur}
                                keyboardType="numeric"
                                placeholder="55.00"
                                placeholderTextColor={mutedText}
                                editable={!hasExistingSubscription}
                            />
                        </View>
                        <Text style={[styles.pricePerMonth, { color: isDarkMode ? mutedText : '#706484' }]}>/month</Text>
                    </View>

                    <View style={styles.priceRangeRow}>
                        <Text style={[styles.rangeLabel, { color: isDarkMode ? mutedText : '#706484' }]}>
                            Min: $9
                        </Text>
                        <Text style={[styles.rangeLabel, { color: isDarkMode ? mutedText : '#706484' }]}>
                            Max: $1,000
                        </Text>
                    </View>

                    <TextInput
                        style={[
                            styles.commentInput,
                            {
                                backgroundColor: isDarkMode ? (`${accent}15`) : '#FAF8FD',
                                borderColor: isDarkMode ? border : '#EDE5F6',
                                color: isDarkMode ? text : '#3B0D66',
                            },
                        ]}
                        placeholder="Add a comment..."
                        placeholderTextColor={isDarkMode ? mutedText : '#9E94AD'}
                        multiline
                        value={comment}
                        onChangeText={setComment}
                        numberOfLines={3}
                        textAlignVertical="top"
                    />

                    <View style={[styles.subscriptionEndsContainer, { backgroundColor: isDarkMode ? (`${accent}20`) : '#F7F4FA' }]}>
                        <View>
                            <Text style={[styles.subEndsLabel, { color: isDarkMode ? mutedText : '#786C8C' }]}>Subscription ends</Text>
                            <Text style={[styles.subEndsValue, { color: isDarkMode ? text : '#3B0D66' }]}>
                                {subscriptionEndDate || 'Nov 29, 2026'}
                            </Text>
                        </View>
                        <View style={styles.subStatusBadge}>
                            <Text style={styles.subStatusText}>{subscriptionStatus || 'CANCELED'}</Text>
                        </View>
                    </View>

                    <Text style={[styles.termsHeadingCenter, { color: isDarkMode ? text : '#3B0D66' }]}>
                        Accept Terms and Agreement
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.agreedPillButton,
                            {
                                backgroundColor: isDarkMode ? card : '#FFFFFF',
                                borderColor: isDarkMode ? border : '#E6DEEF',
                            },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (!hasAgreedTerms) {
                                setIsChecked(!isChecked);
                            }
                        }}
                    >
                        <Ionicons
                            name={hasAgreedTerms || isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                            size={18}
                            color={hasAgreedTerms || isChecked ? '#10B981' : mutedText}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.agreedPillText, { color: isDarkMode ? text : '#3B0D66' }]}>
                            {hasAgreedTerms || isChecked ? 'Agreed' : 'Agree to Terms'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            {
                                backgroundColor: accent || '#581C87',
                                opacity: !canSaveSubscription ? 0.6 : 1,
                            },
                        ]}
                        onPress={
                            hasExistingSubscription
                                ? () => navigation.navigate('UpdateSubscriptionPrice', { currentPrice: parseFloat(rawAmount) || 0 })
                                : handleSaveSubscription
                        }
                        disabled={!canSaveSubscription}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryButtonText}>Update Subscription</Text>
                    </TouchableOpacity>
                </View>

                {/* 🔲 2. Create Content */}
                <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? card : '#FFFFFF', borderColor: isDarkMode ? border : '#ECE4F5' }]}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={[styles.badgeIconSquare, { backgroundColor: accent || '#581C87' }]}>
                            <MaterialCommunityIcons name="view-grid" size={14} color="#FFFFFF" />
                        </View>
                        <View style={styles.sectionHeaderTextCol}>
                            <Text style={[styles.sectionHeading, { color: isDarkMode ? text : '#3B0D66', marginBottom: 2 }]}>
                                2. Create Content
                            </Text>
                            <Text style={[styles.sectionSubheading, { color: isDarkMode ? mutedText : '#706484', marginBottom: 0 }]}>
                                Full access to all content types
                            </Text>
                        </View>
                    </View>

                    <View style={styles.contentGrid}>
                        {contentTabs.map((tab) => {
                            const isSelected = selectedTab === tab.id;
                            const itemIconColor = tab.iconColor || (isSelected ? (accent || '#581C87') : (isDarkMode ? text : '#3B0D66'));
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    activeOpacity={0.85}
                                    onPress={() => setSelectedTab(tab.id)}
                                    style={[
                                        styles.gridTile,
                                        {
                                            backgroundColor: isSelected
                                                ? (isDarkMode ? (`${accent || '#581C87'}22`) : '#FAF7FD')
                                                : (isDarkMode ? card : '#FFFFFF'),
                                            borderColor: isSelected
                                                ? (accent || '#581C87')
                                                : (isDarkMode ? border : '#ECE4F5'),
                                            borderWidth: isSelected ? 1.5 : 1,
                                        },
                                    ]}
                                >
                                    {isSelected ? (
                                        <View style={[styles.selectedCheckBadge, { backgroundColor: accent || '#581C87' }]}>
                                            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                                        </View>
                                    ) : null}

                                    {tab.iconType === 'Ionicons' ? (
                                        <Ionicons name={tab.icon} size={24} color={itemIconColor} style={styles.gridTileIcon} />
                                    ) : (
                                        <MaterialCommunityIcons name={tab.icon} size={24} color={itemIconColor} style={styles.gridTileIcon} />
                                    )}

                                    <Text
                                        style={[
                                            styles.gridTileTitle,
                                            { color: isSelected ? (accent || '#581C87') : (isDarkMode ? text : '#3B0D66') },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {tab.label}
                                    </Text>
                                    <Text style={[styles.gridTileSub, { color: isDarkMode ? mutedText : '#8E82A1' }]} numberOfLines={1}>
                                        {tab.hint || 'Unlimited access'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        {/* 6th tile: Create E-book */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => handleCreateContent('ebook')}
                            style={[
                                styles.gridTile,
                                styles.gridTileCreate,
                                {
                                    backgroundColor: isDarkMode ? card : '#FFFFFF',
                                    borderColor: accent || '#581C87',
                                },
                            ]}
                        >
                            <Ionicons name="add-circle-outline" size={24} color={accent || '#581C87'} style={styles.gridTileIcon} />
                            <Text style={[styles.gridTileTitle, { color: isDarkMode ? text : '#3B0D66' }]} numberOfLines={1}>
                                Create E-book
                            </Text>
                            <View style={[styles.createPillBtn, { backgroundColor: accent || '#581C87' }]}>
                                <Text style={styles.createPillBtnText}>+ New E-book</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 💬 Custom Messages */}
                <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? card : '#FFFFFF', borderColor: isDarkMode ? border : '#ECE4F5' }]}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={[styles.badgeIconSquare, { backgroundColor: accent || '#581C87' }]}>
                            <Ionicons name="chatbox-ellipses" size={13} color="#FFFFFF" />
                        </View>
                        <View style={styles.sectionHeaderTextCol}>
                            <Text style={[styles.sectionHeading, { color: isDarkMode ? text : '#3B0D66', marginBottom: 2 }]}>
                                Custom Messages
                            </Text>
                            <Text style={[styles.sectionSubheading, { color: isDarkMode ? mutedText : '#706484', marginBottom: 0 }]}>
                                Personalize messages for your content
                            </Text>
                        </View>
                    </View>

                    <View style={styles.messagesListContainer}>
                        <TouchableOpacity
                            style={styles.messageItemRow}
                            activeOpacity={0.75}
                            onPress={() => openEditModal('photos')}
                        >
                            <Ionicons name="image-outline" size={20} color={accent || '#581C87'} style={styles.messageRowIcon} />
                            <Text style={[styles.messageRowLabel, { color: isDarkMode ? text : '#3B0D66' }]}>Message for photos</Text>
                            <Ionicons name="chevron-forward" size={18} color={isDarkMode ? mutedText : '#9E94AD'} />
                        </TouchableOpacity>

                        <View style={[styles.messageDivider, { backgroundColor: isDarkMode ? border : '#F2ECF8' }]} />

                        <TouchableOpacity
                            style={styles.messageItemRow}
                            activeOpacity={0.75}
                            onPress={() => openEditModal('videos')}
                        >
                            <Ionicons name="videocam-outline" size={20} color={accent || '#581C87'} style={styles.messageRowIcon} />
                            <Text style={[styles.messageRowLabel, { color: isDarkMode ? text : '#3B0D66' }]}>Message for videos</Text>
                            <Ionicons name="chevron-forward" size={18} color={isDarkMode ? mutedText : '#9E94AD'} />
                        </TouchableOpacity>

                        <View style={[styles.messageDivider, { backgroundColor: isDarkMode ? border : '#F2ECF8' }]} />

                        <TouchableOpacity
                            style={styles.messageItemRow}
                            activeOpacity={0.75}
                            onPress={() => openEditModal('ebooks')}
                        >
                            <Ionicons name="book-outline" size={20} color={accent || '#581C87'} style={styles.messageRowIcon} />
                            <Text style={[styles.messageRowLabel, { color: isDarkMode ? text : '#3B0D66' }]}>Message for e-books</Text>
                            <Ionicons name="chevron-forward" size={18} color={isDarkMode ? mutedText : '#9E94AD'} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 🔒 Content Protection */}
                <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? card : '#FFFFFF', borderColor: isDarkMode ? border : '#ECE4F5', marginBottom: 36 }]}>
                    <View style={styles.protectionHeaderRow}>
                        <Ionicons name="lock-closed" size={18} color="#D97706" style={{ marginRight: 6 }} />
                        <Text style={[styles.sectionHeading, { color: isDarkMode ? text : '#3B0D66', marginBottom: 0 }]}>
                            Content Protection
                        </Text>
                    </View>

                    <View style={styles.protectionList}>
                        <View style={styles.protectionRow}>
                            <Ionicons name="ban" size={16} color="#DC2626" style={styles.banIcon} />
                            <Text style={[styles.protectionText, { color: isDarkMode ? text : '#3B0D66' }]}>No prints allowed</Text>
                        </View>

                        <View style={styles.protectionRow}>
                            <Ionicons name="ban" size={16} color="#DC2626" style={styles.banIcon} />
                            <Text style={[styles.protectionText, { color: isDarkMode ? text : '#3B0D66' }]}>No downloads allowed</Text>
                        </View>

                        <View style={styles.protectionRow}>
                            <Ionicons name="ban" size={16} color="#DC2626" style={styles.banIcon} />
                            <Text style={[styles.protectionText, { color: isDarkMode ? text : '#3B0D66' }]}>No screenshots allowed</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.previewWarningBtn, { borderColor: accent || '#581C87', backgroundColor: isDarkMode ? card : '#FFFFFF' }]}
                        onPress={handlePrintAttempt}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="flask-outline" size={16} color={accent || '#581C87'} style={{ marginRight: 6 }} />
                        <Text style={[styles.previewWarningBtnText, { color: accent || '#581C87' }]}>
                            Preview protection warning
                        </Text>
                    </TouchableOpacity>
                </View>

                <PrintWarningModal />
            </ScrollView>

            {/* Custom Messages Editing Modal */}
            <Modal visible={editingModalVisible} transparent animationType="slide" onRequestClose={() => setEditingModalVisible(false)}>
                <View style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.4)' }]}>
                    <View style={[styles.modalCardNice, { maxWidth: 640, backgroundColor: card, borderColor: border }]}>
                        <View style={styles.modalHeaderRow}>
                            <View>
                                <Text style={[styles.modalTitleBold, { color: text }]}>{t('subventionSetup.editMessageTitle')}</Text>
                                <Text style={[styles.modalSubtitle, { color: mutedText }]}>
                                    {t('subventionSetup.messageForType', { type: t('subventionSetup.messageType' + (editingMessageType === 'photos' ? 'Photos' : editingMessageType === 'videos' ? 'Videos' : 'Ebooks')) })}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setEditingModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color={mutedText} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            value={editingMessageText}
                            onChangeText={setEditingMessageText}
                            placeholder={t('subventionSetup.messagePlaceholder')}
                            placeholderTextColor={mutedText}
                            multiline
                            style={[styles.modalTextInput, { minHeight: 120, maxHeight: 320, backgroundColor: card, borderColor: border, color: text }]}
                        />

                        <View style={styles.modalActionsRow}>
                            <TouchableOpacity style={[styles.modalActionSecondary]} onPress={() => setEditingModalVisible(false)}>
                                <Text style={[styles.modalActionTextSecondary, { color: mutedText }]}>{t('subventionSetup.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalActionPrimary, { backgroundColor: accent || '#581C87' }]}
                                onPress={async () => {
                                    const ok = await saveCustomMessage(editingMessageType, editingMessageText || '');
                                    if (ok) setEditingModalVisible(false);
                                }}
                            >
                                <Text style={[styles.modalActionTextPrimary]}>{t('subventionSetup.save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <StoryComposer
                modalVisible={composerVisible}
                mediaList={composerList}
                onCancel={() => setComposerVisible(false)}
                onDone={handleComposerDone}
            />

            <CustomGalleryPickerModal
                visible={galleryPickerVisible}
                onClose={() => setGalleryPickerVisible(false)}
                onSelect={handleGallerySelect}
                onOpenCamera={() => {
                    setGalleryPickerVisible(false);
                    openCamera();
                }}
                maxSelection={10}
                mediaType="mixed"
            />

            {isBusinessProfile ? (
                <>
                    <BusinessPlanModal
                        visible={showActivationPopup && !showBusinessReminderPopup}
                        onClose={closeBusinessFlow}
                        onActivate={handleBusinessActivationConfirm}
                        onContinue={handleBusinessContinueBasic}
                    />
                    <BusinessReminderModal
                        visible={showActivationPopup && showBusinessReminderPopup}
                        onClose={closeBusinessFlow}
                        onUpgrade={handleBusinessActivationConfirm}
                        onContinue={handleBusinessContinueLimited}
                    />
                    <BusinessSuccessModal visible={showBusinessSuccessPopup} />
                </>
            ) : (
                <SubscriptionActivationPopup
                    visible={showActivationPopup}
                    onClose={() => { setShowModal(false); setShowActivationPopup(false); }}
                    onConfirm={handleActivationConfirm}
                    amount={9.9}
                    period="month"
                />
            )}

            <ConnectStripeModal
                visible={showStripeSetupModal}
                onClose={() => setShowStripeSetupModal(false)}
                onConnectStripe={async () => {
                    setShowStripeSetupModal(false);
                    setShowActivationPopup(false);
                    try {
                        await openOnboarding();
                    } catch (e) {
                        showToastMessage(toast, 'danger', e?.message || stripeErrorMessages.ONBOARDING_FAILED);
                    }
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    headerMenuButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleTop: {
        fontSize: 18,
        fontWeight: '800',
        lineHeight: 22,
        letterSpacing: -0.2,
    },
    headerTitleBottom: {
        fontSize: 18,
        fontWeight: '800',
        lineHeight: 22,
        letterSpacing: -0.2,
    },
    headerRightSpacer: {
        width: 36,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 14,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    heroLeftCol: {
        flex: 1,
        paddingRight: 10,
    },
    heroTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    heroBody1: {
        fontSize: 12,
        lineHeight: 16.5,
        marginBottom: 8,
    },
    heroBody2: {
        fontSize: 11.5,
        lineHeight: 15.5,
    },
    heroRightCol: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 95,
    },
    dralensBubble: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderWidth: 1,
        borderColor: '#E6DEEF',
        marginBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 2,
    },
    dralensBubbleText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#581C87',
    },
    mascotWrapper: {
        width: 82,
        height: 75,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mascotImage: {
        width: 78,
        height: 72,
    },
    padlockImage: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 34,
        height: 34,
    },
    sectionCard: {
        marginHorizontal: 16,
        marginBottom: 14,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    sectionSubheading: {
        fontSize: 12.5,
        marginTop: 2,
        marginBottom: 14,
    },
    priceRowContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    priceInputGroup: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderBottomWidth: 2.5,
        paddingBottom: 2,
    },
    priceCurrencySymbol: {
        fontSize: 32,
        fontWeight: '800',
        lineHeight: 38,
    },
    priceTextInput: {
        fontSize: 32,
        fontWeight: '800',
        lineHeight: 38,
        minWidth: 80,
        paddingVertical: 0,
        paddingHorizontal: 2,
    },
    pricePerMonth: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
        marginBottom: 6,
    },
    priceRangeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 14,
    },
    rangeLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    commentInput: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 46,
        fontSize: 13,
        marginBottom: 14,
    },
    subscriptionEndsContainer: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    subEndsLabel: {
        fontSize: 11.5,
    },
    subEndsValue: {
        fontSize: 13.5,
        fontWeight: '700',
        marginTop: 2,
    },
    subStatusBadge: {
        backgroundColor: '#E5E1EC',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4.5,
    },
    subStatusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#463F52',
        letterSpacing: 0.5,
    },
    termsHeadingCenter: {
        fontSize: 13.5,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    agreedPillButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 7,
        marginBottom: 16,
    },
    agreedPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    primaryButton: {
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 14.5,
        fontWeight: '700',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    badgeIconSquare: {
        width: 24,
        height: 24,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    sectionHeaderTextCol: {
        flex: 1,
    },
    contentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
    },
    gridTile: {
        width: '31.5%',
        height: 98,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        paddingVertical: 8,
        position: 'relative',
    },
    gridTileCreate: {
        borderStyle: 'dashed',
        borderWidth: 1,
    },
    selectedCheckBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridTileIcon: {
        marginBottom: 4,
    },
    gridTileTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 2,
    },
    gridTileSub: {
        fontSize: 9.5,
        textAlign: 'center',
    },
    createPillBtn: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 4,
    },
    createPillBtnText: {
        color: '#FFFFFF',
        fontSize: 9.5,
        fontWeight: '700',
    },
    messagesListContainer: {
        marginTop: 2,
    },
    messageItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    messageRowIcon: {
        marginRight: 10,
    },
    messageRowLabel: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '600',
    },
    messageDivider: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
    },
    protectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    protectionList: {
        gap: 8,
    },
    protectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    banIcon: {
        marginRight: 8,
    },
    protectionText: {
        fontSize: 13,
        fontWeight: '500',
    },
    previewWarningBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderRadius: 8,
        paddingVertical: 9,
        marginTop: 14,
    },
    previewWarningBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
    },
    modalIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 14,
        color: '#4b5563',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    warningBox: {
        backgroundColor: '#fffbeb',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#fef3c7',
    },
    warningIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    warningText: {
        fontSize: 12,
        color: '#92400e',
        flex: 1,
    },
    footerText: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    understandButton: {
        backgroundColor: '#581C87',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 24,
        width: '100%',
        alignItems: 'center',
    },
    understandButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalCardNice: {
        width: '100%',
        borderRadius: 14,
        padding: 16,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    modalCloseBtn: {
        padding: 6,
        borderRadius: 8,
    },
    modalTitleBold: {
        fontSize: 18,
        fontWeight: '800',
    },
    modalSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    modalTextInput: {
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        borderWidth: StyleSheet.hairlineWidth,
        textAlignVertical: 'top',
    },
    modalActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 14,
    },
    modalActionSecondary: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        marginRight: 8,
    },
    modalActionPrimary: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    modalActionTextPrimary: {
        color: '#fff',
        fontWeight: '800',
    },
    modalActionTextSecondary: {
        fontWeight: '700',
    },
});

export default SubventionSetupScreen;
