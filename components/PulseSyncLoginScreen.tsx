import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { API_URL } from '../constants/config';
import { SCREEN_PADDING } from '../constants/layout';
import { premium } from '../constants/premiumTheme';
import { digitsOnly } from '../helpers/validation';
import { buildUsernameCandidates, requestToken } from '../helpers/auth';
import { requestSurveyorLogin } from '../helpers/surveyorAuth';
import { fetchSurveyorProfile, saveCachedProfile } from '../helpers/surveyorSession';
import { isResponsesAdmin } from '../helpers/adminUsers';

const L = premium.login;

type LoginMode = 'surveyor' | 'admin';

type Props = {
  onLoggedIn: () => void | Promise<void>;
  initialMode?: LoginMode;
  showBackLink?: boolean;
};

export default function PulseSyncLoginScreen({
  onLoggedIn,
  initialMode = 'surveyor',
  showBackLink = false,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [surveyorName, setSurveyorName] = useState('');
  const [surveyorNumber, setSurveyorNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const isSurveyor = mode === 'surveyor';

  const canSubmit = useMemo(() => {
    if (loggingIn) return false;
    if (isSurveyor) {
      return surveyorName.trim().length > 0 && digitsOnly(surveyorNumber).length >= 10;
    }
    return username.trim().length > 0 && password.length > 0;
  }, [loggingIn, isSurveyor, surveyorName, surveyorNumber, username, password]);

  const finishLogin = async (token: string) => {
    const userProfile = await fetchSurveyorProfile(token);
    await SecureStore.setItemAsync('token', token);
    await saveCachedProfile(userProfile);
    await onLoggedIn();

    if (isResponsesAdmin(userProfile.username)) {
      router.replace('/admin');
      return;
    }

    if (!isSurveyor) {
      router.replace('/(tabs)/home');
    }
  };

  const handleSurveyorLogin = async () => {
    if (!surveyorName.trim()) {
      Alert.alert('Error', 'Please enter surveyor name');
      return;
    }
    if (digitsOnly(surveyorNumber).length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit surveyor number');
      return;
    }

    setLoggingIn(true);
    try {
      const result = await requestSurveyorLogin(surveyorName, surveyorNumber);
      if (!result.ok) {
        Alert.alert(
          'Login Failed',
          result.detail === 'Enter a valid surveyor name and 10-digit number'
            ? 'Enter a valid surveyor name and 10-digit number.'
            : String(result.detail),
        );
        return;
      }

      setSurveyorName('');
      setSurveyorNumber('');
      await finishLogin(result.token);
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message?.includes('Network Error')
          ? `Cannot reach API at ${API_URL}`
          : 'Server error. Please try again.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoggingIn(true);
    try {
      const candidates = buildUsernameCandidates(username);
      let lastDetail = 'Incorrect username or password';

      for (const candidate of candidates) {
        const result = await requestToken(candidate, password);
        if (result.ok) {
          setUsername('');
          setPassword('');
          await finishLogin(result.token);
          return;
        }
        if (result.detail) lastDetail = String(result.detail);
        if (result.status >= 500) break;
      }

      Alert.alert('Login Failed', lastDetail);
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message?.includes('Network Error')
          ? `Cannot reach API at ${API_URL}`
          : 'Server error. Please try again.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogin = () => {
    if (isSurveyor) {
      void handleSurveyorLogin();
    } else {
      void handleAdminLogin();
    }
  };

  const tagline = isSurveyor ? 'Field Survey Sign In' : 'Admin Console Sign In';
  const welcome = isSurveyor ? 'Welcome' : 'Welcome back';
  const cardSub = isSurveyor
    ? 'Enter your surveyor name and number. These will auto-fill on the survey form.'
    : 'Sign in with your admin email and password to access the console.';

  return (
    <View style={styles.loginRoot}>
      <View style={[styles.glow, styles.glowEmerald]} pointerEvents="none" />
      <View style={[styles.glow, styles.glowIndigo]} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.loginFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.loginScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <View style={styles.shieldBox}>
              <Ionicons name="shield-checkmark" size={30} color="#fff" />
            </View>
            <Text style={styles.brandTitle}>
              PulseSync <Text style={styles.brandAccent}>Intelligence</Text>
            </Text>
            <Text style={styles.brandTag}>{tagline}</Text>
            <Text style={styles.brandSub}>
              Real-time electoral intelligence, field reporting, and survey operations across wards
              and polling stations.
            </Text>
          </View>

          <View style={styles.loginCard}>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, isSurveyor && styles.modeBtnActive]}
                onPress={() => setMode('surveyor')}
                activeOpacity={0.85}
              >
                <Text style={[styles.modeBtnText, isSurveyor && styles.modeBtnTextActive]}>
                  Field Surveyor
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, !isSurveyor && styles.modeBtnActive]}
                onPress={() => setMode('admin')}
                activeOpacity={0.85}
              >
                <Text style={[styles.modeBtnText, !isSurveyor && styles.modeBtnTextActive]}>
                  Admin
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardTitle}>{welcome}</Text>
            <Text style={styles.cardSub}>{cardSub}</Text>

            {isSurveyor ? (
              <>
                <Text style={styles.fieldLabel}>Surveyor Name</Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={premium.textLight}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter surveyor name"
                    placeholderTextColor={premium.textLight}
                    value={surveyorName}
                    onChangeText={setSurveyorName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <Text style={styles.fieldLabel}>Surveyor Number</Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={premium.textLight}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile"
                    placeholderTextColor={premium.textLight}
                    value={surveyorNumber}
                    onChangeText={(t) => setSurveyorNumber(digitsOnly(t))}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Email or username</Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={premium.textLight}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="test@gmail.com"
                    placeholderTextColor={premium.textLight}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={premium.textLight}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.inputWithToggle]}
                    placeholder="••••••••"
                    placeholderTextColor={premium.textLight}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={premium.textLight}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.signInBtn, (!canSubmit || loggingIn) && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit || loggingIn}
              activeOpacity={0.88}
            >
              {loggingIn ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={styles.signInBtnText}>SIGN IN</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {showBackLink ? (
            <TouchableOpacity style={styles.backLink} onPress={() => router.push('/(tabs)/home')}>
              <Ionicons name="arrow-back" size={16} color={L.emerald} />
              <Text style={styles.backLinkText}>Back to Survey</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.fieldNote}>
            Surveyor sessions stay signed in until you log out. Name and mobile remain editable on
            each survey.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  loginRoot: {
    flex: 1,
    backgroundColor: L.pageBg,
  },
  loginFlex: { flex: 1 },
  loginScroll: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 20,
    paddingBottom: 36,
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowEmerald: {
    width: 280,
    height: 280,
    top: -80,
    left: -60,
    backgroundColor: L.emeraldGlow,
  },
  glowIndigo: {
    width: 240,
    height: 240,
    top: 120,
    right: -80,
    backgroundColor: L.indigoGlow,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  shieldBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: L.emeraldDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: L.emerald,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: L.textOnDark,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  brandAccent: {
    color: L.emerald,
  },
  brandTag: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  brandSub: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: L.textMutedOnDark,
    textAlign: 'center',
    paddingHorizontal: 8,
    maxWidth: 340,
  },
  loginCard: {
    backgroundColor: L.cardBg,
    borderRadius: premium.radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: L.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 10,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: premium.radius.sm,
    padding: 4,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: premium.radius.sm - 2,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: premium.textMuted,
  },
  modeBtnTextActive: {
    color: premium.text,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: premium.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 14,
    color: premium.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: L.label,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    borderRadius: premium.radius.sm,
    backgroundColor: L.inputBg,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 4 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
    color: premium.text,
  },
  inputWithToggle: { paddingRight: 36 },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: L.btnBg,
    borderRadius: premium.radius.sm,
    paddingVertical: 15,
    marginTop: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.65 },
  signInBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.2,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 22,
    paddingVertical: 8,
  },
  backLinkText: {
    color: L.emerald,
    fontWeight: '700',
    fontSize: 15,
  },
  fieldNote: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
