const assert = require('node:assert/strict');
const path = require('node:path');
const { after, test } = require('node:test');

const root = path.resolve(__dirname, '..');
const otpModelPath = require.resolve(path.join(root, 'models', 'OTPChallenge.js'));
const oauthModelPath = require.resolve(path.join(root, 'models', 'OAuthTransaction.js'));
const userModelPath = require.resolve(path.join(root, 'models', 'User.js'));
const challenges = new Map();
let user = null;
const envKeys = [
  'NODE_ENV',
  'OTP_MODE',
  'JWT_SECRET',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER'
];
const envBefore = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const fetchBefore = global.fetch;

const otpModel = {
  findOne(query) {
    const value = challenges.get(query.phoneNumber) || null;
    return {
      select: async () => value,
      then: (resolve, reject) => Promise.resolve(value).then(resolve, reject)
    };
  },
  async findOneAndUpdate(query, update) {
    const challenge = { _id: 'otp-test', phoneNumber: query.phoneNumber, ...update };
    challenges.set(query.phoneNumber, challenge);
    return challenge;
  },
  async deleteOne(query) {
    const challenge = challenges.get(query.phoneNumber);
    if (challenge && (!query.codeHash || challenge.codeHash === query.codeHash)) {
      challenges.delete(query.phoneNumber);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  },
  async updateOne(query, update) {
    const challenge = [...challenges.values()].find((item) => item._id === query._id);
    if (challenge && challenge.attempts < query.attempts.$lt) {
      challenge.attempts += update.$inc.attempts;
    }
  },
  async findOneAndDelete(query) {
    const challenge = [...challenges.values()].find((item) => item._id === query._id);
    if (!challenge || challenge.codeHash !== query.codeHash
        || challenge.attempts >= query.attempts.$lt
        || challenge.expiresAt <= query.expiresAt.$gt) {
      return null;
    }
    challenges.delete(challenge.phoneNumber);
    return challenge;
  }
};

class MockUser {
  constructor(values) {
    Object.assign(this, values);
    this._id = 'user-test';
    this.role ||= 'client';
  }

  async save() {
    user = this;
    return this;
  }

  static findOne(query) {
    const match = user && Object.entries(query).every(([key, value]) => user[key] === value)
      ? user
      : null;
    return {
      select: async () => match,
      then: (resolve, reject) => Promise.resolve(match).then(resolve, reject)
    };
  }

  static async create(values) {
    user = new MockUser(values);
    return user;
  }

  static async findOneAndUpdate(query, update) {
    if (!user || user.phoneNumber !== query.phoneNumber) return null;
    Object.assign(user, update.$set);
    return user;
  }
}

require.cache[otpModelPath] = {
  id: otpModelPath, filename: otpModelPath, loaded: true, exports: otpModel
};
require.cache[oauthModelPath] = {
  id: oauthModelPath,
  filename: oauthModelPath,
  loaded: true,
  exports: { create: async (value) => value, findOneAndDelete: async () => null }
};
require.cache[userModelPath] = {
  id: userModelPath, filename: userModelPath, loaded: true, exports: MockUser
};

const { sendOTP, verifyOTP, resetPassword, loginWithPassword } = require(
  path.join(root, 'controllers', 'authController.js')
);

function mockResponse() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

after(() => {
  for (const key of envKeys) {
    if (envBefore[key] === undefined) delete process.env[key];
    else process.env[key] = envBefore[key];
  }
  if (fetchBefore) global.fetch = fetchBefore;
  else delete global.fetch;
});

test('Twilio OTP is delivered, verified once, and rejected on replay', async () => {
  Object.assign(process.env, {
    NODE_ENV: 'production',
    OTP_MODE: 'twilio',
    JWT_SECRET: 'unit-test-jwt-secret',
    TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
    TWILIO_AUTH_TOKEN: 'unit-test-token',
    TWILIO_FROM_NUMBER: '+15550000000'
  });

  let smsBody;
  global.fetch = async (_url, options) => {
    smsBody = new URLSearchParams(options.body).get('Body');
    return { ok: true, status: 201 };
  };

  const phoneNumber = '+962790000000';
  const sent = mockResponse();
  await sendOTP({ body: { phoneNumber } }, sent);
  assert.equal(sent.statusCode, 200);
  const otp = smsBody.match(/\b\d{6}\b/)?.[0];
  assert.ok(otp);

  const verified = mockResponse();
  await verifyOTP({ body: { phoneNumber, otp } }, verified);
  assert.equal(verified.statusCode, 200);
  assert.ok(verified.body.token);

  const replay = mockResponse();
  await verifyOTP({ body: { phoneNumber, otp } }, replay);
  assert.equal(replay.statusCode, 400);

  process.env.TWILIO_AUTH_TOKEN = '';
  const unconfigured = mockResponse();
  await sendOTP({ body: { phoneNumber: '+962790000001' } }, unconfigured);
  assert.equal(unconfigured.statusCode, 503);
  assert.match(unconfigured.body.message, /Twilio/);
  assert.equal(challenges.has('+962790000001'), false);
});

test('password reset requires OTP and allows subsequent password sign-in', async () => {
  process.env.NODE_ENV = 'development';
  process.env.OTP_MODE = 'development';
  process.env.JWT_SECRET = 'unit-test-jwt-secret';

  const phoneNumber = '+962790000000';
  const invalidReset = mockResponse();
  await resetPassword({
    body: { phoneNumber, otp: '0000', password: 'ValidPassword123' }
  }, invalidReset);
  assert.equal(invalidReset.statusCode, 400);

  const reset = mockResponse();
  await resetPassword({
    body: { phoneNumber, otp: '1234', password: 'ValidPassword123' }
  }, reset);
  assert.equal(reset.statusCode, 200);
  assert.match(user.passwordHash, /^scrypt\$/);

  const invalidLogin = mockResponse();
  await loginWithPassword({
    body: { identifier: phoneNumber, password: 'WrongPassword123' }
  }, invalidLogin);
  assert.equal(invalidLogin.statusCode, 401);

  const login = mockResponse();
  await loginWithPassword({
    body: { identifier: phoneNumber, password: 'ValidPassword123' }
  }, login);
  assert.equal(login.statusCode, 200);
  assert.ok(login.body.token);
});
