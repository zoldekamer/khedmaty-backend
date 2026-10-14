
import { useEffect, useState } from 'react'
import { countryCodes } from './countries'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const SERVICE_CATEGORIES = [
  {
    name: 'المنزل والصيانة',
    services: [
      { name: 'تنظيف المنزل', icon: '🧹', color: 'peach' },
      { name: 'السباكة', icon: '🔧', color: 'blue' },
      { name: 'الكهرباء', icon: '💡', color: 'yellow' },
      { name: 'التكييف', icon: '❄️', color: 'mint' },
      { name: 'الدهان والديكور', icon: '🎨', color: 'lavender' },
      { name: 'النجارة والأثاث', icon: '🪚', color: 'rose' },
      { name: 'مكافحة الحشرات', icon: '🐜', color: 'peach' },
      { name: 'نقل الأثاث', icon: '📦', color: 'blue' },
      { name: 'صيانة عامة', icon: '🛠️', color: 'yellow' },
    ],
  },
  {
    name: 'العناية والمنزل',
    services: [
      { name: 'غسيل وكي الملابس', icon: '👔', color: 'mint' },
      { name: 'العناية بالحدائق', icon: '🪴', color: 'lavender' },
      { name: 'رعاية الأطفال', icon: '🧸', color: 'rose' },
      { name: 'رعاية كبار السن', icon: '🤝', color: 'peach' },
      { name: 'حلاقة وتجميل منزلي', icon: '💇', color: 'blue' },
    ],
  },
  {
    name: 'الأعمال والموارد البشرية',
    services: [
      { name: 'التوظيف واستقطاب الكفاءات', icon: '🧑‍💼', color: 'yellow' },
      { name: 'إعداد السيرة الذاتية', icon: '📄', color: 'mint' },
      { name: 'استشارات الموارد البشرية', icon: '👥', color: 'lavender' },
      { name: 'التدريب والتطوير المهني', icon: '🎓', color: 'rose' },
      { name: 'المحاسبة والخدمات المالية', icon: '🧾', color: 'peach' },
      { name: 'التسويق وإدارة الأعمال', icon: '📊', color: 'blue' },
    ],
  },
  {
    name: 'التقنية والتصميم',
    services: [
      { name: 'صيانة الكمبيوتر والجوال', icon: '💻', color: 'yellow' },
      { name: 'تصميم المواقع والتطبيقات', icon: '📱', color: 'mint' },
      { name: 'تصميم جرافيك', icon: '🖌️', color: 'lavender' },
      { name: 'تركيب الشبكات والإنترنت', icon: '📡', color: 'rose' },
      { name: 'التصوير والمونتاج', icon: '📷', color: 'peach' },
    ],
  },
  {
    name: 'التعليم والاستشارات',
    services: [
      { name: 'دروس خصوصية', icon: '📚', color: 'blue' },
      { name: 'تعليم اللغات', icon: '🗣️', color: 'yellow' },
      { name: 'استشارات قانونية', icon: '⚖️', color: 'mint' },
      { name: 'ترجمة وتحرير', icon: '🌐', color: 'lavender' },
    ],
  },
  {
    name: 'النقل والمناسبات',
    services: [
      { name: 'توصيل ونقل', icon: '🚚', color: 'rose' },
      { name: 'تنظيم المناسبات', icon: '🎉', color: 'peach' },
      { name: 'ضيافة المناسبات', icon: '🍽️', color: 'blue' },
    ],
  },
]
const SERVICES = SERVICE_CATEGORIES.flatMap((category) => category.services)
const countryNames = new Intl.DisplayNames(['ar'], { type: 'region' })
const requestStatuses = ['قيد المراجعة', 'تم القبول', 'قيد التنفيذ', 'مكتمل', 'ملغي']
const requestStatusLabels = Object.fromEntries(requestStatuses.map((status) => [status, status]))
const providerStatuses = ['pending', 'approved', 'rejected']
const providerStatusLabels = { pending: 'قيد المراجعة', approved: 'تم التحقق', rejected: 'مرفوض' }

async function apiRequest(path, { token, ...options } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || 'حدث خطأ، حاول مرة أخرى')
  return body
}

function Icon({ name }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('khedmaty_token') || '')
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('khedmaty_user') || 'null') } catch { return null }
  })
  const [screen, setScreen] = useState(() => {
    if (new URLSearchParams(window.location.search).has('oauth_error')) return 'login'
    if (!localStorage.getItem('khedmaty_token')) return 'landing'
    try { return JSON.parse(localStorage.getItem('khedmaty_user') || 'null')?.role === 'admin' ? 'admin' : 'home' } catch { return 'home' }
  })
  const [intent, setIntent] = useState('client')
  const [authMode, setAuthMode] = useState('otp')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [requests, setRequests] = useState([])
  const [adminData, setAdminData] = useState(null)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminRequests, setAdminRequests] = useState([])
  const [adminProviders, setAdminProviders] = useState([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(() => {
    const oauthError = new URLSearchParams(window.location.search).get('oauth_error')
    if (oauthError === 'provider_not_configured') return 'تسجيل الدخول الاجتماعي غير مهيأ بعد على الخادم.'
    if (oauthError === 'authentication_not_configured') return 'إعدادات المصادقة غير مكتملة على الخادم.'
    return oauthError ? 'تعذر تسجيل الدخول عبر الحساب الاجتماعي. تحقق من إعدادات المزود وحاول مرة أخرى.' : ''
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ticket = params.get('oauth_ticket')
    const oauthError = params.get('oauth_error')
    if (!ticket && !oauthError) return

    window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`)
    if (oauthError) return

    let cancelled = false
    apiRequest('/auth/oauth/exchange', {
      method: 'POST',
      body: JSON.stringify({ ticket }),
    })
      .then((result) => {
        if (cancelled) return
        saveOAuthSession(result.token, result.user, result.intent)
      })
      .catch((error) => {
        if (!cancelled) {
          setNotice(error.message)
          setScreen('login')
        }
      })
    return () => { cancelled = true }
  }, [])

  const [requestForm, setRequestForm] = useState({
    service: '', icon: '', customerName: '', phone: '', address: '', date: '', time: '', notes: '',
  })
  const [providerForm, setProviderForm] = useState({
    fullName: '', city: '', categories: '', bio: '',
  })

  useEffect(() => {
    if (!token) return
    apiRequest('/requests', { token })
      .then((result) => setRequests(result.data || []))
      .catch((error) => {
        setNotice(error.message)
        if (error.message === 'Not authorized') logout()
      })
  }, [token])

  useEffect(() => {
    if (!token || user?.role !== 'admin' || !screen.startsWith('admin')) return
    const endpoints = {
      admin: ['/admin/dashboard', setAdminData],
      'admin-users': ['/admin/users', (result) => setAdminUsers(result.data || [])],
      'admin-requests': ['/admin/requests', (result) => setAdminRequests(result.data || [])],
      'admin-providers': ['/admin/providers', (result) => setAdminProviders(result.data || [])],
    }
    const selected = endpoints[screen]
    if (!selected) return
    let cancelled = false
    apiRequest(selected[0], { token })
      .then((result) => { if (!cancelled) selected[1](result) })
      .catch((error) => { if (!cancelled) setNotice(error.message) })
    return () => { cancelled = true }
  }, [token, user?.role, screen])

  function saveSession(sessionToken, sessionUser) {
    localStorage.setItem('khedmaty_token', sessionToken)
    localStorage.setItem('khedmaty_user', JSON.stringify(sessionUser))
    setToken(sessionToken)
    setUser(sessionUser)
  }

  function saveOAuthSession(sessionToken, sessionUser, authIntent) {
    finishSignIn({ token: sessionToken, user: sessionUser }, authIntent)
  }

  function finishSignIn(result, authIntent = intent) {
    const { token: sessionToken, user: sessionUser } = result
    saveSession(sessionToken, sessionUser)
    setRequestForm((current) => ({
      ...current,
      customerName: sessionUser.name || '',
      phone: sessionUser.phoneNumber || '',
    }))
    if (sessionUser.role === 'admin') {
      setScreen('admin')
    } else if (authIntent === 'provider' && sessionUser.role !== 'provider') {
      setProviderForm((current) => ({ ...current, fullName: sessionUser.name || '' }))
      setScreen('provider')
    } else if (sessionUser.role === 'provider') {
      setScreen('provider-status')
    } else {
      setScreen('home')
    }
  }

  function startSocialLogin(provider) {
    window.location.assign(`${API_BASE}/auth/oauth/${provider}?intent=${encodeURIComponent(intent)}`)
  }

  function logout() {
    localStorage.removeItem('khedmaty_token')
    localStorage.removeItem('khedmaty_user')
    setToken('')
    setUser(null)
    setRequests([])
    setScreen('login')
  }

  async function handleSendOtp(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      const result = await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      })
      setOtpSent(true)
      setNotice(result.message)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      if (authMode === 'reset') {
        const result = await apiRequest('/auth/password/reset', {
          method: 'POST',
          body: JSON.stringify({ phoneNumber, otp, password: newPassword }),
        })
        setAuthMode('password')
        setOtpSent(false)
        setOtp('')
        setNewPassword('')
        setNotice(result.message)
        return
      }
      const result = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, otp }),
      })
      finishSignIn(result)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handlePasswordLogin(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, password: newPassword }),
      })
      finishSignIn(result)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateRequest(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      const result = await apiRequest('/requests', {
        token,
        method: 'POST',
        body: JSON.stringify(requestForm),
      })
      setRequests((current) => [result.data, ...current])
      setRequestForm((current) => ({ ...current, service: '', icon: '', address: '', date: '', time: '', notes: '' }))
      setScreen('requests')
      setNotice('تم إرسال طلبك بنجاح، سنتواصل معك قريبًا.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleProviderRegistration(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      const result = await apiRequest('/auth/provider/register', {
        token,
        method: 'POST',
        body: JSON.stringify({
          fullName: providerForm.fullName,
          city: providerForm.city,
          categories: providerForm.categories.split(',').map((category) => category.trim()).filter(Boolean),
          bio: providerForm.bio,
        }),
      })
      setUser(result.user)
      localStorage.setItem('khedmaty_user', JSON.stringify(result.user))
      setScreen('provider-status')
      setNotice('وصل طلب انضمامك بنجاح.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function updateAdminStatus(type, id, status) {
    setBusy(true)
    setNotice('')
    try {
      const result = await apiRequest(`/admin/${type}/${id}/status`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (type === 'requests') {
        setAdminRequests((current) => current.map((request) => request._id === id ? result.data : request))
        setAdminData((current) => current ? {
          ...current,
          latestRequests: current.latestRequests.map((request) => request._id === id ? result.data : request),
        } : current)
        setNotice('تم تحديث حالة الطلب.')
      } else {
        setAdminProviders((current) => current.map((provider) => provider._id === id ? result.data : provider))
        setNotice('تم تحديث حالة مقدم الخدمة.')
      }
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  function chooseService(service) {
    setRequestForm((current) => ({ ...current, service: service.name, icon: service.icon }))
    setScreen('new-request')
    setNotice('')
  }

  const activeNav = screen.startsWith('admin') ? 'admin' : screen === 'requests' ? 'requests' : screen === 'provider' || screen === 'provider-status' ? 'provider' : 'home'

  if (!token && screen === 'landing') {
    return (
      <main className="landing-page" dir="rtl">
        <header className="landing-header">
          <a className="brand" href="#" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <span className="brand-mark">خ</span><span>خِدمتي</span>
          </a>
          <a className="landing-header-link" href="#countries">رحلتنا للعالم <span>↓</span></a>
          <button className="button button-primary landing-login" onClick={() => { setScreen('login'); setNotice('') }}>دخول / إنشاء حساب</button>
        </header>

        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-kicker"><span className="live-dot" /> فكرة محلية، بطموح عالمي</span>
            <h1>خِدمتي.<br /><span>بيتك، وين ما كنت.</span></h1>
            <p>من تنظيف البيت إلى إصلاح الأعطال، خِدمتي تجمعك بأصحاب الخبرة لتلقى المساعدة الموثوقة بسهولة — ونطمح نوصل لكل بيت حول العالم.</p>
            <div className="landing-actions">
              <button className="button button-primary" onClick={() => { setIntent('client'); setScreen('login'); setNotice('') }}>اكتشف خدماتنا <Icon name="arrow" /></button>
              <a className="landing-secondary-link" href="#countries">شوف الدول <span>↓</span></a>
            </div>
            <div className="landing-proof"><span className="proof-avatars"><i>🏠</i><i>🧰</i><i>✨</i></span><span><strong>كل خدمة تبدأ بخطوة</strong><small>تجربة أسهل للعميل ومقدم الخدمة</small></span></div>
          </div>
          <div className="landing-art" aria-label="تصميم توضيحي لمنزل وخدماته">
            <div className="landing-art-glow" />
            <div className="landing-art-ring ring-outer" /><div className="landing-art-ring ring-inner" />
            <div className="landing-house"><div className="landing-roof" /><div className="landing-walls"><span className="landing-window window-one" /><span className="landing-window window-two" /><span className="landing-door" /></div><span className="landing-chimney" /></div>
            <div className="floating-service service-float-one"><span>🧹</span><strong>تنظيف المنزل</strong></div>
            <div className="floating-service service-float-two"><span>🔧</span><strong>صيانة موثوقة</strong></div>
            <span className="landing-spark spark-one">✦</span><span className="landing-spark spark-two">✧</span>
          </div>
          <span className="landing-vertical-note">راحة أقرب، مهما كانت المسافة</span>
        </section>

        <section className="landing-services">
          <div className="landing-section-intro"><span className="eyebrow">من حول بيتك</span><h2>مساعدة تحتاجها، بخطوات أبسط</h2><p>منصة تجمع أصحاب المنازل بأصحاب المهارة والخبرة.</p></div>
          <div className="landing-feature-grid">
            <article><span className="feature-icon">🏡</span><div><h3>للعميل</h3><p>اكتشف الخدمات، أرسل طلبك، وتابع تفاصيله من مكان واحد.</p></div><button onClick={() => { setIntent('client'); setScreen('login') }}>أطلب خدمة <span>←</span></button></article>
            <article><span className="feature-icon">🧰</span><div><h3>لمقدم الخدمة</h3><p>عرّف الناس بخبرتك وقدّم طلب انضمامك لمجتمع خِدمتي.</p></div><button onClick={() => { setIntent('provider'); setScreen('login') }}>انضم كمختص <span>←</span></button></article>
            <article><span className="feature-icon">🌱</span><div><h3>طموح عالمي</h3><p>نبدأ بفكرة بسيطة، ونطمح أن تصل خدماتها إلى كل دول العالم.</p></div><a href="#countries">اكتشف الدول <span>←</span></a></article>
          </div>
          <div className="landing-catalog">
            <div className="landing-section-intro"><span className="eyebrow">مجالات خِدمتي</span><h2>خدمات متنوعة لكل احتياج</h2><p>من خدمات المنزل إلى الموارد البشرية والتقنية والأعمال.</p></div>
            {SERVICE_CATEGORIES.map((category) => (
              <section className="catalog-category" key={category.name}>
                <h3>{category.name}</h3>
                <div className="service-grid">
                  {category.services.map((service) => (
                    <button className="service-card" key={service.name} onClick={() => { setIntent('client'); setScreen('login'); setNotice('') }}>
                      <span className={`service-icon ${service.color}`}>{service.icon}</span><strong>{service.name}</strong><span className="service-arrow"><Icon name="arrow" /></span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="countries-section" id="countries">
          <div className="countries-heading"><div><span className="eyebrow">العالم بيتنا</span><h2>خِدمتي تطمح أن تكون في جميع الدول</h2><p>195 دولة، ثقافات وبيوت مختلفة، وحاجة مشتركة لخدمات موثوقة.</p></div><span className="countries-count"><strong>{countryCodes.length}</strong><small>دولة حول العالم</small></span></div>
          <div className="country-grid">
            {countryCodes.map((code) => <div className="country-tile" key={code} title={countryNames.of(code)}><img className="country-flag" src={`https://flagcdn.com/w160/${code.toLowerCase()}.png`} alt={`علم ${countryNames.of(code)}`} width="160" height="107" loading="lazy" decoding="async" referrerPolicy="no-referrer" /><span>{countryNames.of(code)}</span></div>)}
          </div>
          <p className="country-note">طموحنا أن تصل خِدمتي إلى كل هذه الدول. توفّر الخدمات فعليًا يعتمد على إطلاق الخدمة في كل بلد.</p>
        </section>

        <footer className="landing-footer"><a className="brand" href="#"><span className="brand-mark">خ</span><span>خِدمتي</span></a><span>راحة أقرب لكل بيت، حول العالم.</span><button onClick={() => { setScreen('login'); setNotice('') }}>ابدأ رحلتك <Icon name="arrow" /></button></footer>
      </main>
    )
  }

  if (!token || screen === 'login') {
    return (
      <main className="auth-page" dir="rtl">
        <section className="auth-visual">
          <a className="brand brand-light" href="/" aria-label="خدمتي الرئيسية">
            <span className="brand-mark">خ</span><span>خِدمتي</span>
          </a>
          <div className="visual-copy">
            <span className="eyebrow">خدمات موثوقة، أقرب إليك</span>
            <h1>بيتك يستاهل<br />الاهتمام.</h1>
            <p>كل خدمات بيتك في مكان واحد. اطلب بسهولة، واترك الباقي علينا.</p>
            <div className="visual-points">
              <span><span className="check">✓</span> مختصون موثوقون</span>
              <span><span className="check">✓</span> طلبك بكل سهولة</span>
            </div>
          </div>
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-card"><span>🏠</span><div><strong>بيتك بأيدٍ أمينة</strong><small>خدمة تليق بك وببيتك</small></div><span className="card-spark">✦</span></div>
          <span className="visual-foot">خِدمتي · راحتك تبدأ من هنا</span>
        </section>

        <section className="auth-panel">
          <div className="auth-topline"><span>أهلًا بك في خِدمتي</span><span className="secure-note"><Icon name="shield" /> دخول آمن</span></div>
          <div className="auth-form-wrap">
            <div className="mobile-brand brand"><span className="brand-mark">خ</span><span>خِدمتي</span></div>
            <span className="eyebrow form-eyebrow">{otpSent ? 'خطوة أخيرة' : 'خلّينا نبدأ'}</span>
            <h2>{otpSent ? (authMode === 'reset' ? 'استعادة كلمة المرور' : 'تحقق من رقمك') : authMode === 'reset' ? 'نسيت كلمة المرور؟' : 'خدمات بيتك، أسهل'}</h2>
            <p className="form-intro">{otpSent ? `أدخل رمز التحقق المرسل إلى ${phoneNumber}` : authMode === 'password' ? 'أدخل رقم هاتفك وكلمة المرور.' : authMode === 'reset' ? 'سنرسل رمز تحقق إلى هاتفك لإعادة تعيين كلمة المرور.' : 'سجّل دخولك أو أنشئ حسابك برقم هاتفك.'}</p>

            {!otpSent && authMode === 'otp' && (
              <>
                <div className="role-picker" aria-label="نوع الحساب">
                  <button type="button" className={intent === 'client' ? 'role-option selected' : 'role-option'} onClick={() => setIntent('client')}>
                    <span>🏡</span><span><strong>أبحث عن خدمة</strong><small>أنا عميل</small></span>
                  </button>
                  <button type="button" className={intent === 'provider' ? 'role-option selected' : 'role-option'} onClick={() => setIntent('provider')}>
                    <span>🧰</span><span><strong>أقدّم خدمة</strong><small>أنا مختص</small></span>
                  </button>
                </div>
                <form className="form-stack" onSubmit={handleSendOtp}>
                  <label htmlFor="phone">رقم الهاتف</label>
                  <div className="phone-input">
                    <input id="phone" dir="ltr" type="tel" inputMode="tel" autoComplete="tel" placeholder="+1 555 123 4567" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required />
                  </div>
                  <button className="button button-primary button-full" disabled={busy}>{busy ? 'جارٍ الإرسال...' : authMode === 'reset' ? 'أرسل رمز إعادة التعيين' : 'أرسل رمز التحقق'}<Icon name="arrow" /></button>
                </form>
                {authMode === 'otp' && <div className="auth-mode-links">
                  <button className="text-button" type="button" onClick={() => { setAuthMode('password'); setNotice('') }}>الدخول بكلمة المرور</button>
                  <button className="text-button" type="button" onClick={() => { setAuthMode('reset'); setOtpSent(false); setOtp(''); setNotice('') }}>نسيت كلمة المرور؟</button>
                </div>}
                <div className="social-auth">
                  <span>أو تابع باستخدام</span>
                  <div>
                    <button className="button button-outline" type="button" onClick={() => startSocialLogin('google')}>Google</button>
                    <button className="button button-outline" type="button" onClick={() => startSocialLogin('facebook')}>Facebook</button>
                  </div>
                </div>
              </>
            )}

            {!otpSent && authMode === 'reset' && (
              <form className="form-stack" onSubmit={handleSendOtp}>
                <label htmlFor="reset-phone">رقم الهاتف</label>
                <input id="reset-phone" dir="ltr" type="tel" inputMode="tel" autoComplete="tel" placeholder="+962 7X XXX XXXX" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required />
                <button className="button button-primary button-full" disabled={busy}>{busy ? 'جارٍ الإرسال...' : 'أرسل رمز إعادة التعيين'}<Icon name="arrow" /></button>
              </form>
            )}

            {!otpSent && authMode === 'password' && (
              <>
                <form className="form-stack" onSubmit={handlePasswordLogin}>
                  <label htmlFor="login-phone">رقم الهاتف</label>
                  <input id="login-phone" dir="ltr" type="tel" inputMode="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required />
                  <label htmlFor="login-password">كلمة المرور</label>
                  <input id="login-password" type="password" autoComplete="current-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                  <button className="button button-primary button-full" disabled={busy}>{busy ? 'جارٍ الدخول...' : 'تسجيل الدخول'}<Icon name="arrow" /></button>
                </form>
                <div className="auth-mode-links">
                  <button className="text-button" type="button" onClick={() => { setAuthMode('otp'); setNewPassword(''); setNotice('') }}>الدخول برمز الهاتف</button>
                  <button className="text-button" type="button" onClick={() => { setAuthMode('reset'); setNewPassword(''); setNotice('') }}>نسيت كلمة المرور؟</button>
                </div>
              </>
            )}

            {otpSent && (
              <form className="form-stack otp-stack" onSubmit={handleVerifyOtp}>
                <label htmlFor="otp">رمز التحقق</label>
                <input className="otp-input" id="otp" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••" value={otp} onChange={(event) => setOtp(event.target.value)} required />
                {authMode === 'reset' && <>
                  <label htmlFor="new-password">كلمة المرور الجديدة</label>
                  <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                </>}
                <button className="button button-primary button-full" disabled={busy}>{busy ? 'جارٍ التحقق...' : authMode === 'reset' ? 'إعادة تعيين كلمة المرور' : 'تحقق وادخل'}<Icon name="arrow" /></button>
                <button className="text-button" type="button" onClick={() => { setOtpSent(false); setOtp(''); setNotice('') }}>{authMode === 'reset' ? 'تغيير الرقم أو إعادة إرسال الرمز' : 'تغيير رقم الهاتف'}</button>
              </form>
            )}
            {notice && <div className={notice.includes('بنجاح') || notice.includes('1234') ? 'notice notice-success' : 'notice'} role="status">{notice}</div>}
            <div className="auth-trust"><Icon name="shield" /><span>بياناتك محمية ونحافظ على خصوصيتك</span></div>
          </div>
          <footer className="auth-footer">© 2026 خِدمتي. كل الحقوق محفوظة.</footer>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell" dir="rtl">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setScreen('home') }}>
          <span className="brand-mark">خ</span><span>خِدمتي</span>
        </a>
        <div className="side-caption">القائمة الرئيسية</div>
        <nav className="side-nav" aria-label="القائمة الرئيسية">
          {user?.role === 'admin' ? (
            <>
              <button className={activeNav === 'admin' && screen === 'admin' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('admin')}><Icon name="home" />لوحة الإدارة</button>
              <button className={screen === 'admin-requests' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('admin-requests')}><Icon name="list" />إدارة الطلبات</button>
              <button className={screen === 'admin-providers' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('admin-providers')}><Icon name="user" />مقدمو الخدمة</button>
              <button className={screen === 'admin-users' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('admin-users')}><Icon name="user" />المستخدمون</button>
            </>
          ) : (
            <>
              <button className={activeNav === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('home')}><Icon name="home" />الرئيسية</button>
              <button className={activeNav === 'requests' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('requests')}><Icon name="list" />طلباتي<span className="nav-count">{requests.length}</span></button>
              <button className={activeNav === 'provider' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen(user?.role === 'provider' ? 'provider-status' : 'provider')}><Icon name="user" />{user?.role === 'provider' ? 'ملف مقدم الخدمة' : 'كن مقدم خدمة'}</button>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          {user?.role !== 'admin' && <div className="help-card"><span className="help-icon">✦</span><strong>نحن هنا لمساعدتك</strong><small>تحتاج مساعدة في طلبك؟</small><a href="mailto:support@khedmaty.app">تواصل مع الدعم <span>←</span></a></div>}
          <button className="nav-item logout-button" onClick={logout}><Icon name="logout" />تسجيل الخروج</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">خِدمتي <span>/</span> {screen === 'admin' ? 'لوحة الإدارة' : screen === 'admin-users' ? 'المستخدمون' : screen === 'admin-requests' ? 'إدارة الطلبات' : screen === 'admin-providers' ? 'مقدمو الخدمة' : screen === 'requests' ? 'طلباتي' : screen === 'provider' || screen === 'provider-status' ? 'مقدم الخدمة' : screen === 'new-request' ? 'طلب جديد' : 'الرئيسية'}</div>
          <div className="topbar-user"><span className="avatar">{(user?.name || user?.phoneNumber || 'ع')[0]}</span><span className="user-greeting"><strong>{user?.name || 'أهلًا بك'}</strong><small>{user?.role === 'admin' ? 'مدير النظام' : user?.role === 'provider' ? 'مقدم خدمة' : 'عميل'}</small></span></div>
        </header>

        <div className="content">
          {notice && <div className={notice.includes('بنجاح') ? 'notice notice-success page-notice' : 'notice page-notice'} role="status">{notice}<button aria-label="إغلاق" onClick={() => setNotice('')}>×</button></div>}

          {screen === 'admin' && (
            <section className="admin-page">
              <div className="section-heading"><div><span className="eyebrow">إدارة خِدمتي</span><h1>لوحة التحكم</h1><p className="heading-description">نظرة سريعة على نشاط المنصة وما يحتاج مراجعتك.</p></div><button className="button button-outline" onClick={() => setScreen('admin-requests')}>مراجعة الطلبات <Icon name="arrow" /></button></div>
              {!adminData ? <p className="admin-loading">جارٍ تحميل بيانات الإدارة...</p> : (
                <>
                  <div className="admin-metrics">
                    <button className="admin-metric" onClick={() => setScreen('admin-users')}><span className="metric-icon metric-green"><Icon name="user" /></span><small>العملاء</small><strong>{adminData?.users ?? '—'}</strong><span>عرض المستخدمين ←</span></button>
                    <button className="admin-metric" onClick={() => setScreen('admin-providers')}><span className="metric-icon metric-gold">🧰</span><small>مقدمو الخدمة</small><strong>{adminData?.providers ?? '—'}</strong><span>بانتظار المراجعة: {adminData?.pendingProviders ?? '—'}</span></button>
                    <button className="admin-metric" onClick={() => setScreen('admin-requests')}><span className="metric-icon metric-blue"><Icon name="list" /></span><small>كل الطلبات</small><strong>{adminData?.requests ?? '—'}</strong><span>قيد المراجعة: {adminData?.pendingRequests ?? '—'}</span></button>
                  </div>
                  <div className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">آخر النشاط</span><h2>أحدث طلبات العملاء</h2></div><button className="text-link" onClick={() => setScreen('admin-requests')}>كل الطلبات ←</button></div>
                    {adminData?.latestRequests?.length ? <AdminRequestList requests={adminData.latestRequests} onStatusChange={(request, status) => updateAdminStatus('requests', request._id, status)} busy={busy} /> : <div className="admin-empty">لا توجد طلبات بعد.</div>}
                  </div>
                </>
              )}
            </section>
          )}

          {screen === 'admin-requests' && (
            <section className="admin-page">
              <div className="section-heading"><div><span className="eyebrow">متابعة المنصة</span><h1>إدارة الطلبات</h1><p className="heading-description">راجع الطلبات وحدّث حالتها للعميل.</p></div></div>
              {adminRequests.length ? <AdminRequestList requests={adminRequests} onStatusChange={(request, status) => updateAdminStatus('requests', request._id, status)} busy={busy} /> : <div className="admin-empty">لا توجد طلبات مسجلة.</div>}
            </section>
          )}

          {screen === 'admin-providers' && (
            <section className="admin-page">
              <div className="section-heading"><div><span className="eyebrow">مراجعة الحسابات</span><h1>مقدمو الخدمة</h1><p className="heading-description">وافق على طلبات الانضمام أو حدّث حالة التحقق.</p></div></div>
              {adminProviders.length ? <div className="admin-record-list">{adminProviders.map((provider) => <article className="admin-record" key={provider._id}><span className="admin-record-avatar">🧰</span><div className="admin-record-main"><strong>{provider.name || 'بدون اسم'}</strong><small>{provider.phoneNumber} · {provider.city || 'المدينة غير محددة'}</small><small>{provider.providerInfo?.categories?.join('، ') || 'لم يحدد التخصص'}</small></div><AdminStatusSelect value={provider.providerInfo?.verificationStatus || 'pending'} options={providerStatuses} labels={providerStatusLabels} disabled={busy} onChange={(status) => updateAdminStatus('providers', provider._id, status)} /></article>)}</div> : <div className="admin-empty">لا يوجد مقدمو خدمة بعد.</div>}
            </section>
          )}

          {screen === 'admin-users' && (
            <section className="admin-page">
              <div className="section-heading"><div><span className="eyebrow">حسابات المنصة</span><h1>المستخدمون</h1><p className="heading-description">عرض العملاء ومقدمي الخدمة المسجلين.</p></div></div>
              {adminUsers.length ? <div className="admin-record-list">{adminUsers.map((account) => <article className="admin-record" key={account._id}><span className="admin-record-avatar">{account.role === 'provider' ? '🧰' : account.role === 'admin' ? '🛡️' : '👤'}</span><div className="admin-record-main"><strong>{account.name || 'بدون اسم'}</strong><small>{account.phoneNumber}{account.email ? ` · ${account.email}` : ''}</small><small>{account.city || '—'} · {account.role === 'provider' ? 'مقدم خدمة' : account.role === 'admin' ? 'مدير' : 'عميل'}</small></div>{account.role === 'provider' && <span className={`status-pill ${account.providerInfo?.verificationStatus === 'approved' ? 'status-done' : ''}`}>{providerStatusLabels[account.providerInfo?.verificationStatus || 'pending']}</span>}</article>)}</div> : <div className="admin-empty">لا يوجد مستخدمون مسجلون.</div>}
            </section>
          )}

          {screen === 'home' && (
            <>
              <section className="welcome-banner">
                <div className="welcome-copy"><span className="eyebrow">بيتك علينا ✨</span><h1>أهلًا {user?.name || 'بك'}،<br />شو محتاج اليوم؟</h1><p>خدمات بيتك الموثوقة، على بُعد خطوات بسيطة.</p><button className="button button-dark" onClick={() => setScreen('new-request')}>اطلب خدمة الآن <Icon name="arrow" /></button></div>
                <div className="welcome-art" aria-hidden="true"><div className="art-sun" /><div className="art-house"><div className="house-roof" /><div className="house-body"><span className="house-window" /><span className="house-door" /></div></div><span className="art-spark spark-a">✦</span><span className="art-spark spark-b">✧</span><span className="art-plant">♧</span></div>
                <span className="banner-decoration">خ</span>
              </section>

              <section className="section-block">
                <div className="section-heading"><div><span className="eyebrow">اختار اللي بناسبك</span><h2>خدماتنا</h2></div><span className="section-note">جودة تثق فيها، وراحة تستاهلها</span></div>
                {SERVICE_CATEGORIES.map((category) => (
                  <section className="catalog-category" key={category.name}>
                    <h3>{category.name}</h3>
                    <div className="service-grid">
                      {category.services.map((service) => <button className="service-card" key={service.name} onClick={() => chooseService(service)}><span className={`service-icon ${service.color}`}>{service.icon}</span><strong>{service.name}</strong><span className="service-arrow"><Icon name="arrow" /></span></button>)}
                    </div>
                  </section>
                ))}
              </section>

              <section className="section-block recent-section">
                <div className="section-heading"><div><span className="eyebrow">تابع كل جديد</span><h2>آخر طلباتك</h2></div><button className="text-link" onClick={() => setScreen('requests')}>عرض الكل <span>←</span></button></div>
                {requests.length ? <RequestList requests={requests.slice(0, 3)} /> : <div className="empty-card"><span className="empty-illustration">📋</span><div><strong>لسه ما عندك طلبات</strong><p>اطلب أول خدمة وخلي راحتك علينا.</p></div><button className="button button-outline" onClick={() => setScreen('new-request')}>ابدأ طلبك <Icon name="plus" /></button></div>}
              </section>
            </>
          )}

          {screen === 'new-request' && (
            <section className="form-page">
              <button className="back-link" onClick={() => setScreen('home')}>→ رجوع للرئيسية</button>
              <div className="page-title"><span className="eyebrow">خطوة بسيطة وبيوصلك المختص</span><h1>اطلب خدمة</h1><p>أدخل تفاصيل الخدمة اللي تحتاجها، ونتابع طلبك بكل سهولة.</p></div>
              <form className="data-form" onSubmit={handleCreateRequest}>
                <div className="field-grid">
                  <label>نوع الخدمة<select required value={requestForm.service} onChange={(event) => { const selected = SERVICES.find((service) => service.name === event.target.value); setRequestForm({ ...requestForm, service: event.target.value, icon: selected?.icon || '🛠️' }) }}><option value="">اختر الخدمة</option>{SERVICES.map((service) => <option key={service.name} value={service.name}>{service.icon} {service.name}</option>)}</select></label>
                  <label>الاسم الكامل<input required value={requestForm.customerName} onChange={(event) => setRequestForm({ ...requestForm, customerName: event.target.value })} placeholder="الاسم اللي نتواصل معك فيه" /></label>
                  <label>رقم الهاتف<input required type="tel" dir="ltr" value={requestForm.phone} onChange={(event) => setRequestForm({ ...requestForm, phone: event.target.value })} placeholder="+966 5X XXX XXXX" /></label>
                  <label>العنوان<input required value={requestForm.address} onChange={(event) => setRequestForm({ ...requestForm, address: event.target.value })} placeholder="المدينة، الحي، الشارع" /></label>
                  <label>التاريخ<input required type="date" min={new Date().toISOString().slice(0, 10)} value={requestForm.date} onChange={(event) => setRequestForm({ ...requestForm, date: event.target.value })} /></label>
                  <label>الوقت<input required type="time" value={requestForm.time} onChange={(event) => setRequestForm({ ...requestForm, time: event.target.value })} /></label>
                  <label className="field-wide">ملاحظات إضافية <span className="optional-label">(اختياري)</span><textarea rows="4" value={requestForm.notes} onChange={(event) => setRequestForm({ ...requestForm, notes: event.target.value })} placeholder="اكتب أي تفاصيل تساعد المختص..." /></label>
                </div>
                <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? 'جارٍ إرسال الطلب...' : 'تأكيد الطلب'}<Icon name="arrow" /></button><button className="button button-quiet" type="button" onClick={() => setScreen('home')}>إلغاء</button></div>
              </form>
            </section>
          )}

          {screen === 'requests' && (
            <section className="section-block requests-page">
              <div className="section-heading"><div><span className="eyebrow">كل شيء بمكانه</span><h1>طلباتي</h1><p className="heading-description">تابع حالة خدماتك واطّلع على طلباتك السابقة.</p></div><button className="button button-primary" onClick={() => setScreen('new-request')}><Icon name="plus" /> طلب جديد</button></div>
              {requests.length ? <RequestList requests={requests} /> : <div className="empty-card"><span className="empty-illustration">🧾</span><div><strong>ما أرسلت أي طلب لحد الآن</strong><p>أول طلب خدمة بتقدر تتابعه من هون.</p></div><button className="button button-primary" onClick={() => setScreen('new-request')}>اطلب خدمة</button></div>}
            </section>
          )}

          {screen === 'provider' && (
            <section className="form-page">
              <button className="back-link" onClick={() => setScreen('home')}>→ رجوع للرئيسية</button>
              <div className="page-title"><span className="eyebrow">انضم لمجتمع خِدمتي</span><h1>خلّي خبرتك توصل لناس أكثر</h1><p>عرّفنا عنك وعن خدماتك، وفريقنا بيراجع طلب انضمامك.</p></div>
              <form className="data-form" onSubmit={handleProviderRegistration}>
                <div className="field-grid">
                  <label>الاسم الكامل<input required value={providerForm.fullName} onChange={(event) => setProviderForm({ ...providerForm, fullName: event.target.value })} placeholder="اسمك كما تحب أن يظهر للعملاء" /></label>
                  <label>المدينة<input required value={providerForm.city} onChange={(event) => setProviderForm({ ...providerForm, city: event.target.value })} placeholder="مثال: الرياض" /></label>
                  <label className="field-wide">الخدمات التي تقدمها<input required value={providerForm.categories} onChange={(event) => setProviderForm({ ...providerForm, categories: event.target.value })} placeholder="افصل بين الخدمات بفاصلة، مثال: سباكة، صيانة" /><small className="field-hint">اكتب خدمة واحدة أو أكثر وافصل بينها بفاصلة.</small></label>
                  <label className="field-wide">نبذة عن خبرتك<textarea rows="4" value={providerForm.bio} onChange={(event) => setProviderForm({ ...providerForm, bio: event.target.value })} placeholder="عرّف العملاء بخبرتك وطريقة عملك..." /></label>
                </div>
                <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? 'جارٍ الإرسال...' : 'إرسال طلب الانضمام'}<Icon name="arrow" /></button></div>
              </form>
            </section>
          )}

          {screen === 'provider-status' && (
            <section className="status-page">
              <span className="status-icon"><Icon name="shield" /></span><span className="eyebrow">ملف مقدم الخدمة</span><h1>أهلًا في مجتمع خِدمتي</h1><p>حالة التحقق من حسابك: <strong>{user?.providerInfo?.verificationStatus === 'approved' ? 'تم التحقق' : 'قيد المراجعة'}</strong></p>
              <div className="provider-summary"><div><small>الاسم</small><strong>{user?.name || '—'}</strong></div><div><small>المدينة</small><strong>{user?.city || '—'}</strong></div><div><small>التخصصات</small><strong>{user?.providerInfo?.categories?.join('، ') || '—'}</strong></div></div>
              <p className="status-note">طلبات العملاء وإرسال العروض تحتاج إلى واجهات API إضافية في الخادم؛ ملفك الحالي محفوظ ويمكنك متابعة حالة التحقق هنا.</p>
              <button className="button button-outline" onClick={() => setScreen('home')}>العودة للرئيسية</button>
            </section>
          )}
        </div>
        <footer className="app-footer"><span>© 2026 خِدمتي</span><span>راحتك تبدأ من هنا <span className="footer-heart">♥</span></span></footer>
      </main>
    </div>
  )
}

function RequestList({ requests }) {
  return (
    <div className="request-list">
      {requests.map((request) => (
        <article className="request-row" key={request._id}>
          <span className="request-icon">{request.icon || '🛠️'}</span>
          <div className="request-info"><strong>{request.service}</strong><small>{request.address} · {request.date} · {request.time}</small></div>
          <span className={`status-pill ${request.status === 'مكتمل' ? 'status-done' : ''}`}>{request.status || 'قيد المراجعة'}</span>
        </article>
      ))}
    </div>
  )
}

function AdminStatusSelect({ value, options, labels, disabled, onChange }) {
  return (
    <select className="admin-status-select" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
    </select>
  )
}

function AdminRequestList({ requests, onStatusChange, busy }) {
  return (
    <div className="admin-record-list">
      {requests.map((request) => (
        <article className="admin-record" key={request._id}>
          <span className="admin-record-avatar">{request.icon || '🛠️'}</span>
          <div className="admin-record-main">
            <strong>{request.service} <span className="admin-record-id">#{request._id.slice(-6)}</span></strong>
            <small>{request.customerName} · {request.phone}</small>
            <small>{request.address} · {request.date} · {request.time}</small>
          </div>
          <AdminStatusSelect value={request.status} options={requestStatuses} labels={requestStatusLabels} disabled={busy} onChange={(status) => onStatusChange(request, status)} />
        </article>
      ))}
    </div>
  )
}

export default App
