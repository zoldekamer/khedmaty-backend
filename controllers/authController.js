const User = require('../models/User');
const OTPChallenge = require('../models/OTPChallenge');
const jwt = require('jsonwebtoken');
const { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const OAuthTransaction = require('../models/OAuthTransaction');

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_RESEND_DELAY_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const scryptAsync = promisify(scrypt);
const OAUTH_STATE_LIFETIME_MS = 10 * 60 * 1000;
const OAUTH_TICKET_LIFETIME_MS = 60 * 1000;
const FACEBOOK_GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || 'v26.0';

const oauthProviders = {
  google: {
    clientId: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
    callbackUrl: 'GOOGLE_CALLBACK_URL'
  },
  facebook: {
    clientId: 'FACEBOOK_APP_ID',
    clientSecret: 'FACEBOOK_APP_SECRET',
    callbackUrl: 'FACEBOOK_CALLBACK_URL'
  }
};

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function oauthCookieOptions() {
  return `HttpOnly; SameSite=Lax; Path=/api/auth/oauth; Max-Age=600${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

function clearOAuthCookie(res) {
  res.setHeader('Set-Cookie', `oauth_state=; ${oauthCookieOptions()}; Max-Age=0`);
}

function readCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const value = cookies.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : '';
}

function frontendOAuthUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173/';
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OAuth provider returned HTTP ${response.status}`);
  }
  return body;
}

exports.startOAuth = async (req, res) => {
  const provider = req.params.provider;
  const config = oauthProviders[provider];
  if (!config) {
    return res.status(404).json({ success: false, message: 'Unsupported sign-in provider' });
  }

  const { clientId, clientSecret, callbackUrl } = config;
  if (!process.env[clientId] || !process.env[clientSecret] || !process.env[callbackUrl]) {
    const redirectUrl = new URL(frontendOAuthUrl());
    redirectUrl.searchParams.set('oauth_error', 'provider_not_configured');
    return res.redirect(302, redirectUrl.toString());
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    const redirectUrl = new URL(frontendOAuthUrl());
    redirectUrl.searchParams.set('oauth_error', 'authentication_not_configured');
    return res.redirect(302, redirectUrl.toString());
  }
  if (provider === 'facebook' && !/^v\d+\.0$/.test(FACEBOOK_GRAPH_API_VERSION)) {
    console.error('FACEBOOK_GRAPH_API_VERSION must use the vNN.0 format');
    const redirectUrl = new URL(frontendOAuthUrl());
    redirectUrl.searchParams.set('oauth_error', 'provider_not_configured');
    return res.redirect(302, redirectUrl.toString());
  }

  const intent = req.query.intent === 'provider' ? 'provider' : 'client';
  const state = randomBytes(32).toString('hex');
  const authorizationUrl = provider === 'google'
    ? new URL('https://accounts.google.com/o/oauth2/v2/auth')
    : new URL(`https://www.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/dialog/oauth`);
  authorizationUrl.search = new URLSearchParams({
    client_id: process.env[clientId],
    redirect_uri: process.env[callbackUrl],
    response_type: 'code',
    scope: provider === 'google' ? 'openid email profile' : 'email public_profile',
    state
  }).toString();

  try {
    await OAuthTransaction.create({
      stateHash: sha256(state),
      provider,
      intent,
      expiresAt: new Date(Date.now() + OAUTH_STATE_LIFETIME_MS)
    });
    res.setHeader('Set-Cookie', `oauth_state=${encodeURIComponent(state)}; ${oauthCookieOptions()}`);
    return res.redirect(302, authorizationUrl.toString());
  } catch (error) {
    console.error('Could not start OAuth sign-in:', error);
    return res.status(500).json({ success: false, message: 'Could not start social sign-in' });
  }
};

exports.completeOAuth = (provider) => async (req, res) => {
  const config = oauthProviders[provider];
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const cookieState = readCookie(req, 'oauth_state');
  clearOAuthCookie(res);

  try {
    if (!state || !code || !cookieState || state !== cookieState) {
      return res.status(400).send('Social sign-in could not be verified. Please try again.');
    }
    const transaction = await OAuthTransaction.findOneAndDelete({
      stateHash: sha256(state),
      provider,
      expiresAt: { $gt: new Date() }
    });
    if (!transaction) {
      return res.status(400).send('Social sign-in expired. Please try again.');
    }

    const tokenEndpoint = provider === 'google'
      ? new URL('https://oauth2.googleapis.com/token')
      : new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/oauth/access_token`);
    const tokenParameters = {
      client_id: process.env[config.clientId],
      client_secret: process.env[config.clientSecret],
      redirect_uri: process.env[config.callbackUrl],
      code
    };
    if (provider === 'google') tokenParameters.grant_type = 'authorization_code';
    const tokenResponse = await fetchJson(
      provider === 'google'
        ? tokenEndpoint.toString()
        : `${tokenEndpoint}?${new URLSearchParams(tokenParameters)}`,
      provider === 'google'
        ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenParameters)
      }
        : undefined
    );
    if (typeof tokenResponse.access_token !== 'string') {
      throw new Error('OAuth provider did not return an access token');
    }

    const profile = provider === 'google'
      ? await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      })
      : await fetchJson(`https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/me?`
        + new URLSearchParams({ fields: 'id,name,email', access_token: tokenResponse.access_token }));
    const providerId = typeof profile.sub === 'string' ? profile.sub : profile.id;
    const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
    const emailVerified = provider === 'google' ? profile.email_verified === true : Boolean(email);
    if (typeof providerId !== 'string' || !email || !emailVerified) {
      return res.status(400).send('The social account did not provide a verified email address.');
    }

    const providerField = provider === 'google' ? 'googleId' : 'facebookId';
    let user = await User.findOne({ [providerField]: providerId });
    if (!user && provider === 'google') {
      user = await User.findOne({ email }).select('+googleId');
      if (user && user.googleId && user.googleId !== providerId) {
        return res.status(409).send('This email is linked to another Google account.');
      }
    }
    if (!user && provider === 'facebook') {
      user = await User.findOne({ email });
      if (user) {
        return res.status(409).send('Sign in with your existing method before linking Facebook.');
      }
    }
    if (!user) {
      user = new User({ email, name: typeof profile.name === 'string' ? profile.name.trim() : '' });
    }
    user[providerField] = providerId;
    if (!user.email) user.email = email;
    await user.save();

    const ticket = randomBytes(32).toString('hex');
    await OAuthTransaction.create({
      ticketHash: sha256(ticket),
      provider,
      intent: transaction.intent,
      user: user._id,
      expiresAt: new Date(Date.now() + OAUTH_TICKET_LIFETIME_MS)
    });
    const redirectUrl = new URL(frontendOAuthUrl());
    redirectUrl.searchParams.set('oauth_ticket', ticket);
    return res.redirect(302, redirectUrl.toString());
  } catch (error) {
    console.error(`${provider} sign-in failed:`, error.message);
    return res.redirect(302, `${frontendOAuthUrl()}?oauth_error=sign_in_failed`);
  }
};

exports.exchangeOAuthTicket = async (req, res) => {
  const ticket = typeof req.body?.ticket === 'string' ? req.body.ticket : '';
  if (!/^[a-f0-9]{64}$/.test(ticket)) {
    return res.status(400).json({ success: false, message: 'Invalid or expired social sign-in' });
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(503).json({ success: false, message: 'Authentication is not configured' });
  }

  try {
    const transaction = await OAuthTransaction.findOneAndDelete({
      ticketHash: sha256(ticket),
      expiresAt: { $gt: new Date() }
    });
    if (!transaction) {
      return res.status(400).json({ success: false, message: 'Invalid or expired social sign-in' });
    }
    const user = await User.findById(transaction.user);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Social account is no longer available' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    return res.status(200).json({
      success: true,
      token,
      intent: transaction.intent,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Social sign-in ticket exchange failed:', error);
    return res.status(500).json({ success: false, message: 'Could not complete social sign-in' });
  }
};

function otpHash(phoneNumber, otp) {
  return createHmac('sha256', process.env.JWT_SECRET)
    .update(`${phoneNumber}:${otp}`)
    .digest('hex');
}

function isDevelopmentOtp() {
  return process.env.NODE_ENV !== 'production' && process.env.OTP_MODE === 'development';
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return false;
  const [algorithm, saltHex, hashHex] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(saltHex || '')
      || !/^[a-f0-9]{128}$/.test(hashHex || '')) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

function issueSession(user) {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role
    }
  };
}

async function consumeOtp(phoneNumber, otp) {
  if (isDevelopmentOtp()) return otp === '1234';

  const challenge = await OTPChallenge.findOne({ phoneNumber });
  if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= OTP_MAX_ATTEMPTS) {
    return false;
  }

  const expectedHash = Buffer.from(challenge.codeHash, 'hex');
  const suppliedHash = Buffer.from(otpHash(phoneNumber, otp), 'hex');
  const valid = expectedHash.length === suppliedHash.length
    && timingSafeEqual(expectedHash, suppliedHash);
  if (!valid) {
    await OTPChallenge.updateOne(
      { _id: challenge._id, attempts: { $lt: OTP_MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } }
    );
    return false;
  }

  const consumed = await OTPChallenge.findOneAndDelete({
    _id: challenge._id,
    codeHash: challenge.codeHash,
    attempts: { $lt: OTP_MAX_ATTEMPTS },
    expiresAt: { $gt: new Date() }
  });
  return Boolean(consumed);
}

exports.loginWithPassword = async (req, res) => {
  const identifier = typeof req.body?.identifier === 'string'
    ? req.body.identifier.trim().toLowerCase()
    : typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!identifier || identifier.length > 254 || password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'A valid phone number or email and password are required' });
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(503).json({ success: false, message: 'Authentication is not configured' });
  }

  try {
    const accountQuery = identifier.includes('@')
      ? { email: identifier }
      : { phoneNumber: identifier };
    const user = await User.findOne(accountQuery).select('+passwordHash');
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Email/phone number or password is incorrect' });
    }
    const session = issueSession(user);
    return res.status(200).json({ success: true, ...session });
  } catch (error) {
    console.error('Password sign-in failed:', error);
    return res.status(500).json({ success: false, message: 'Could not sign in' });
  }
};

exports.updateProfile = async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!name || name.length > 120
      || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      || email.length > 254
      || (password && (password.length < 8 || password.length > 128))) {
    return res.status(400).json({ success: false, message: 'Enter a valid name, email, and optional password of at least 8 characters' });
  }
  try {
    const update = { name };
    if (email) update.email = email;
    if (password) update.passwordHash = await hashPassword(password);
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Profile update failed:', error);
    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.code === 11000 ? 'This email is already used by another account' : 'Could not update the account'
    });
  }
};

exports.registerMerchant = async (req, res) => {
  const { fullName, storeName, materialType, businessAddress, sampleItem, samplePrice, latitude, longitude } = req.body || {};
  if (typeof fullName !== 'string' || !fullName.trim()
      || typeof storeName !== 'string' || !storeName.trim()
      || typeof materialType !== 'string' || !materialType.trim()
      || typeof businessAddress !== 'string' || !businessAddress.trim()
      || (sampleItem !== undefined && typeof sampleItem !== 'string')
      || (samplePrice !== undefined && (!Number.isFinite(samplePrice) || samplePrice < 0))
      || ((latitude === undefined) !== (longitude === undefined))
      || (latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
        || !Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
    return res.status(400).json({ success: false, message: 'Valid merchant and business information is required' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          name: fullName.trim(),
          role: 'merchant',
          merchantInfo: {
            storeName: storeName.trim(),
            materialType: materialType.trim(),
            businessAddress: businessAddress.trim(),
            sampleItem: sampleItem?.trim(),
            samplePrice,
            latitude,
            longitude
          }
        }
      },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        merchantInfo: user.merchantInfo
      }
    });
  } catch (error) {
    console.error('Merchant registration failed:', error);
    return res.status(500).json({ success: false, message: 'Could not register the merchant account' });
  }
};

exports.resetPassword = async (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber.trim() : '';
  const otp = typeof req.body?.otp === 'string' ? req.body.otp : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!phoneNumber || phoneNumber.length > 32 || !/^\d{4,6}$/.test(otp)
      || password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Enter a valid phone number, code, and password of at least 8 characters' });
  }

  try {
    const validOtp = await consumeOtp(phoneNumber, otp);
    if (!validOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }
    const passwordHash = await hashPassword(password);
    const user = await User.findOneAndUpdate(
      { phoneNumber },
      { $set: { passwordHash } },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account is registered with this phone number' });
    }
    return res.status(200).json({ success: true, message: 'Password updated. You can now sign in with your phone and password.' });
  } catch (error) {
    console.error('Password reset failed:', error);
    return res.status(500).json({ success: false, message: 'Could not reset password' });
  }
};

async function sendTwilioOtp(phoneNumber, otp) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return false;
  }
  if (typeof fetch !== 'function') {
    console.error('OTP delivery requires a Node.js runtime with fetch support');
    return false;
  }

  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const body = new URLSearchParams({
    To: phoneNumber,
    From: TWILIO_FROM_NUMBER,
    Body: `Your Khedmaty verification code is ${otp}. It expires in 5 minutes.`
  });

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(TWILIO_ACCOUNT_SID)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body,
        signal: AbortSignal.timeout(10000)
      }
    );
    if (!response.ok) {
      console.error(`OTP provider returned HTTP ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('OTP provider request failed:', error.message);
    return false;
  }
}

exports.sendOTP = async (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber.trim() : '';
  if (!phoneNumber || phoneNumber.length > 32) {
    return res.status(400).json({ success: false, message: 'A valid phone number is required' });
  }

  if (isDevelopmentOtp()) {
    return res.status(200).json({ success: true, message: 'Development OTP is 1234' });
  }

  if (process.env.OTP_MODE !== 'twilio' || !/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    return res.status(503).json({ success: false, message: 'OTP delivery is not configured for this phone number' });
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(503).json({ success: false, message: 'Authentication is not configured' });
  }

  try {
    const now = new Date();
    const currentChallenge = await OTPChallenge.findOne({ phoneNumber }).select('sentAt expiresAt');
    if (currentChallenge && currentChallenge.expiresAt > now
        && now.getTime() - currentChallenge.sentAt.getTime() < OTP_RESEND_DELAY_MS) {
      return res.status(429).json({ success: false, message: 'Please wait before requesting another code' });
    }

    const otp = String(randomInt(100000, 1000000));
    const codeHash = otpHash(phoneNumber, otp);
    await OTPChallenge.findOneAndUpdate(
      { phoneNumber },
      {
        codeHash,
        sentAt: now,
        expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
        attempts: 0
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const delivered = await sendTwilioOtp(phoneNumber, otp);
    if (!delivered) {
      await OTPChallenge.deleteOne({ phoneNumber, codeHash });
      return res.status(503).json({ success: false, message: 'Could not send the verification code' });
    }

    return res.status(200).json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('OTP delivery failed:', error);
    return res.status(500).json({ success: false, message: 'Could not send the verification code' });
  }
};

exports.verifyOTP = async (req, res) => {
  const phoneNumber = typeof req.body?.phoneNumber === 'string' ? req.body.phoneNumber.trim() : '';
  const otp = typeof req.body?.otp === 'string' ? req.body.otp : '';

  if (!phoneNumber || phoneNumber.length > 32 || !/^\d{4,6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: 'A valid phone number and verification code are required' });
  }

  if (!isDevelopmentOtp() && process.env.OTP_MODE !== 'twilio') {
    return res.status(503).json({ success: false, message: 'OTP verification is not configured' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(503).json({ success: false, message: 'Authentication is not configured' });
  }

  try {
    const validOtp = await consumeOtp(phoneNumber, otp);
    if (!validOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    let user = await User.findOne({ phoneNumber: phoneNumber.trim() });
    if (!user) {
      user = await User.create({ phoneNumber: phoneNumber.trim() });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });
  } catch (error) {
    console.error('OTP verification failed:', error);
    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.code === 11000 ? 'A user with this phone number already exists' : 'OTP verification failed'
    });
  }
};

exports.registerProvider = async (req, res) => {
  const { categories, bio, fullName, city } = req.body;

  if (typeof fullName !== 'string' || !fullName.trim()
      || typeof city !== 'string' || !city.trim()
      || !Array.isArray(categories) || categories.length === 0
      || categories.some((category) => typeof category !== 'string' || !category.trim())
      || (bio !== undefined && typeof bio !== 'string')) {
    return res.status(400).json({ success: false, message: 'Valid fullName, city, and categories are required' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        name: fullName.trim(),
        city: city.trim(),
        role: 'provider',
        'providerInfo.categories': categories.map((category) => category.trim()),
        'providerInfo.bio': bio?.trim(),
        'providerInfo.verificationStatus': 'pending'
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        city: user.city,
        providerInfo: user.providerInfo
      }
    });
  } catch (error) {
    console.error('Provider registration failed:', error);
    res.status(error.name === 'ValidationError' ? 400 : 500).json({
      success: false,
      message: error.name === 'ValidationError' ? 'Invalid provider information' : 'Provider registration failed'
    });
  }
};
