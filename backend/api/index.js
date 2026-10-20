// app.ts
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// db/index.ts
import dns from "node:dns";
import { neon, types } from "@neondatabase/serverless";
var dnsCache = /* @__PURE__ */ new Map();
if (typeof dns.lookup === "function" && dns.promises?.Resolver) {
  const publicResolver = new dns.promises.Resolver();
  publicResolver.setServers(["8.8.8.8", "1.1.1.1"]);
  const originalLookup = dns.lookup;
  dns.lookup = function(hostname, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    if (hostname && (hostname.includes("neon.tech") || hostname.includes("neon."))) {
      const cachedIps = dnsCache.get(hostname);
      if (cachedIps && cachedIps.length > 0) {
        if (options && options.all) {
          return callback(null, cachedIps.map((ip) => ({ address: ip, family: 4 })));
        }
        return callback(null, cachedIps[0], 4);
      }
      publicResolver.resolve4(hostname).then((ips) => {
        if (ips && ips.length > 0) {
          dnsCache.set(hostname, ips);
          if (options && options.all) {
            callback(null, ips.map((ip) => ({ address: ip, family: 4 })));
          } else {
            callback(null, ips[0], 4);
          }
        } else {
          originalLookup(hostname, options, callback);
        }
      }).catch(() => {
        originalLookup(hostname, options, callback);
      });
      return;
    }
    return originalLookup(hostname, options, callback);
  };
  try {
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      if (url.hostname && url.hostname.includes("neon.tech")) {
        publicResolver.resolve4(url.hostname).then((ips) => {
          if (ips && ips.length) dnsCache.set(url.hostname, ips);
        }).catch(() => {
        });
      }
    }
    publicResolver.resolve4("api.c-4.ap-southeast-1.aws.neon.tech").then((ips) => {
      if (ips && ips.length) dnsCache.set("api.c-4.ap-southeast-1.aws.neon.tech", ips);
    }).catch(() => {
    });
  } catch {
  }
}
if (types && typeof types.setTypeParser === "function") {
  types.setTypeParser(1082, (val) => val);
  types.setTypeParser(20, (val) => val === null ? null : parseInt(val, 10));
  types.setTypeParser(1700, (val) => val === null ? null : parseFloat(val));
}
var sqlInstance = null;
function getSql() {
  if (!sqlInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  return sqlInstance;
}
var sql = new Proxy(function() {
}, {
  apply(target, thisArg, argumentsList) {
    const client = getSql();
    return Reflect.apply(client, thisArg, argumentsList);
  },
  get(target, prop) {
    const client = getSql();
    return client[prop];
  }
});
var db_default = sql;

// utils/jwt.ts
import jwt from "jsonwebtoken";
var isProd = process.env.NODE_ENV === "production";
var rawSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (isProd && !rawSecret) {
  throw new Error("FATAL SECURITY CONFIGURATION: JWT_SECRET or SESSION_SECRET environment variable is required in production.");
}
var JWT_SECRET = rawSecret || "flatmate_expense_jwt_dev_secret_only";
var AUTH_COOKIE_NAME = "auth_token";
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function signBiometricDeviceToken(payload) {
  return jwt.sign({ ...payload, type: "biometric_device" }, JWT_SECRET, { expiresIn: "90d" });
}
function verifyBiometricDeviceToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.type === "biometric_device") return decoded;
    return null;
  } catch {
    return null;
  }
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = req.cookies;
  if (cookies && cookies[AUTH_COOKIE_NAME]) {
    return cookies[AUTH_COOKIE_NAME];
  }
  const rawCookie = req.headers.cookie;
  if (rawCookie) {
    const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`));
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
}
function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1e3,
    // 7 days
    path: "/"
  });
}
function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/"
  });
}

// middleware/auth.ts
function populateSession(req, payload) {
  const safeSession = req.session || {};
  if (payload) {
    Object.assign(safeSession, payload);
    req.user = payload;
  }
  if (typeof safeSession.destroy !== "function") {
    safeSession.destroy = (cb) => {
      if (typeof cb === "function") cb();
    };
  }
  if (typeof safeSession.save !== "function") {
    safeSession.save = (cb) => {
      if (typeof cb === "function") cb();
    };
  }
  if (typeof safeSession.touch !== "function") {
    safeSession.touch = () => {
    };
  }
  if (typeof safeSession.reload !== "function") {
    safeSession.reload = (cb) => {
      if (typeof cb === "function") cb();
    };
  }
  if (typeof safeSession.regenerate !== "function") {
    safeSession.regenerate = (cb) => {
      if (typeof cb === "function") cb();
    };
  }
  req.session = safeSession;
  return safeSession;
}
function authContextMiddleware(req, _res, next) {
  let session = req.session;
  if (session && session.userId) {
    populateSession(req);
    return next();
  }
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      populateSession(req, payload);
      return next();
    }
  }
  populateSession(req, null);
  next();
}
async function requireAuth(req, res, next) {
  let session = req.session;
  if (!session || !session.userId) {
    const token = extractToken(req);
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        session = populateSession(req, payload);
      }
    }
  }
  if (!session || !session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (session.mustChangePassword) {
    const isAllowedAuthPath = (req.baseUrl === "/api/auth" || req.baseUrl === "/auth") && ["/change-password", "/logout", "/session", "/me"].includes(req.path);
    if (!isAllowedAuthPath && req.method !== "GET") {
      return res.status(403).json({
        error: "Password change required before performing actions",
        mustChangePassword: true
      });
    }
  }
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    try {
      const rows = await db_default`
        SELECT u.is_active, hm.is_active AS member_active
        FROM   users u
        JOIN   household_members hm ON hm.user_id = u.id AND hm.household_id = ${session.householdId}
        WHERE  u.id = ${session.userId}`;
      if (!rows.length || !rows[0].is_active || !rows[0].member_active) {
        if (typeof session.destroy === "function") {
          session.destroy(() => {
          });
        }
        return res.status(403).json({ error: "Account has been deactivated" });
      }
    } catch (err) {
      console.error("[auth guard check error]:", err);
      return res.status(500).json({ error: "Database error validating session activity status" });
    }
  }
  next();
}
async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    const session = req.session;
    if (session?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}

// routes/auth.ts
import { Router } from "express";

// utils/password.ts
import bcrypt from "bcryptjs";
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
async function verifyPassword(hash, password) {
  if (!hash || !password) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// middleware/rateLimiter.ts
import { RateLimiterMemory } from "rate-limiter-flexible";
var loginLimiter = new RateLimiterMemory({ points: 10, duration: 60 });
var passwordLimiter = new RateLimiterMemory({ points: 10, duration: 900 });
var claimLimiter = new RateLimiterMemory({ points: 30, duration: 60 });
var upiLimiter = new RateLimiterMemory({ points: 30, duration: 60 });
var aiLimiter = new RateLimiterMemory({ points: 15, duration: 60 });
async function rateLimitLogin(req, res, next) {
  try {
    await loginLimiter.consume(req.ip || "unknown");
    next();
  } catch {
    res.status(429).json({ error: "Too many login attempts. Please wait a minute and try again." });
  }
}
async function rateLimitPassword(req, res, next) {
  const session = req.session;
  const key = session?.userId || req.ip || "unknown";
  try {
    await passwordLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: "Too many password change attempts. Please wait 15 minutes before trying again." });
  }
}
async function rateLimitClaim(req, res, next) {
  const session = req.session;
  const key = session?.userId || req.ip || "unknown";
  try {
    await claimLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: "Too many payment claims. Try again later." });
  }
}
async function rateLimitUpi(req, res, next) {
  const session = req.session;
  const key = session?.userId || req.ip || "unknown";
  try {
    await upiLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: "Too many UPI profile updates. Try again later." });
  }
}
async function rateLimitAI(req, res, next) {
  const session = req.session;
  const key = session?.userId || req.ip || "unknown";
  try {
    await aiLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: "Too many AI requests. Please slow down and try again in a moment." });
  }
}

// routes/auth.ts
var router = Router();
router.post("/login", rateLimitLogin, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  try {
    const rows = await db_default`
      SELECT u.id, u.full_name, u.username, u.password_hash, u.is_active,
             u.must_change_password, hm.role, hm.household_id
      FROM   users u
      LEFT   JOIN household_members hm ON hm.user_id = u.id
      WHERE  u.username = ${username.toLowerCase().trim()}`;
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const valid = await verifyPassword(user.password_hash, password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    let householdId = user.household_id;
    if (!householdId) {
      const defaultHh = await db_default`SELECT id FROM households LIMIT 1`;
      householdId = defaultHh[0]?.id || "c281ffa5-0c9b-4bff-9863-9b5bcee7f22c";
    }
    const sessionPayload = {
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role || "member",
      householdId,
      mustChangePassword: Boolean(user.must_change_password)
    };
    const token = signToken(sessionPayload);
    setAuthCookie(res, token);
    const userPayload = {
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      role: user.role || "member",
      householdId,
      mustChangePassword: Boolean(user.must_change_password)
    };
    const session = req.session;
    if (session) {
      Object.assign(session, sessionPayload);
      if (typeof session.save === "function") {
        session.save(() => {
        });
      }
    }
    return res.json({
      success: true,
      token,
      user: userPayload,
      ...userPayload
    });
  } catch (err) {
    console.error("[auth/login error]:", err?.message || err);
    res.status(500).json({
      error: process.env.NODE_ENV === "production" ? "Authentication service temporarily unavailable" : `Database/Server Error: ${err?.message || "Unknown error"}`
    });
  }
});
router.post("/biometric-enroll", requireAuth, async (req, res) => {
  const session = req.session;
  const { credentialId } = req.body;
  try {
    const deviceToken = signBiometricDeviceToken({
      userId: session.userId,
      username: session.username,
      householdId: session.householdId,
      credentialId: credentialId ? String(credentialId) : void 0
    });
    res.json({
      success: true,
      deviceToken,
      message: "Biometric device token issued successfully"
    });
  } catch (err) {
    console.error("[auth/biometric-enroll error]:", err?.message || err);
    res.status(500).json({ error: "Failed to issue biometric device token" });
  }
});
router.post("/biometric-login", rateLimitLogin, async (req, res) => {
  const { username, credentialId, deviceToken } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required for biometric authentication" });
  }
  if (!deviceToken) {
    return res.status(401).json({
      error: "Device not enrolled for biometric unlock. Please sign in with your password first."
    });
  }
  const devicePayload = verifyBiometricDeviceToken(deviceToken);
  if (!devicePayload) {
    return res.status(401).json({
      error: "Biometric authorization token is invalid or expired. Please sign in with your password."
    });
  }
  try {
    const rows = await db_default`
      SELECT u.id, u.full_name, u.username, u.is_active,
             u.must_change_password, hm.role, hm.household_id
      FROM   users u
      LEFT   JOIN household_members hm ON hm.user_id = u.id
      WHERE  u.username = ${username.toLowerCase().trim()}`;
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "User account not found or disabled" });
    }
    if (devicePayload.userId !== user.id || devicePayload.username.toLowerCase() !== user.username.toLowerCase()) {
      return res.status(401).json({
        error: "Biometric device token does not match the requested username"
      });
    }
    let householdId = user.household_id;
    if (!householdId) {
      const defaultHh = await db_default`SELECT id FROM households LIMIT 1`;
      householdId = defaultHh[0]?.id || "c281ffa5-0c9b-4bff-9863-9b5bcee7f22c";
    }
    const sessionPayload = {
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role || "member",
      householdId,
      mustChangePassword: Boolean(user.must_change_password)
    };
    const token = signToken(sessionPayload);
    setAuthCookie(res, token);
    const userPayload = {
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      role: user.role || "member",
      householdId,
      mustChangePassword: Boolean(user.must_change_password)
    };
    const session = req.session;
    if (session) {
      Object.assign(session, sessionPayload);
      if (typeof session.save === "function") {
        session.save(() => {
        });
      }
    }
    return res.json({
      success: true,
      token,
      user: userPayload,
      ...userPayload
    });
  } catch (err) {
    console.error("[auth/biometric-login error]:", err?.message || err);
    res.status(500).json({ error: "Failed to process biometric login" });
  }
});
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.clearCookie("connect.sid");
  res.clearCookie("auth_token");
  const session = req.session;
  if (session && typeof session.destroy === "function") {
    session.destroy(() => {
    });
  }
  res.json({ ok: true, success: true });
});
router.get(["/session", "/me"], (req, res) => {
  let session = req.session;
  let token = extractToken(req);
  if ((!session || !session.userId) && token) {
    const payload = verifyToken(token);
    if (payload) {
      session = payload;
      req.session = {
        ...payload,
        destroy: (cb) => cb && cb(),
        save: (cb) => cb && cb()
      };
    }
  }
  if (!session?.userId) {
    return res.json({ authenticated: false });
  }
  const user = {
    id: session.userId,
    fullName: session.fullName,
    username: session.username,
    role: session.role,
    householdId: session.householdId,
    mustChangePassword: Boolean(session.mustChangePassword)
    // AUD-03
  };
  res.json({
    authenticated: true,
    token: token || void 0,
    user,
    ...user
  });
});
router.post("/change-password", requireAuth, rateLimitPassword, async (req, res) => {
  const session = req.session;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }
  try {
    const rows = await db_default`SELECT password_hash FROM users WHERE id = ${session.userId}`;
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    const valid = await verifyPassword(rows[0].password_hash, currentPassword);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
    const hash = await hashPassword(newPassword);
    await db_default`
      UPDATE users
      SET    password_hash = ${hash}, must_change_password = FALSE, updated_at = NOW()
      WHERE  id = ${session.userId}`;
    session.mustChangePassword = false;
    const updatedPayload = {
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      role: session.role,
      householdId: session.householdId,
      mustChangePassword: false
    };
    const newToken = signToken(updatedPayload);
    setAuthCookie(res, newToken);
    if (typeof session.save === "function") {
      session.save(() => {
      });
    }
    res.json({ ok: true, success: true, token: newToken });
  } catch (err) {
    console.error("[auth/change-password]", err);
    res.status(500).json({ error: "Server error" });
  }
});
var auth_default = router;

// routes/members.ts
import { Router as Router2 } from "express";
var router2 = Router2();
var membersCache = {};
var CACHE_TTL_MS = 2 * 60 * 1e3;
router2.get("/", requireAuth, async (req, res) => {
  const session = req.session;
  const hid = session.householdId;
  const now = Date.now();
  const cached = membersCache[hid];
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.json(cached.data);
  }
  try {
    const rows = await db_default`
      SELECT u.id, u.full_name, u.username, hm.role, u.is_active
      FROM   users u
      JOIN   household_members hm ON hm.user_id = u.id
      WHERE  hm.household_id = ${hid}
        AND  hm.is_active = TRUE
      ORDER  BY u.full_name`;
    membersCache[hid] = { data: rows, timestamp: now };
    res.setHeader("Cache-Control", "private, max-age=60");
    res.json(rows);
  } catch (err) {
    console.error("[members]", err);
    res.status(500).json({ error: "Server error" });
  }
});
var members_default = router2;

// routes/categories.ts
import { Router as Router3 } from "express";
import { randomUUID as uuidv4 } from "crypto";
var router3 = Router3();
var categoriesCache = null;
var CACHE_TTL_MS2 = 5 * 60 * 1e3;
function invalidateCategoriesCache() {
  categoriesCache = null;
}
router3.get("/", requireAuth, async (req, res) => {
  const now = Date.now();
  if (categoriesCache && now - categoriesCache.timestamp < CACHE_TTL_MS2) {
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.json(categoriesCache.data);
  }
  try {
    const rows = await db_default`
      SELECT id, name, expense_type
      FROM   categories
      WHERE  is_active = TRUE
      ORDER  BY name`;
    categoriesCache = { data: rows, timestamp: now };
    res.setHeader("Cache-Control", "private, max-age=60");
    res.json(rows);
  } catch (err) {
    console.error("[categories GET /]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router3.post("/", requireAuth, async (req, res) => {
  const { name, expense_type } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Category name is required" });
  }
  const trimmed = name.trim().slice(0, 100);
  try {
    const existing = await db_default`
      SELECT id, name, expense_type
      FROM   categories
      WHERE  LOWER(name) = LOWER(${trimmed})
      LIMIT  1`;
    if (existing.length) {
      return res.json(existing[0]);
    }
    const id = uuidv4();
    await db_default`
      INSERT INTO categories (id, name, expense_type, is_active)
      VALUES (${id}, ${trimmed}, ${expense_type || null}, TRUE)`;
    invalidateCategoriesCache();
    res.status(201).json({ id, name: trimmed, expense_type: expense_type || null });
  } catch (err) {
    console.error("[categories POST /]", err);
    res.status(500).json({ error: "Server error" });
  }
});
var categories_default = router3;

// routes/expenses.ts
import { Router as Router6 } from "express";
import { randomUUID as uuidv43 } from "crypto";

// utils/audit.ts
import { randomUUID as uuidv42 } from "crypto";
async function audit(actorId, householdId, entityType, entityId, action, before = null, after = null) {
  try {
    await db_default`
      INSERT INTO activity_logs
        (id, actor_user_id, household_id, entity_type, entity_id, action, before_state, after_state, created_at)
      VALUES
        (${uuidv42()}, ${actorId}, ${householdId}, ${entityType}, ${entityId}, ${action},
         ${JSON.stringify(before ?? null)}, ${JSON.stringify(after ?? null)}, NOW())`;
  } catch (err) {
    console.error("[audit] Failed to write log:", err.message);
  }
}

// routes/balances.ts
import { Router as Router5 } from "express";

// routes/analytics.ts
import { Router as Router4 } from "express";
var router4 = Router4();
var DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
var analyticsCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS3 = 15 * 1e3;
function invalidateAnalyticsCache(householdId) {
  if (householdId) {
    for (const key of analyticsCache.keys()) {
      if (key.startsWith(`${householdId}:`)) {
        analyticsCache.delete(key);
      }
    }
  } else {
    analyticsCache.clear();
  }
}
router4.get("/", requireAuth, async (req, res) => {
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const { from, to, type, category } = req.query;
  const validFrom = from && DATE_REGEX.test(String(from)) ? String(from) : "1970-01-01";
  const validTo = to && DATE_REGEX.test(String(to)) ? String(to) : "2099-12-31";
  const filterType = type && ["personal", "common", "on_behalf"].includes(String(type)) ? String(type) : "all";
  const filterCategory = category ? String(category).trim().toLowerCase() : "";
  const cacheKey = `${hid}:${uid}:${validFrom}:${validTo}:${filterType}:${filterCategory}`;
  const now = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS3) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "private, max-age=15");
    return res.json(cached.data);
  }
  try {
    const [row] = await db_default`
      WITH user_expenses AS (
        -- 1. Personal expenses paid by user
        SELECT
          e.id,
          e.expense_date,
          e.created_at,
          'personal' AS expense_type,
          e.description,
          e.amount_paise AS my_amount_paise,
          e.amount_paise AS total_amount_paise,
          COALESCE(c.name, 'Uncategorized') AS category_name,
          NULL::uuid AS other_user_id,
          NULL::text AS other_user_name
        FROM expenses e
        LEFT JOIN categories c ON c.id = e.category_id
        WHERE e.household_id = ${hid}
          AND e.expense_type = 'personal'
          AND e.paid_by = ${uid}
          AND e.is_deleted = FALSE
          AND e.expense_date >= ${validFrom}
          AND e.expense_date <= ${validTo}
          AND (${filterType} = 'all' OR ${filterType} = 'personal')
          AND (${filterCategory} = '' OR LOWER(COALESCE(c.name, 'Uncategorized')) = ${filterCategory})

        UNION ALL

        -- 2. Household Common expenses (user's allocated split share)
        SELECT
          e.id,
          e.expense_date,
          e.created_at,
          'common' AS expense_type,
          e.description,
          es.amount_paise AS my_amount_paise,
          e.amount_paise AS total_amount_paise,
          COALESCE(c.name, 'Household Common') AS category_name,
          NULL::uuid AS other_user_id,
          NULL::text AS other_user_name
        FROM expense_shares es
        JOIN expenses e ON e.id = es.expense_id
        LEFT JOIN categories c ON c.id = e.category_id
        WHERE e.household_id = ${hid}
          AND e.expense_type = 'common'
          AND es.user_id = ${uid}
          AND e.is_deleted = FALSE
          AND e.expense_date >= ${validFrom}
          AND e.expense_date <= ${validTo}
          AND (${filterType} = 'all' OR ${filterType} = 'common')
          AND (${filterCategory} = '' OR LOWER(COALESCE(c.name, 'Household Common')) = ${filterCategory})

        UNION ALL

        -- 3. On-behalf purchases made for flatmates
        SELECT
          e.id,
          e.expense_date,
          e.created_at,
          'on_behalf' AS expense_type,
          COALESCE(ei.description, e.description) AS description,
          es.amount_paise AS my_amount_paise,
          e.amount_paise AS total_amount_paise,
          COALESCE(c.name, 'Shopping') AS category_name,
          u.id AS other_user_id,
          u.full_name AS other_user_name
        FROM expense_shares es
        JOIN expenses e ON e.id = es.expense_id
        JOIN users u ON u.id = es.user_id
        LEFT JOIN expense_items ei ON ei.id = es.expense_item_id
        LEFT JOIN categories c ON c.id = COALESCE(ei.category_id, e.category_id)
        WHERE e.household_id = ${hid}
          AND e.expense_type = 'on_behalf'
          AND e.paid_by = ${uid}
          AND es.user_id != ${uid}
          AND e.is_deleted = FALSE
          AND e.expense_date >= ${validFrom}
          AND e.expense_date <= ${validTo}
          AND (${filterType} = 'all' OR ${filterType} = 'on_behalf')
          AND (${filterCategory} = '' OR LOWER(COALESCE(c.name, 'Shopping')) = ${filterCategory})
      )
      SELECT
        -- Summary KPIs
        (SELECT json_build_object(
          'total_spending_paise', COALESCE(SUM(my_amount_paise), 0),
          'personal_spending_paise', COALESCE(SUM(CASE WHEN expense_type = 'personal' THEN my_amount_paise ELSE 0 END), 0),
          'common_share_paise', COALESCE(SUM(CASE WHEN expense_type = 'common' THEN my_amount_paise ELSE 0 END), 0),
          'on_behalf_paid_paise', COALESCE(SUM(CASE WHEN expense_type = 'on_behalf' THEN my_amount_paise ELSE 0 END), 0),
          'transaction_count', COUNT(*)
        ) FROM user_expenses) AS kpi,

        -- Category Breakdown
        (SELECT COALESCE(json_agg(json_build_object(
          'category_name', sub.category_name,
          'total_paise', sub.total_paise,
          'count', sub.count,
          'personal_paise', sub.personal_paise,
          'common_paise', sub.common_paise,
          'on_behalf_paise', sub.on_behalf_paise
        )), '[]'::json) FROM (
          SELECT
            category_name,
            COALESCE(SUM(my_amount_paise), 0) AS total_paise,
            COUNT(*) AS count,
            COALESCE(SUM(CASE WHEN expense_type = 'personal' THEN my_amount_paise ELSE 0 END), 0) AS personal_paise,
            COALESCE(SUM(CASE WHEN expense_type = 'common' THEN my_amount_paise ELSE 0 END), 0) AS common_paise,
            COALESCE(SUM(CASE WHEN expense_type = 'on_behalf' THEN my_amount_paise ELSE 0 END), 0) AS on_behalf_paise
          FROM user_expenses
          GROUP BY category_name
          ORDER BY total_paise DESC
        ) sub) AS categories,

        -- Daily Trend
        (SELECT COALESCE(json_agg(json_build_object(
          'expense_date', sub.expense_date,
          'total_paise', sub.total_paise,
          'personal_paise', sub.personal_paise,
          'common_paise', sub.common_paise,
          'on_behalf_paise', sub.on_behalf_paise,
          'count', sub.count
        )), '[]'::json) FROM (
          SELECT
            expense_date,
            COALESCE(SUM(my_amount_paise), 0) AS total_paise,
            COALESCE(SUM(CASE WHEN expense_type = 'personal' THEN my_amount_paise ELSE 0 END), 0) AS personal_paise,
            COALESCE(SUM(CASE WHEN expense_type = 'common' THEN my_amount_paise ELSE 0 END), 0) AS common_paise,
            COALESCE(SUM(CASE WHEN expense_type = 'on_behalf' THEN my_amount_paise ELSE 0 END), 0) AS on_behalf_paise,
            COUNT(*) AS count
          FROM user_expenses
          GROUP BY expense_date
          ORDER BY expense_date ASC
        ) sub) AS daily_trend,

        -- Roommate Beneficiary Breakdown (who I bought for)
        (SELECT COALESCE(json_agg(json_build_object(
          'roommate_id', sub.other_user_id,
          'roommate_name', sub.other_user_name,
          'total_paise', sub.total_paise,
          'count', sub.count
        )), '[]'::json) FROM (
          SELECT
            other_user_id,
            other_user_name,
            COALESCE(SUM(my_amount_paise), 0) AS total_paise,
            COUNT(*) AS count
          FROM user_expenses
          WHERE expense_type = 'on_behalf' AND other_user_id IS NOT NULL
          GROUP BY other_user_id, other_user_name
          ORDER BY total_paise DESC
        ) sub) AS roommates,

        -- Top Transactions
        (SELECT COALESCE(json_agg(json_build_object(
          'id', sub.id,
          'description', sub.description,
          'expense_date', sub.expense_date,
          'expense_type', sub.expense_type,
          'category_name', sub.category_name,
          'amount_paise', sub.my_amount_paise,
          'other_user_name', sub.other_user_name
        )), '[]'::json) FROM (
          SELECT id, description, expense_date, expense_type, category_name, my_amount_paise, other_user_name
          FROM user_expenses
          ORDER BY expense_date DESC, my_amount_paise DESC
          LIMIT 200
        ) sub) AS top_transactions
    `;
    const kpiRaw = row?.kpi || {};
    const totalSpending = parseInt(kpiRaw.total_spending_paise || 0, 10);
    const personalSpending = parseInt(kpiRaw.personal_spending_paise || 0, 10);
    const commonShare = parseInt(kpiRaw.common_share_paise || 0, 10);
    const onBehalfPaid = parseInt(kpiRaw.on_behalf_paid_paise || 0, 10);
    const transactionCount = parseInt(kpiRaw.transaction_count || 0, 10);
    const categoriesRaw = row?.categories || [];
    const categories = categoriesRaw.map((c) => {
      const tot = parseInt(c.total_paise || 0, 10);
      return {
        categoryName: c.category_name,
        totalPaise: tot,
        percentage: totalSpending > 0 ? Math.round(tot / totalSpending * 1e3) / 10 : 0,
        count: parseInt(c.count || 0, 10),
        personalPaise: parseInt(c.personal_paise || 0, 10),
        commonPaise: parseInt(c.common_paise || 0, 10),
        onBehalfPaise: parseInt(c.on_behalf_paise || 0, 10)
      };
    });
    const dailyTrendRaw = row?.daily_trend || [];
    let runningCumulative = 0;
    const dailyTrend = dailyTrendRaw.map((d) => {
      const dayTotal = parseInt(d.total_paise || 0, 10);
      runningCumulative += dayTotal;
      return {
        date: d.expense_date,
        expense_date: d.expense_date,
        totalPaise: dayTotal,
        personalPaise: parseInt(d.personal_paise || 0, 10),
        commonPaise: parseInt(d.common_paise || 0, 10),
        onBehalfPaise: parseInt(d.on_behalf_paise || 0, 10),
        cumulativePaise: runningCumulative,
        count: parseInt(d.count || 0, 10)
      };
    });
    const roommates = (row?.roommates || []).map((r) => ({
      roommateId: r.roommate_id,
      roommateName: r.roommate_name,
      totalPaise: parseInt(r.total_paise || 0, 10),
      count: parseInt(r.count || 0, 10)
    }));
    const topTransactions = (row?.top_transactions || []).map((t) => ({
      id: t.id,
      description: t.description,
      expenseDate: t.expense_date,
      expenseType: t.expense_type,
      categoryName: t.category_name,
      amountPaise: parseInt(t.amount_paise || 0, 10),
      otherUserName: t.other_user_name
    }));
    const daysInPeriod = Math.max(1, dailyTrend.length);
    const dailyAveragePaise = Math.round(totalSpending / daysInPeriod);
    const result = {
      kpi: {
        totalSpendingPaise: totalSpending,
        personalSpendingPaise: personalSpending,
        commonSharePaise: commonShare,
        onBehalfPaidPaise: onBehalfPaid,
        transactionCount,
        dailyAveragePaise,
        topCategoryName: categories[0]?.categoryName || "None",
        topCategoryPaise: categories[0]?.totalPaise || 0
      },
      typeDistribution: {
        personalPaise: personalSpending,
        personalPercentage: totalSpending > 0 ? Math.round(personalSpending / totalSpending * 1e3) / 10 : 0,
        commonPaise: commonShare,
        commonPercentage: totalSpending > 0 ? Math.round(commonShare / totalSpending * 1e3) / 10 : 0,
        onBehalfPaise: onBehalfPaid,
        onBehalfPercentage: totalSpending > 0 ? Math.round(onBehalfPaid / totalSpending * 1e3) / 10 : 0
      },
      categories,
      dailyTrend,
      roommates,
      topTransactions
    };
    analyticsCache.set(cacheKey, { data: result, timestamp: now });
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "private, max-age=15");
    res.json(result);
  } catch (err) {
    console.error("[analytics GET / error]:", err?.message || err);
    res.status(500).json({ error: "Server error computing expense analytics" });
  }
});
var analytics_default = router4;

// routes/balances.ts
var router5 = Router5();
var balanceCache = /* @__PURE__ */ new Map();
var BALANCE_CACHE_TTL_MS = 15 * 1e3;
function invalidateBalanceCache(householdId) {
  if (householdId) {
    for (const key of balanceCache.keys()) {
      if (key.startsWith(`${householdId}:`)) {
        balanceCache.delete(key);
      }
    }
  } else {
    balanceCache.clear();
  }
  try {
    invalidateAnalyticsCache(householdId);
  } catch {
  }
}
router5.get(["/", "/summary"], requireAuth, async (req, res) => {
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const cacheKey = `${hid}:${uid}`;
  const now = Date.now();
  const cached = balanceCache.get(cacheKey);
  if (cached && now - cached.timestamp < BALANCE_CACHE_TTL_MS) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "private, max-age=15");
    return res.json(cached.data);
  }
  try {
    const [row] = await db_default`
      SELECT
        (SELECT json_build_object(
          'personal_spending', (SELECT COALESCE(SUM(amount_paise), 0) FROM expenses WHERE household_id = ${hid} AND expense_type = 'personal' AND paid_by = ${uid} AND is_deleted = FALSE),
          'common_share', (SELECT COALESCE(SUM(es.amount_paise), 0) FROM expense_shares es JOIN expenses e ON e.id = es.expense_id WHERE e.household_id = ${hid} AND e.expense_type = 'common' AND es.user_id = ${uid} AND e.is_deleted = FALSE),
          'common_paid', (SELECT COALESCE(SUM(amount_paise), 0) FROM expenses WHERE household_id = ${hid} AND expense_type = 'common' AND paid_by = ${uid} AND is_deleted = FALSE),
          'advanced_for_others', (SELECT COALESCE(SUM(es.amount_paise), 0) FROM expense_shares es JOIN expenses e ON e.id = es.expense_id WHERE e.household_id = ${hid} AND e.expense_type IN ('on_behalf', 'common') AND e.paid_by = ${uid} AND es.user_id != ${uid} AND e.is_deleted = FALSE)
        )) AS totals,

        (SELECT COALESCE(json_agg(json_build_object('id', u.id, 'full_name', u.full_name)), '[]'::json)
         FROM users u
         JOIN household_members hm ON hm.user_id = u.id
         WHERE hm.household_id = ${hid} AND hm.is_active = TRUE AND u.id != ${uid}
        ) AS roommates,

        (SELECT COALESCE(json_agg(json_build_object('debtor_id', sub.user_id, 'debtor_name', sub.full_name, 'gross_owed', sub.gross_owed)), '[]'::json)
         FROM (
           SELECT es.user_id, u.full_name, COALESCE(SUM(es.amount_paise), 0) AS gross_owed
           FROM expense_shares es
           JOIN expenses e ON e.id = es.expense_id
           JOIN users u ON u.id = es.user_id
           WHERE e.household_id = ${hid} AND e.expense_type IN ('on_behalf', 'common') AND e.paid_by = ${uid} AND es.user_id != ${uid} AND e.is_deleted = FALSE
           GROUP BY es.user_id, u.full_name
         ) sub
        ) AS they_owe,

        (SELECT COALESCE(json_agg(json_build_object('creditor_id', sub.creditor_id, 'creditor_name', sub.creditor_name, 'gross_owe', sub.gross_owe)), '[]'::json)
         FROM (
           SELECT e.paid_by AS creditor_id, u.full_name AS creditor_name, COALESCE(SUM(es.amount_paise), 0) AS gross_owe
           FROM expense_shares es
           JOIN expenses e ON e.id = es.expense_id
           JOIN users u ON u.id = e.paid_by
           WHERE e.household_id = ${hid} AND e.expense_type IN ('on_behalf', 'common') AND e.paid_by != ${uid} AND es.user_id = ${uid} AND e.is_deleted = FALSE
           GROUP BY e.paid_by, u.full_name
         ) sub
        ) AS my_debts,

        (SELECT COALESCE(json_agg(json_build_object('peer_id', sub.peer_id, 'direction', sub.direction, 'confirmed_paid', sub.confirmed_paid)), '[]'::json)
         FROM (
           SELECT
             CASE WHEN recipient_id = ${uid} THEN payer_id ELSE recipient_id END AS peer_id,
             CASE WHEN recipient_id = ${uid} THEN 'received' ELSE 'paid' END AS direction,
             COALESCE(SUM(amount_paise), 0) AS confirmed_paid
           FROM settlements
           WHERE household_id = ${hid} AND status = 'confirmed' AND (recipient_id = ${uid} OR payer_id = ${uid})
           GROUP BY peer_id, direction
         ) sub
        ) AS settlements
    `;
    const totalsRow = row?.totals || {};
    const roommates = row?.roommates || [];
    const theyOweRows = row?.they_owe || [];
    const myDebtRows = row?.my_debts || [];
    const settlementRows = row?.settlements || [];
    const peerNames = /* @__PURE__ */ new Map();
    for (const m of roommates || []) peerNames.set(m.id, m.full_name);
    for (const r of theyOweRows || []) peerNames.set(r.debtor_id, r.debtor_name);
    for (const r of myDebtRows || []) peerNames.set(r.creditor_id, r.creditor_name);
    const theyOweMap = Object.fromEntries(
      (theyOweRows || []).map((r) => [r.debtor_id, parseInt(r.gross_owed || 0, 10)])
    );
    const myDebtMap = Object.fromEntries(
      (myDebtRows || []).map((r) => [r.creditor_id, parseInt(r.gross_owe || 0, 10)])
    );
    const receivedMap = {};
    const paidMap = {};
    for (const s of settlementRows || []) {
      const amt = parseInt(s.confirmed_paid || 0, 10);
      if (s.direction === "received") {
        receivedMap[s.peer_id] = amt;
      } else {
        paidMap[s.peer_id] = amt;
      }
    }
    const pairwise = [];
    const myDebts = [];
    for (const [peerId, peerName] of peerNames.entries()) {
      const theyOweGross = theyOweMap[peerId] || 0;
      const myDebtGross = myDebtMap[peerId] || 0;
      const settlementsReceived = receivedMap[peerId] || 0;
      const settlementsPaid = paidMap[peerId] || 0;
      const netOwedToMe = theyOweGross + settlementsPaid - (myDebtGross + settlementsReceived);
      if (netOwedToMe > 0) {
        pairwise.push({
          debtorId: peerId,
          debtorName: peerName,
          grossOwed: theyOweGross,
          confirmedPaid: settlementsReceived,
          crossOffset: myDebtGross + settlementsPaid,
          outstanding: netOwedToMe
        });
      } else if (netOwedToMe < 0) {
        myDebts.push({
          creditorId: peerId,
          creditorName: peerName,
          grossOwe: myDebtGross,
          confirmedPaid: settlementsPaid,
          crossOffset: theyOweGross + settlementsReceived,
          outstanding: Math.abs(netOwedToMe)
        });
      }
    }
    const totalOwedToMe = pairwise.reduce((acc, p) => acc + Number(p.outstanding || 0), 0);
    const totalOwedByMe = myDebts.reduce((acc, d) => acc + Number(d.outstanding || 0), 0);
    const result = {
      personalSpending: parseInt(totalsRow?.personal_spending || 0, 10),
      commonShare: parseInt(totalsRow?.common_share || 0, 10),
      commonPaid: parseInt(totalsRow?.common_paid || 0, 10),
      advancedForOthers: parseInt(totalsRow?.advanced_for_others || 0, 10),
      owedToMe: totalOwedToMe,
      owedByMe: totalOwedByMe,
      pairwise,
      myDebts
    };
    balanceCache.set(cacheKey, { data: result, timestamp: now });
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "private, max-age=15");
    res.json(result);
  } catch (err) {
    console.error("[balances GET /]", err);
    res.status(500).json({ error: "Server error" });
  }
});
var balances_default = router5;

// routes/expenses.ts
var router6 = Router6();
var DATE_REGEX2 = /^\d{4}-\d{2}-\d{2}$/;
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function resolveCategoryId(categoryInput) {
  if (!categoryInput) return null;
  const val = String(categoryInput).trim();
  if (!val) return null;
  if (UUID_REGEX.test(val)) {
    const rows = await db_default`SELECT id FROM categories WHERE id = ${val}`;
    if (rows.length) return rows[0].id;
  }
  const existing = await db_default`
    SELECT id FROM categories WHERE LOWER(name) = LOWER(${val}) LIMIT 1`;
  if (existing.length) return existing[0].id;
  const newId = uuidv43();
  await db_default`
    INSERT INTO categories (id, name, is_active)
    VALUES (${newId}, ${val.slice(0, 100)}, TRUE)`;
  return newId;
}
router6.get("/", requireAuth, async (req, res) => {
  const { type, from, to, page, limit } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(1e3, Math.max(1, parseInt(String(limit), 10) || 500));
  const offsetNum = (pageNum - 1) * limitNum;
  const validFrom = from && DATE_REGEX2.test(String(from)) ? String(from) : null;
  const validTo = to && DATE_REGEX2.test(String(to)) ? String(to) : null;
  const minDate = validFrom || "1970-01-01";
  const maxDate = validTo || "2099-12-31";
  const session = req.session;
  const hid = session.householdId;
  const uid = session.userId;
  try {
    let rows;
    if (type === "personal") {
      rows = await db_default`
        SELECT e.*, u.full_name AS paid_by_name, c.name AS category_name
        FROM   expenses e
        LEFT   JOIN users      u ON u.id = e.paid_by
        LEFT   JOIN categories c ON c.id = e.category_id
        WHERE  e.household_id = ${hid}
          AND  e.expense_type = 'personal'
          AND  e.paid_by      = ${uid}
          AND  e.is_deleted   = FALSE
          AND  e.expense_date >= ${minDate}
          AND  e.expense_date <= ${maxDate}
        ORDER  BY e.expense_date DESC, e.created_at DESC
        LIMIT  ${limitNum} OFFSET ${offsetNum}`;
    } else if (type === "common") {
      rows = await db_default`
        SELECT e.*, u.full_name AS paid_by_name, c.name AS category_name
        FROM   expenses e
        LEFT   JOIN users      u ON u.id = e.paid_by
        LEFT   JOIN categories c ON c.id = e.category_id
        WHERE  e.household_id = ${hid}
          AND  e.expense_type = 'common'
          AND  e.is_deleted   = FALSE
          AND  e.expense_date >= ${minDate}
          AND  e.expense_date <= ${maxDate}
        ORDER  BY e.expense_date DESC, e.created_at DESC
        LIMIT  ${limitNum} OFFSET ${offsetNum}`;
    } else {
      rows = await db_default`
        SELECT e.*, u.full_name AS paid_by_name, c.name AS category_name
        FROM   expenses e
        LEFT   JOIN users      u ON u.id = e.paid_by
        LEFT   JOIN categories c ON c.id = e.category_id
        WHERE  e.household_id = ${hid}
          AND  e.is_deleted   = FALSE
          AND  e.expense_date >= ${minDate}
          AND  e.expense_date <= ${maxDate}
          AND  (
            e.paid_by = ${uid}
            OR e.expense_type = 'common'
            OR EXISTS (
              SELECT 1 FROM expense_shares es
              WHERE  es.expense_id = e.id AND es.user_id = ${uid}
            )
          )
        ORDER  BY e.expense_date DESC, e.created_at DESC
        LIMIT  ${limitNum} OFFSET ${offsetNum}`;
    }
    if (type === "common" && rows.length > 0) {
      const expIds = rows.map((r) => r.id);
      const shareRows = await db_default`
        SELECT es.*, u.full_name
        FROM   expense_shares es
        JOIN   users u ON u.id = es.user_id
        WHERE  es.expense_id = ANY(${expIds})`;
      const sharesByExp = {};
      for (const sh of shareRows) {
        if (!sharesByExp[sh.expense_id]) sharesByExp[sh.expense_id] = [];
        sharesByExp[sh.expense_id].push(sh);
      }
      rows = rows.map((r) => ({
        ...r,
        shares: sharesByExp[r.id] || []
      }));
    }
    res.json(rows);
  } catch (err) {
    console.error("[expenses GET /]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router6.get("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const session = req.session;
  const uid = session.userId;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: "Invalid expense ID" });
  }
  try {
    const rows = await db_default`
      SELECT e.*, u.full_name AS paid_by_name, c.name AS category_name
      FROM   expenses e
      LEFT   JOIN users      u ON u.id = e.paid_by
      LEFT   JOIN categories c ON c.id = e.category_id
      WHERE  e.id = ${id} AND e.is_deleted = FALSE`;
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const exp = rows[0];
    const isOwner = exp.paid_by === uid;
    const isCommon = exp.expense_type === "common";
    if (!isOwner && !isCommon) {
      const shareRows = await db_default`
        SELECT 1 FROM expense_shares WHERE expense_id = ${id} AND user_id = ${uid}`;
      if (!shareRows.length) return res.status(403).json({ error: "Access denied" });
    }
    const items = await db_default`
      SELECT ei.*, c.name AS category_name
      FROM   expense_items ei
      LEFT   JOIN categories c ON c.id = ei.category_id
      WHERE  ei.expense_id = ${id}
      ORDER  BY ei.created_at`;
    const shares = await db_default`
      SELECT es.*, u.full_name
      FROM   expense_shares es
      JOIN   users u ON u.id = es.user_id
      WHERE  es.expense_id = ${id}`;
    res.json({ ...exp, items, shares });
  } catch (err) {
    console.error("[expenses GET /:id]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router6.post("/personal", requireAuth, async (req, res) => {
  const { description, amount_paise, category_id, expense_date, notes } = req.body;
  if (!description || !amount_paise || !expense_date) {
    return res.status(400).json({ error: "description, amount_paise, and expense_date are required" });
  }
  if (!Number.isInteger(amount_paise) || amount_paise <= 0 || amount_paise > 1e9) {
    return res.status(400).json({ error: "amount_paise must be a valid positive integer" });
  }
  if (!DATE_REGEX2.test(expense_date)) {
    return res.status(400).json({ error: "Invalid expense_date format (YYYY-MM-DD required)" });
  }
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const clientProvidedId = req.body.id && UUID_REGEX.test(req.body.id) ? req.body.id : null;
  const eid = clientProvidedId || uuidv43();
  try {
    if (clientProvidedId) {
      const existing = await db_default`
        SELECT id FROM expenses WHERE id = ${eid} AND household_id = ${hid}`;
      if (existing.length) {
        return res.status(200).json({ id: eid, already_exists: true });
      }
    }
    const resolvedCatId = await resolveCategoryId(category_id);
    await db_default.transaction([
      db_default`
        INSERT INTO expenses
          (id, household_id, created_by, expense_type, description, amount_paise, category_id, paid_by, expense_date, notes)
        VALUES
          (${eid}, ${hid}, ${uid}, 'personal', ${description.trim().slice(0, 255)}, ${amount_paise},
           ${resolvedCatId}, ${uid}, ${expense_date}, ${notes ? notes.trim().slice(0, 1e3) : null})`,
      db_default`
        INSERT INTO expense_shares (id, expense_id, user_id, amount_paise, share_type)
        VALUES (${uuidv43()}, ${eid}, ${uid}, ${amount_paise}, 'personal')`
    ]);
    await audit(uid, hid, "expense", eid, "create", null, { type: "personal", amount_paise });
    invalidateBalanceCache(hid);
    res.status(201).json({ id: eid });
  } catch (err) {
    console.error("[expenses POST /personal]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router6.post("/common", requireAdmin, async (req, res) => {
  const { description, amount_paise, category_id, expense_date, paid_by, split_method, notes, shares } = req.body;
  if (!description || !amount_paise || !expense_date || !paid_by || !split_method || !Array.isArray(shares)) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!Number.isInteger(amount_paise) || amount_paise <= 0 || amount_paise > 1e9) {
    return res.status(400).json({ error: "amount_paise must be a valid positive integer" });
  }
  if (!DATE_REGEX2.test(expense_date)) {
    return res.status(400).json({ error: "Invalid expense_date format (YYYY-MM-DD required)" });
  }
  if (shares.length === 0) {
    return res.status(400).json({ error: "At least one participant share is required" });
  }
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const householdMembers = await db_default`
    SELECT user_id FROM household_members
    WHERE  household_id = ${hid} AND is_active = TRUE`;
  const validMemberIds = new Set(householdMembers.map((m) => m.user_id));
  if (!validMemberIds.has(paid_by)) {
    return res.status(400).json({ error: "Paid-by member not found in this household" });
  }
  let shareTotal = 0;
  for (const sh of shares) {
    if (!sh.user_id || !validMemberIds.has(sh.user_id)) {
      return res.status(400).json({ error: "Invalid participant member in shares list" });
    }
    if (!Number.isInteger(sh.amount_paise) || sh.amount_paise <= 0) {
      return res.status(400).json({ error: "Each share amount_paise must be a positive integer" });
    }
    shareTotal += sh.amount_paise;
  }
  if (shareTotal !== amount_paise) {
    return res.status(400).json({
      error: `Share total (${shareTotal} paise) must equal expense amount (${amount_paise} paise)`
    });
  }
  const clientProvidedId = req.body.id && UUID_REGEX.test(req.body.id) ? req.body.id : null;
  const eid = clientProvidedId || uuidv43();
  try {
    if (clientProvidedId) {
      const existing = await db_default`
        SELECT id FROM expenses WHERE id = ${eid} AND household_id = ${hid}`;
      if (existing.length) {
        return res.status(200).json({ id: eid, already_exists: true });
      }
    }
    const resolvedCatId = await resolveCategoryId(category_id);
    const transactionQueries = [
      db_default`
        INSERT INTO expenses
          (id, household_id, created_by, expense_type, description, amount_paise, category_id,
           paid_by, expense_date, split_method, notes)
        VALUES
          (${eid}, ${hid}, ${uid}, 'common', ${description.trim().slice(0, 255)}, ${amount_paise}, ${resolvedCatId},
           ${paid_by}, ${expense_date}, ${split_method}, ${notes ? notes.trim().slice(0, 1e3) : null})`,
      ...shares.map(
        (sh) => db_default`
          INSERT INTO expense_shares (id, expense_id, user_id, amount_paise, share_type)
          VALUES (${uuidv43()}, ${eid}, ${sh.user_id}, ${sh.amount_paise}, 'common')`
      )
    ];
    await db_default.transaction(transactionQueries);
    await audit(uid, hid, "expense", eid, "create", null, { type: "common", amount_paise, split_method });
    invalidateBalanceCache(hid);
    res.status(201).json({ id: eid });
  } catch (err) {
    console.error("[expenses POST /common]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router6.post("/on-behalf", requireAuth, async (req, res) => {
  const { description, expense_date, notes, items } = req.body;
  if (!description || !expense_date) {
    return res.status(400).json({ error: "description and expense_date are required" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one item is required" });
  }
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const householdMembers = await db_default`
    SELECT user_id FROM household_members
    WHERE  household_id = ${hid} AND is_active = TRUE`;
  const validMemberIds = new Set(householdMembers.map((m) => m.user_id));
  let totalPaise = 0;
  for (const item of items) {
    if (!item.description || !item.beneficiary_id) {
      return res.status(400).json({ error: "Each item needs a description and beneficiary_id" });
    }
    if (!UUID_REGEX.test(item.beneficiary_id) || !validMemberIds.has(item.beneficiary_id)) {
      return res.status(400).json({ error: "Beneficiary must be an active member of this household" });
    }
    if (!Number.isInteger(item.amount_paise) || item.amount_paise <= 0 || item.amount_paise > 1e9) {
      return res.status(400).json({ error: "Each item amount_paise must be a positive integer within valid limits" });
    }
    totalPaise += item.amount_paise;
  }
  const clientProvidedId = req.body.id && UUID_REGEX.test(req.body.id) ? req.body.id : null;
  const eid = clientProvidedId || uuidv43();
  try {
    if (clientProvidedId) {
      const existing = await db_default`
        SELECT id FROM expenses WHERE id = ${eid} AND household_id = ${hid}`;
      if (existing.length) {
        return res.status(200).json({ id: eid, already_exists: true });
      }
    }
    const itemQueries = [];
    for (const item of items) {
      const iid = uuidv43();
      const resolvedCatId = await resolveCategoryId(item.category_id || item.category);
      itemQueries.push(
        db_default`
          INSERT INTO expense_items (id, expense_id, description, amount_paise, category_id)
          VALUES (${iid}, ${eid}, ${item.description.trim().slice(0, 255)}, ${item.amount_paise}, ${resolvedCatId})`,
        db_default`
          INSERT INTO expense_shares (id, expense_id, expense_item_id, user_id, amount_paise, share_type)
          VALUES (${uuidv43()}, ${eid}, ${iid}, ${item.beneficiary_id}, ${item.amount_paise}, 'on_behalf')`
      );
    }
    await db_default.transaction([
      db_default`
        INSERT INTO expenses
          (id, household_id, created_by, expense_type, description, amount_paise, paid_by, expense_date, notes)
        VALUES
          (${eid}, ${hid}, ${uid}, 'on_behalf', ${description.trim().slice(0, 255)}, ${totalPaise}, ${uid}, ${expense_date}, ${notes ? notes.trim().slice(0, 1e3) : null})`,
      ...itemQueries
    ]);
    await audit(uid, hid, "expense", eid, "create", null, {
      type: "on_behalf",
      amount_paise: totalPaise,
      item_count: items.length
    });
    invalidateBalanceCache(hid);
    res.status(201).json({ id: eid });
  } catch (err) {
    console.error("[expenses POST /on-behalf]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router6.put("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const isAdmin = session.role === "admin";
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: "Invalid expense ID" });
  }
  const { description, amount_paise, category_id, expense_date, notes } = req.body;
  try {
    const rows = await db_default`
      SELECT * FROM expenses WHERE id = ${id} AND household_id = ${hid} AND is_deleted = FALSE`;
    if (!rows.length) return res.status(404).json({ error: "Expense not found" });
    const exp = rows[0];
    if (exp.expense_type === "personal") {
      if (exp.paid_by !== uid) return res.status(403).json({ error: "You can only edit your own personal expenses" });
    } else if (exp.expense_type === "common") {
      if (!isAdmin) return res.status(403).json({ error: "Only admins can edit common expenses" });
    } else {
      if (exp.paid_by !== uid && !isAdmin) return res.status(403).json({ error: "Unauthorized to edit this purchase" });
    }
    const settled = await db_default`
      SELECT 1 FROM settlements s
      JOIN   expense_shares es ON es.id = s.expense_share_id
      WHERE  es.expense_id = ${id}
        AND  s.status IN ('confirmed', 'pending', 'verification_pending')`;
    if (amount_paise !== void 0 && amount_paise !== exp.amount_paise && settled.length) {
      return res.status(409).json({
        error: "Cannot modify amount: this expense has active or confirmed repayments linked to it"
      });
    }
    if (amount_paise !== void 0) {
      if (!Number.isInteger(amount_paise) || amount_paise <= 0 || amount_paise > 1e9) {
        return res.status(400).json({ error: "amount_paise must be a valid positive integer" });
      }
    }
    if (expense_date !== void 0 && !DATE_REGEX2.test(expense_date)) {
      return res.status(400).json({ error: "Invalid expense_date format (YYYY-MM-DD required)" });
    }
    const newDescription = description !== void 0 ? description.trim().slice(0, 255) : exp.description;
    const newAmountPaise = amount_paise !== void 0 ? amount_paise : exp.amount_paise;
    const newDate = expense_date !== void 0 ? expense_date : exp.expense_date;
    const newNotes = notes !== void 0 ? notes ? notes.trim().slice(0, 1e3) : null : exp.notes;
    const resolvedCatId = category_id !== void 0 ? await resolveCategoryId(category_id) : exp.category_id;
    if (exp.expense_type === "personal" && amount_paise !== void 0 && amount_paise !== exp.amount_paise) {
      await db_default.transaction([
        db_default`
          UPDATE expenses
          SET description = ${newDescription}, amount_paise = ${newAmountPaise},
              category_id = ${resolvedCatId}, expense_date = ${newDate},
              notes = ${newNotes}, updated_at = NOW()
          WHERE id = ${id}`,
        db_default`
          UPDATE expense_shares
          SET amount_paise = ${newAmountPaise}
          WHERE expense_id = ${id} AND user_id = ${uid}`
      ]);
    } else {
      await db_default`
        UPDATE expenses
        SET description = ${newDescription}, amount_paise = ${newAmountPaise},
            category_id = ${resolvedCatId}, expense_date = ${newDate},
            notes = ${newNotes}, updated_at = NOW()
        WHERE id = ${id}`;
    }
    await audit(uid, hid, "expense", id, "update", {
      description: exp.description,
      amount_paise: exp.amount_paise
    }, {
      description: newDescription,
      amount_paise: newAmountPaise
    });
    invalidateBalanceCache(hid);
    res.json({ ok: true, id });
  } catch (err) {
    console.error("[expenses PUT /:id]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router6.delete("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const isAdmin = session.role === "admin";
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: "Invalid expense ID" });
  }
  try {
    const rows = await db_default`
      SELECT * FROM expenses WHERE id = ${id} AND household_id = ${hid} AND is_deleted = FALSE`;
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const exp = rows[0];
    if (exp.expense_type === "personal") {
      if (exp.paid_by !== uid) return res.status(403).json({ error: "You can only delete your own personal expenses" });
    } else if (exp.expense_type === "common") {
      if (!isAdmin) return res.status(403).json({ error: "Only admins can delete common expenses" });
    } else {
      if (exp.paid_by !== uid && !isAdmin) return res.status(403).json({ error: "Unauthorized to delete this purchase" });
    }
    const settled = await db_default`
      SELECT 1 FROM settlements s
      JOIN   expense_shares es ON es.id = s.expense_share_id
      WHERE  es.expense_id = ${id}
        AND  s.status IN ('confirmed', 'pending', 'verification_pending')`;
    if (settled.length) {
      return res.status(409).json({
        error: "Cannot delete: this expense has active or confirmed repayments linked to it"
      });
    }
    await db_default`UPDATE expenses SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${id}`;
    await audit(uid, hid, "expense", id, "delete", { amount_paise: exp.amount_paise }, null);
    invalidateBalanceCache(hid);
    res.json({ ok: true });
  } catch (err) {
    console.error("[expenses DELETE /:id]", err);
    res.status(500).json({ error: "Server error" });
  }
});
var expenses_default = router6;

// routes/purchases.ts
import { Router as Router7 } from "express";
import { randomUUID as uuidv44 } from "crypto";
var router7 = Router7();
var UUID_REGEX2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var DATE_REGEX3 = /^\d{4}-\d{2}-\d{2}$/;
async function resolveCategoryId2(categoryInput) {
  if (!categoryInput) return null;
  const val = String(categoryInput).trim();
  if (!val) return null;
  if (UUID_REGEX2.test(val)) {
    const rows = await db_default`SELECT id FROM categories WHERE id = ${val}`;
    if (rows.length) return rows[0].id;
  }
  const existing = await db_default`
    SELECT id FROM categories WHERE LOWER(name) = LOWER(${val}) LIMIT 1`;
  if (existing.length) return existing[0].id;
  const newId = uuidv44();
  await db_default`
    INSERT INTO categories (id, name, is_active)
    VALUES (${newId}, ${val.slice(0, 100)}, TRUE)`;
  return newId;
}
async function handleCreatePurchase(req, res) {
  const { description, expense_date, notes, items } = req.body;
  if (!description || !expense_date) {
    return res.status(400).json({ error: "description and expense_date are required" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one item is required" });
  }
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const householdMembers = await db_default`
    SELECT user_id FROM household_members
    WHERE  household_id = ${hid} AND is_active = TRUE`;
  const validMemberIds = new Set(householdMembers.map((m) => m.user_id));
  let totalPaise = 0;
  for (const item of items) {
    if (!item.description || !item.beneficiary_id) {
      return res.status(400).json({ error: "Each item needs a description and beneficiary_id" });
    }
    if (!UUID_REGEX2.test(item.beneficiary_id) || !validMemberIds.has(item.beneficiary_id)) {
      return res.status(400).json({ error: "Beneficiary must be an active member of this household" });
    }
    if (!Number.isInteger(item.amount_paise) || item.amount_paise <= 0 || item.amount_paise > 1e9) {
      return res.status(400).json({ error: "Each item amount_paise must be a positive integer within valid limits" });
    }
    totalPaise += item.amount_paise;
  }
  const clientProvidedId = req.body.id && UUID_REGEX2.test(req.body.id) ? req.body.id : null;
  const eid = clientProvidedId || uuidv44();
  try {
    if (clientProvidedId) {
      const existing = await db_default`
        SELECT id FROM expenses WHERE id = ${eid} AND household_id = ${hid}`;
      if (existing.length) {
        return res.status(200).json({ id: eid, already_exists: true });
      }
    }
    const itemQueries = [];
    for (const item of items) {
      const iid = uuidv44();
      const resolvedCatId = await resolveCategoryId2(item.category_id || item.category);
      itemQueries.push(
        db_default`
          INSERT INTO expense_items (id, expense_id, description, amount_paise, category_id)
          VALUES (${iid}, ${eid}, ${item.description.trim().slice(0, 255)}, ${item.amount_paise}, ${resolvedCatId})`,
        db_default`
          INSERT INTO expense_shares (id, expense_id, expense_item_id, user_id, amount_paise, share_type)
          VALUES (${uuidv44()}, ${eid}, ${iid}, ${item.beneficiary_id}, ${item.amount_paise}, 'on_behalf')`
      );
    }
    await db_default.transaction([
      db_default`
        INSERT INTO expenses
          (id, household_id, created_by, expense_type, description, amount_paise, paid_by, expense_date, notes)
        VALUES
          (${eid}, ${hid}, ${uid}, 'on_behalf', ${description.trim().slice(0, 255)}, ${totalPaise}, ${uid}, ${expense_date}, ${notes ? notes.trim().slice(0, 1e3) : null})`,
      ...itemQueries
    ]);
    await audit(uid, hid, "expense", eid, "create", null, {
      type: "on_behalf",
      amount_paise: totalPaise,
      item_count: items.length
    });
    invalidateBalanceCache(hid);
    res.status(201).json({ id: eid });
  } catch (err) {
    console.error("[purchases POST /]", err);
    res.status(500).json({ error: "Server error" });
  }
}
router7.post("/", requireAuth, handleCreatePurchase);
router7.post("/on-behalf", requireAuth, handleCreatePurchase);
router7.get(["/made-by-me", "/made"], requireAuth, async (req, res) => {
  const { from, to } = req.query;
  const validFrom = from && DATE_REGEX3.test(String(from)) ? String(from) : null;
  const validTo = to && DATE_REGEX3.test(String(to)) ? String(to) : null;
  const minDate = validFrom || "1970-01-01";
  const maxDate = validTo || "2099-12-31";
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  try {
    const expenses = await db_default`
      SELECT e.*, u.full_name AS paid_by_name
      FROM   expenses e
      LEFT   JOIN users u ON u.id = e.paid_by
      WHERE  e.household_id = ${hid}
        AND  e.expense_type = 'on_behalf'
        AND  e.paid_by      = ${uid}
        AND  e.is_deleted   = FALSE
        AND  e.expense_date >= ${minDate}
        AND  e.expense_date <= ${maxDate}
      ORDER  BY e.expense_date DESC, e.created_at DESC`;
    if (!expenses.length) return res.json([]);
    const expIds = expenses.map((e) => e.id);
    const [allItems, settlementRows] = await Promise.all([
      db_default`
        SELECT ei.*, es.user_id AS beneficiary_id, u2.full_name AS beneficiary_name, es.id AS share_id,
               c.name AS category_name
        FROM   expense_items  ei
        LEFT   JOIN categories c ON c.id = ei.category_id
        JOIN   expense_shares es ON es.expense_item_id = ei.id
        JOIN   users          u2 ON u2.id = es.user_id
        WHERE  ei.expense_id = ANY(${expIds})`,
      db_default`
        SELECT s.expense_share_id, es.expense_id, COALESCE(SUM(s.amount_paise), 0) AS total_paid
        FROM   settlements s
        JOIN   expense_shares es ON es.id = s.expense_share_id
        WHERE  es.expense_id = ANY(${expIds})
          AND  s.status = 'confirmed'
        GROUP  BY s.expense_share_id, es.expense_id`
    ]);
    const itemsByExpense = {};
    for (const item of allItems) {
      if (!itemsByExpense[item.expense_id]) itemsByExpense[item.expense_id] = [];
      itemsByExpense[item.expense_id].push(item);
    }
    const settledByExpense = {};
    for (const r of settlementRows) {
      settledByExpense[r.expense_id] = (settledByExpense[r.expense_id] || 0) + parseInt(r.total_paid || 0, 10);
    }
    const result = expenses.map((exp) => ({
      ...exp,
      items: itemsByExpense[exp.id] || [],
      confirmed_paid_paise: settledByExpense[exp.id] || 0
    }));
    res.json(result);
  } catch (err) {
    console.error("[purchases GET /made-by-me]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router7.get(["/made-for-me", "/for-me"], requireAuth, async (req, res) => {
  const { from, to } = req.query;
  const validFrom = from && DATE_REGEX3.test(String(from)) ? String(from) : null;
  const validTo = to && DATE_REGEX3.test(String(to)) ? String(to) : null;
  const minDate = validFrom || "1970-01-01";
  const maxDate = validTo || "2099-12-31";
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  try {
    const expenses = await db_default`
      SELECT DISTINCT e.*, u.full_name AS paid_by_name
      FROM   expenses       e
      JOIN   expense_shares es ON es.expense_id = e.id
      LEFT   JOIN users      u ON u.id = e.paid_by
      WHERE  e.household_id = ${hid}
        AND  e.expense_type = 'on_behalf'
        AND  es.user_id     = ${uid}
        AND  e.paid_by     != ${uid}
        AND  e.is_deleted   = FALSE
        AND  e.expense_date >= ${minDate}
        AND  e.expense_date <= ${maxDate}
      ORDER  BY e.expense_date DESC, e.created_at DESC`;
    if (!expenses.length) return res.json([]);
    const expIds = expenses.map((e) => e.id);
    const [myItems, settlementRows] = await Promise.all([
      db_default`
        SELECT ei.*, es.amount_paise AS my_share, es.id AS share_id,
               c.name AS category_name
        FROM   expense_items  ei
        LEFT   JOIN categories c ON c.id = ei.category_id
        JOIN   expense_shares es ON es.expense_item_id = ei.id
        WHERE  ei.expense_id  = ANY(${expIds})
          AND  es.user_id     = ${uid}`,
      db_default`
        SELECT es.expense_id, COALESCE(SUM(s.amount_paise), 0) AS total_paid
        FROM   settlements    s
        JOIN   expense_shares es ON es.id = s.expense_share_id
        WHERE  es.expense_id = ANY(${expIds})
          AND  es.user_id    = ${uid}
          AND  s.status      = 'confirmed'
        GROUP  BY es.expense_id`
    ]);
    const itemsByExpense = {};
    for (const item of myItems) {
      if (!itemsByExpense[item.expense_id]) itemsByExpense[item.expense_id] = [];
      itemsByExpense[item.expense_id].push(item);
    }
    const settledByExpense = {};
    for (const r of settlementRows) {
      settledByExpense[r.expense_id] = (settledByExpense[r.expense_id] || 0) + parseInt(r.total_paid || 0, 10);
    }
    const result = expenses.map((exp) => {
      const items = itemsByExpense[exp.id] || [];
      const myTotal = items.reduce((s, i) => s + parseInt(i.my_share || 0, 10), 0);
      return {
        ...exp,
        my_items: items,
        my_total_paise: myTotal,
        my_confirmed_paise: settledByExpense[exp.id] || 0
      };
    });
    res.json(result);
  } catch (err) {
    console.error("[purchases GET /made-for-me]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router7.delete("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const isAdmin = session.role === "admin";
  if (!UUID_REGEX2.test(id)) {
    return res.status(400).json({ error: "Invalid purchase ID" });
  }
  try {
    const rows = await db_default`
      SELECT * FROM expenses
      WHERE id = ${id} AND household_id = ${hid} AND expense_type = 'on_behalf' AND is_deleted = FALSE`;
    if (!rows.length) return res.status(404).json({ error: "Purchase not found" });
    const exp = rows[0];
    if (exp.paid_by !== uid && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized to delete this purchase" });
    }
    const settled = await db_default`
      SELECT 1 FROM settlements s
      JOIN   expense_shares es ON es.id = s.expense_share_id
      WHERE  es.expense_id = ${id}
        AND  s.status IN ('confirmed', 'pending', 'verification_pending')`;
    if (settled.length) {
      return res.status(409).json({
        error: "Cannot delete: this purchase has active or confirmed repayments linked to it"
      });
    }
    await db_default`UPDATE expenses SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${id}`;
    await audit(uid, hid, "expense", id, "delete", { amount_paise: exp.amount_paise, type: "on_behalf" }, null);
    invalidateBalanceCache(hid);
    res.json({ ok: true });
  } catch (err) {
    console.error("[purchases DELETE /:id]", err);
    res.status(500).json({ error: "Server error" });
  }
});
var purchases_default = router7;

// routes/settlements.ts
import { Router as Router8 } from "express";
import { randomUUID as uuidv45 } from "crypto";
var router8 = Router8();
var UUID_REGEX3 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
router8.get("/", requireAuth, async (req, res) => {
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const limitNum = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 30));
  const pageNum = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const offsetNum = (pageNum - 1) * limitNum;
  try {
    const rows = await db_default`
      SELECT s.*,
             p.full_name  AS payer_name,
             r.full_name  AS recipient_name,
             cb.full_name AS confirmed_by_name
      FROM   settlements s
      JOIN   users p  ON p.id  = s.payer_id
      JOIN   users r  ON r.id  = s.recipient_id
      LEFT   JOIN users cb ON cb.id = s.confirmed_by
      WHERE  s.household_id = ${hid}
        AND  (s.payer_id = ${uid} OR s.recipient_id = ${uid})
      ORDER  BY s.created_at DESC
      LIMIT  ${limitNum} OFFSET ${offsetNum}`;
    res.json(rows);
  } catch (err) {
    console.error("[settlements GET /]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router8.post("/", requireAuth, rateLimitClaim, async (req, res) => {
  const { recipient_id, amount_paise, method, transaction_reference, note, expense_share_id } = req.body;
  if (!recipient_id || !amount_paise || !method) {
    return res.status(400).json({ error: "recipient_id, amount_paise, and method are required" });
  }
  if (!UUID_REGEX3.test(recipient_id)) {
    return res.status(400).json({ error: "Invalid recipient_id" });
  }
  if (!Number.isInteger(amount_paise) || amount_paise <= 0 || amount_paise > 1e9) {
    return res.status(400).json({ error: "amount_paise must be a positive integer within valid limits" });
  }
  if (!["cash", "upi"].includes(method)) {
    return res.status(400).json({ error: 'method must be "cash" or "upi"' });
  }
  if (expense_share_id && !UUID_REGEX3.test(expense_share_id)) {
    return res.status(400).json({ error: "Invalid expense_share_id" });
  }
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  if (uid === recipient_id) {
    return res.status(400).json({ error: "You cannot pay yourself" });
  }
  try {
    const clientProvidedId = req.body.id && UUID_REGEX3.test(req.body.id) ? req.body.id : null;
    const sid = clientProvidedId || uuidv45();
    if (clientProvidedId) {
      const existing = await db_default`
        SELECT id FROM settlements WHERE id = ${sid} AND household_id = ${hid}`;
      if (existing.length) {
        return res.status(200).json({ id: sid, already_exists: true });
      }
    }
    if (expense_share_id) {
      const shareCheck = await db_default`
        SELECT es.id, es.amount_paise, es.user_id, e.paid_by
        FROM   expense_shares es
        JOIN   expenses e ON e.id = es.expense_id
        WHERE  es.id = ${expense_share_id}
          AND  e.household_id = ${hid}
          AND  e.is_deleted = FALSE`;
      if (!shareCheck.length) {
        return res.status(404).json({ error: "Expense share not found in this household" });
      }
      const share = shareCheck[0];
      if (share.user_id !== uid) {
        return res.status(403).json({ error: "You can only settle your own expense shares" });
      }
      if (share.paid_by !== recipient_id) {
        return res.status(400).json({ error: "Recipient does not match the creditor of this expense share" });
      }
    }
    const recipientRows = await db_default`
      SELECT u.full_name, mup.upi_id
      FROM   users u
      JOIN   household_members hm ON hm.user_id = u.id
      LEFT   JOIN member_upi_profiles mup ON mup.user_id = u.id
      WHERE  u.id = ${recipient_id}
        AND  hm.household_id = ${hid}
        AND  hm.is_active = TRUE`;
    if (!recipientRows.length) {
      return res.status(404).json({ error: "Recipient not found in this household" });
    }
    const recip = recipientRows[0];
    await db_default`
      INSERT INTO settlements
        (id, household_id, payer_id, recipient_id, amount_paise, method, status,
         transaction_reference, note, recipient_name_snapshot, recipient_upi_snapshot, expense_share_id)
      VALUES
        (${sid}, ${hid}, ${uid}, ${recipient_id}, ${amount_paise}, ${method},
         'verification_pending', ${transaction_reference ? transaction_reference.trim().slice(0, 100) : null},
         ${note ? note.trim().slice(0, 500) : null},
         ${recip.full_name}, ${recip.upi_id || null}, ${expense_share_id || null})`;
    await audit(uid, hid, "settlement", sid, "claim", null, { amount_paise, method, recipient_id });
    invalidateBalanceCache(hid);
    res.status(201).json({ id: sid });
  } catch (err) {
    console.error("[settlements POST /]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router8.post("/:id/confirm", requireAuth, async (req, res) => {
  const id = req.params.id;
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  if (!UUID_REGEX3.test(id)) return res.status(400).json({ error: "Invalid ID" });
  try {
    const checkRows = await db_default`SELECT * FROM settlements WHERE id = ${id} AND household_id = ${hid}`;
    if (!checkRows.length) return res.status(404).json({ error: "Not found" });
    const s = checkRows[0];
    if (s.recipient_id !== uid) {
      return res.status(403).json({ error: "Only the recipient can confirm this payment" });
    }
    if (s.status === "confirmed") return res.json({ ok: true });
    const updated = await db_default`
      UPDATE settlements
      SET    status       = 'confirmed',
             confirmed_at = NOW(),
             confirmed_by = ${uid},
             updated_at   = NOW()
      WHERE  id = ${id}
        AND  recipient_id = ${uid}
        AND  status IN ('pending', 'verification_pending')
      RETURNING *`;
    if (!updated.length) {
      return res.status(409).json({ error: "Settlement is no longer in a pending status" });
    }
    await audit(uid, hid, "settlement", id, "confirm", { status: s.status }, { status: "confirmed" });
    invalidateBalanceCache(hid);
    res.json({ ok: true });
  } catch (err) {
    console.error("[settlements POST /:id/confirm]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router8.post("/:id/reject", requireAuth, async (req, res) => {
  const id = req.params.id;
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  if (!UUID_REGEX3.test(id)) return res.status(400).json({ error: "Invalid ID" });
  try {
    const checkRows = await db_default`SELECT * FROM settlements WHERE id = ${id} AND household_id = ${hid}`;
    if (!checkRows.length) return res.status(404).json({ error: "Not found" });
    const s = checkRows[0];
    if (s.recipient_id !== uid) {
      return res.status(403).json({ error: "Only the recipient can reject this payment" });
    }
    const updated = await db_default`
      UPDATE settlements
      SET    status = 'rejected', updated_at = NOW()
      WHERE  id = ${id}
        AND  recipient_id = ${uid}
        AND  status IN ('pending', 'verification_pending')
      RETURNING *`;
    if (!updated.length) {
      return res.status(409).json({ error: "Settlement is no longer in a pending status" });
    }
    await audit(uid, hid, "settlement", id, "reject", { status: s.status }, { status: "rejected" });
    invalidateBalanceCache(hid);
    res.json({ ok: true });
  } catch (err) {
    console.error("[settlements POST /:id/reject]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router8.post("/:id/cancel", requireAuth, async (req, res) => {
  const id = req.params.id;
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  if (!UUID_REGEX3.test(id)) return res.status(400).json({ error: "Invalid ID" });
  try {
    const checkRows = await db_default`SELECT * FROM settlements WHERE id = ${id} AND household_id = ${hid}`;
    if (!checkRows.length) return res.status(404).json({ error: "Not found" });
    const s = checkRows[0];
    if (s.payer_id !== uid) {
      return res.status(403).json({ error: "Only the payer can cancel this payment claim" });
    }
    const updated = await db_default`
      UPDATE settlements
      SET    status = 'cancelled', updated_at = NOW()
      WHERE  id = ${id}
        AND  payer_id = ${uid}
        AND  status IN ('pending', 'verification_pending')
      RETURNING *`;
    if (!updated.length) {
      return res.status(409).json({ error: "Settlement is no longer in a pending status" });
    }
    await audit(uid, hid, "settlement", id, "cancel", { status: s.status }, { status: "cancelled" });
    invalidateBalanceCache(hid);
    res.json({ ok: true });
  } catch (err) {
    console.error("[settlements POST /:id/cancel]", err);
    res.status(500).json({ error: "Server error" });
  }
});
var settlements_default = router8;

// routes/profile.ts
import { Router as Router9 } from "express";
import QRCode from "qrcode";

// utils/upi.ts
function normalizeUPI(upiId) {
  return upiId.trim().toLowerCase();
}
function validateUPI(upiId) {
  return /^[a-zA-Z0-9._\-+]{2,}@[a-zA-Z]{2,}$/.test(upiId);
}
function buildUpiUri(upiId, displayName, amountPaise = null) {
  let uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(displayName)}&cu=INR`;
  if (amountPaise != null && Number.isInteger(amountPaise) && amountPaise > 0) {
    const rupees = (amountPaise / 100).toFixed(2);
    uri += `&am=${rupees}`;
  }
  return uri;
}

// routes/profile.ts
var router9 = Router9();
var UUID_REGEX4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
router9.get("/upi", requireAuth, async (req, res) => {
  const session = req.session;
  try {
    const rows = await db_default`
      SELECT * FROM member_upi_profiles WHERE user_id = ${session.userId}`;
    res.json(rows[0] || null);
  } catch (err) {
    console.error("[profile GET /upi]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router9.put("/upi", requireAuth, rateLimitUpi, async (req, res) => {
  const session = req.session;
  const { upi_id, display_name } = req.body;
  if (!upi_id || !display_name) {
    return res.status(400).json({ error: "upi_id and display_name are required" });
  }
  const normalized = normalizeUPI(upi_id);
  if (!validateUPI(normalized)) {
    return res.status(400).json({
      error: "Invalid UPI ID format. Expected format: handle@provider (e.g. virendra@oksbi)"
    });
  }
  try {
    await db_default`
      INSERT INTO member_upi_profiles (user_id, upi_id, display_name, updated_at)
      VALUES (${session.userId}, ${normalized}, ${display_name.trim()}, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET upi_id       = ${normalized},
            display_name = ${display_name.trim()},
            updated_at   = NOW()`;
    res.json({ ok: true, upi_id: normalized });
  } catch (err) {
    console.error("[profile PUT /upi]", err);
    res.status(500).json({ error: "Server error" });
  }
});
router9.delete("/upi", requireAuth, async (req, res) => {
  const session = req.session;
  try {
    await db_default`DELETE FROM member_upi_profiles WHERE user_id = ${session.userId}`;
    res.json({ ok: true });
  } catch (err) {
    console.error("[profile DELETE /upi]", err);
    res.status(500).json({ error: "Server error" });
  }
});
async function handleQrRequest(req, res) {
  const session = req.session;
  const { userId, amount } = req.query;
  if (!userId || typeof userId !== "string") return res.status(400).json({ error: "userId is required" });
  if (!UUID_REGEX4.test(userId)) {
    return res.status(400).json({ error: "Invalid userId format" });
  }
  const hid = session.householdId;
  try {
    const rows = await db_default`
      SELECT mup.*, u.full_name
      FROM   member_upi_profiles mup
      JOIN   users u ON u.id = mup.user_id
      JOIN   household_members hm ON hm.user_id = u.id
      WHERE  mup.user_id = ${userId}
        AND  hm.household_id = ${hid}`;
    if (!rows.length) {
      return res.status(404).json({ error: "No UPI profile found for this user" });
    }
    const profile = rows[0];
    const amountPaise = amount && parseInt(String(amount), 10) > 0 ? parseInt(String(amount), 10) : null;
    const upiUri = buildUpiUri(profile.upi_id, profile.display_name, amountPaise);
    const qrDataUrl = await QRCode.toDataURL(upiUri, { errorCorrectionLevel: "M", width: 200 });
    res.json({
      qrDataUrl,
      upiUri,
      upiId: profile.upi_id,
      displayName: profile.display_name
    });
  } catch (err) {
    console.error("[profile QR]", err);
    res.status(500).json({ error: "Server error" });
  }
}
router9.get("/upi/qr", requireAuth, handleQrRequest);
router9.get("/qr", requireAuth, handleQrRequest);
var profile_default = router9;

// routes/activity.ts
import { Router as Router10 } from "express";
var router10 = Router10();
router10.get("/", requireAuth, async (req, res) => {
  const session = req.session;
  const hid = session.householdId;
  const uid = session.userId;
  try {
    const limitNum = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const rows = await db_default`
      SELECT al.*, u.full_name AS actor_name
      FROM   activity_logs al
      LEFT   JOIN users u ON u.id = al.actor_user_id
      WHERE  al.household_id    = ${hid}
        AND  al.actor_user_id   = ${uid}
      ORDER  BY al.created_at DESC
      LIMIT  ${limitNum}`;
    res.json(rows);
  } catch (err) {
    console.error("[activity GET /]", err);
    res.status(500).json({ error: "Server error" });
  }
});
var activity_default = router10;

// routes/ai.ts
import { Router as Router11 } from "express";
import { GoogleGenAI, Type } from "@google/genai";
var router11 = Router11();
var getAIClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};
var PREFERRED_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-lite-latest"
].filter(Boolean);
function getTodayKolkata() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(/* @__PURE__ */ new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
router11.get("/status", requireAuth, (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  res.json({
    available: hasKey,
    model: PREFERRED_MODELS[0] || "gemini-3.5-flash"
  });
});
router11.post("/parse-expense", requireAuth, rateLimitAI, async (req, res) => {
  const { transcript, clientDate } = req.body;
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return res.status(400).json({ error: "Voice transcript or text input is required." });
  }
  const ai = getAIClient();
  if (!ai) {
    return res.status(503).json({
      error: "Gemini AI is not configured on this server. Please set GEMINI_API_KEY in environment variables."
    });
  }
  const session = req.session;
  const uid = session.userId;
  const hid = session.householdId;
  const todayDate = clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate) ? clientDate : getTodayKolkata();
  try {
    const members = await db_default`
      SELECT u.id, u.full_name, u.username, hm.role
      FROM household_members hm
      JOIN users u ON u.id = hm.user_id
      WHERE hm.household_id = ${hid} AND hm.is_active = TRUE
      ORDER BY u.full_name ASC
    `;
    if (!members.length) {
      return res.status(400).json({ error: "No active household members found." });
    }
    const categories = await db_default`
      SELECT id, name FROM categories WHERE is_active = TRUE ORDER BY name ASC
    `;
    const currentUser = members.find((m) => m.id === uid) || { id: uid, full_name: "Me", role: session.role };
    const membersContext = members.map((m) => ({
      id: m.id,
      name: m.full_name,
      username: m.username,
      isCurrentUser: m.id === uid
    }));
    const categoriesList = categories.map((c) => c.name);
    const systemPrompt = `You are an intelligent expense parser for a flatmate expense manager in India.
Current logged-in user:
${JSON.stringify({ id: currentUser.id, name: currentUser.full_name, role: currentUser.role })}

Active Household Members:
${JSON.stringify(membersContext, null, 2)}

Available Categories:
${JSON.stringify(categoriesList)}

Today's Date: "${todayDate}" (use this reference for "today", "yesterday", "day before yesterday", days of the week, etc.)
Currency: Indian Rupee (INR). All final amounts must be in PAISE (1 rupee = 100 paise). E.g. \u20B9450 = 45000 paise.

Instructions:
Analyze the user's voice input transcript:
"${transcript.trim()}"

Identify:
1. "expense_type":
   - "personal": The user spent money strictly on themselves (e.g. "I spent 150 on breakfast", "Uber ride 200", "my mobile recharge 299").
   - "on_behalf": The user bought items on behalf of one or more specific flatmates (e.g. "Bought medicine for Rahul 250", "Paid 300 for Saurav's snacks and 100 for Rahul").
   - "common": Shared household expenses split among flatmates (e.g. "Paid electricity bill 1200 split equally", "Groceries 1500 split with everyone", "Dinner 900 split between me, Rahul, Amit"). If not specified otherwise and multiple people or house supplies are involved (e.g. WiFi, rent, maid, gas, water, groceries for flat), it's "common".

2. "description": A concise, clean description (e.g. "Groceries", "Uber ride", "Medicine for Rahul").
3. "amount_paise": Total expense amount in paise.
4. "expense_date": YYYY-MM-DD.
5. "category": Best matching category name from available categories or a sensible new category.
6. "notes": Any additional context or remarks mentioned.

If expense_type == "on_behalf":
- "items": Array of item objects. For each item:
  - "description": name of item (e.g. "Medicine")
  - "beneficiary_id": EXACT member ID from Active Household Members list who received/benefited from this item
  - "beneficiary_name": Full name of that beneficiary
  - "amount_paise": Item price in paise
  - "category": Category name for this item
  The sum of item amount_paise MUST equal total amount_paise.

If expense_type == "common":
- "split_method": "equal" or "custom"
- "paid_by_id": member ID who paid (default to current logged-in user ID unless specified)
- "shares": Array of participant shares with:
  - "user_id": member ID
  - "user_name": member full name
  - "amount_paise": share in paise
  If split equally with all flatmates, divide the total equally among ALL active household members. The sum of all shares MUST equal total amount_paise.

Ensure member IDs are EXACT strings matching the provided Active Household Members list.
Return the output strictly matching the JSON schema.`;
    let aiResponse = null;
    let usedModel = null;
    let lastError = null;
    const schemaConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          expense_type: { type: Type.STRING, enum: ["personal", "on_behalf", "common"] },
          description: { type: Type.STRING },
          amount_paise: { type: Type.INTEGER },
          expense_date: { type: Type.STRING },
          category: { type: Type.STRING },
          notes: { type: Type.STRING },
          split_method: { type: Type.STRING },
          paid_by_id: { type: Type.STRING },
          paid_by_name: { type: Type.STRING },
          shares: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                user_id: { type: Type.STRING },
                user_name: { type: Type.STRING },
                amount_paise: { type: Type.INTEGER }
              },
              required: ["user_id", "amount_paise"]
            }
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                beneficiary_id: { type: Type.STRING },
                beneficiary_name: { type: Type.STRING },
                amount_paise: { type: Type.INTEGER },
                category: { type: Type.STRING }
              },
              required: ["description", "beneficiary_id", "amount_paise"]
            }
          },
          summary: { type: Type.STRING }
        },
        required: ["expense_type", "description", "amount_paise", "expense_date"]
      }
    };
    for (const modelName of PREFERRED_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const resp = await ai.models.generateContent({
            model: modelName,
            contents: systemPrompt,
            config: schemaConfig
          });
          if (resp && resp.text) {
            aiResponse = resp.text;
            usedModel = modelName;
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`[AI Parse] Model ${modelName} (attempt ${attempt}) failed:`, err.message);
          if (attempt === 1 && (err.message?.includes("503") || err.message?.includes("timeout") || err.message?.includes("fetch failed"))) {
            await new Promise((r) => setTimeout(r, 500));
          } else {
            break;
          }
        }
      }
      if (aiResponse) break;
    }
    if (!aiResponse) {
      throw lastError || new Error("No response received from Gemini AI");
    }
    const parsed = JSON.parse(aiResponse);
    if (!Number.isInteger(parsed.amount_paise) || parsed.amount_paise <= 0) {
      return res.status(422).json({
        error: "Could not determine a valid expense amount from the input.",
        raw: parsed
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.expense_date)) {
      parsed.expense_date = todayDate;
    }
    const memberMap = new Map(members.map((m) => [m.id, m]));
    const nameMap = /* @__PURE__ */ new Map();
    members.forEach((m) => {
      nameMap.set(m.full_name.toLowerCase(), m);
      nameMap.set(m.username.toLowerCase(), m);
      const first = m.full_name.split(" ")[0].toLowerCase();
      if (!nameMap.has(first)) nameMap.set(first, m);
    });
    if (parsed.expense_type === "on_behalf") {
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        let itemsSum = 0;
        parsed.items = parsed.items.map((item) => {
          let benId = item.beneficiary_id;
          if (!memberMap.has(benId)) {
            const found = nameMap.get((item.beneficiary_name || "").toLowerCase());
            if (found) benId = found.id;
          }
          const ben = memberMap.get(benId) || currentUser;
          const p = Number.isInteger(item.amount_paise) && item.amount_paise > 0 ? item.amount_paise : 0;
          itemsSum += p;
          return {
            description: item.description || parsed.description,
            beneficiary_id: ben.id,
            beneficiary_name: ben.full_name,
            amount_paise: p,
            category: item.category || parsed.category || "General"
          };
        });
        if (itemsSum > 0) {
          parsed.amount_paise = itemsSum;
        }
      } else {
        parsed.items = [{
          description: parsed.description,
          beneficiary_id: currentUser.id,
          beneficiary_name: currentUser.full_name,
          amount_paise: parsed.amount_paise,
          category: parsed.category || "General"
        }];
      }
    }
    if (parsed.expense_type === "common") {
      parsed.paid_by_id = memberMap.has(parsed.paid_by_id) ? parsed.paid_by_id : currentUser.id;
      parsed.paid_by_name = memberMap.get(parsed.paid_by_id)?.full_name || currentUser.full_name;
      if (!Array.isArray(parsed.shares) || parsed.shares.length === 0) {
        const count = members.length;
        const baseShare = Math.floor(parsed.amount_paise / count);
        let remainder = parsed.amount_paise % count;
        parsed.shares = members.map((m) => {
          const sharePaise = baseShare + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;
          return {
            user_id: m.id,
            user_name: m.full_name,
            amount_paise: sharePaise
          };
        });
      } else {
        parsed.shares = parsed.shares.map((sh) => {
          let shId = sh.user_id;
          if (!memberMap.has(shId)) {
            const found = nameMap.get((sh.user_name || "").toLowerCase());
            if (found) shId = found.id;
          }
          const mem = memberMap.get(shId) || members[0];
          return {
            user_id: mem.id,
            user_name: mem.full_name,
            amount_paise: Number.isInteger(sh.amount_paise) ? sh.amount_paise : 0
          };
        });
        parsed.amount_paise = Number(parsed.amount_paise || 0);
        const totalShares = parsed.shares.reduce((sum, s) => sum + Number(s.amount_paise || 0), 0);
        if (totalShares !== parsed.amount_paise && parsed.shares.length > 0) {
          const diff = parsed.amount_paise - totalShares;
          parsed.shares[0].amount_paise += diff;
        }
      }
    }
    res.json({
      success: true,
      modelUsed: usedModel,
      originalTranscript: transcript,
      parsed
    });
  } catch (err) {
    console.error("[POST /api/ai/parse-expense]", err);
    res.status(500).json({
      error: err.message || "Failed to parse voice expense with Gemini AI"
    });
  }
});
var ai_default = router11;

// app.ts
var app = express();
var allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://flatmate-expense-tracker-lemon.vercel.app"
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}
var corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isVercelSubdomain = /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin);
    if (allowedOrigins.includes(origin) || isVercelSubdomain) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    return callback(new Error("Origin blocked by CORS policy"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Set-Cookie", "Authorization"],
  maxAge: 86400
};
app.use(cors(corsOptions));
app.set("trust proxy", 1);
app.use((req, res, next) => {
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (process.env.NODE_ENV === "production" && forwardedProto && forwardedProto !== "https") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production" || req.secure || forwardedProto === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(authContextMiddleware);
app.get(["/", "/api/health", "/health", "/api", "/api/"], (_req, res) => {
  res.json({
    status: "ok",
    name: "Flatmate Expense Manager API",
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET || process.env.JWT_SECRET),
    nodeEnv: process.env.NODE_ENV || "not_set",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/api/auth", auth_default);
app.use("/api/members", members_default);
app.use("/api/categories", categories_default);
app.use("/api/expenses", expenses_default);
app.use("/api/purchases", purchases_default);
app.use("/api/balances", balances_default);
app.use("/api/settlements", settlements_default);
app.use("/api/profile", profile_default);
app.use("/api/upi", profile_default);
app.use("/api/activity", activity_default);
app.use("/api/ai", ai_default);
app.use("/api/analytics", analytics_default);
app.use("/auth", auth_default);
app.use("/members", members_default);
app.use("/categories", categories_default);
app.use("/expenses", expenses_default);
app.use("/purchases", purchases_default);
app.use("/balances", balances_default);
app.use("/settlements", settlements_default);
app.use("/profile", profile_default);
app.use("/upi", profile_default);
app.use("/activity", activity_default);
app.use("/ai", ai_default);
app.use("/analytics", analytics_default);
app.use((err, _req, res, _next) => {
  console.error("[unhandled error]", err);
  const status = typeof err.status === "number" ? err.status : typeof err.statusCode === "number" ? err.statusCode : 500;
  res.status(status).json({ error: err.expose ? err.message : "Internal server error" });
});
var app_default = app;

// serverless.ts
function handler(req, res) {
  try {
    return app_default(req, res);
  } catch (err) {
    console.error("[Vercel Serverless Invocation Crash]:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      const origin = req?.headers?.origin;
      const isAllowedOrigin = Boolean(
        origin && (origin === "http://localhost:5173" || origin === "http://localhost:3000" || process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL.replace(/\/$/, "") || /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin))
      );
      const safeOrigin = isAllowedOrigin ? origin : "https://flatmate-expense-tracker-lemon.vercel.app";
      res.setHeader("Access-Control-Allow-Origin", safeOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.end(JSON.stringify({
        error: "Backend Serverless Execution Error",
        message: err?.message || String(err)
      }));
    }
  }
}
export {
  handler as default
};
