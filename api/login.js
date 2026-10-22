'use strict';
const L = require('./_lib');

const MAX_FAILS = 8;
const LOCK_SECONDS = 600;

module.exports = L.handler(async (req, res) => {
  await L.ensureSeed();

  // Public: list of active usernames so the login page can show the "tap your name" pills.
  // No passwords or other details are ever returned.
  if (req.method === 'GET') {
    const users = await L.getAllUsers();
    return L.send(res, 200, {
      users: users
        .filter(L.isActive)
        .map(u => ({ username: u.username, fullName: u.fullName, role: u.role }))
        .sort((a, b) => a.username.localeCompare(b.username))
    });
  }

  if (req.method !== 'POST') return L.send(res, 405, { error: 'Method not allowed' });

  const body = L.readBody(req);
  const username = String(body.username || '').toLowerCase().trim();
  const password = String(body.password || '');
  if (!username || !password) return L.send(res, 400, { error: 'Username and password are required.' });

  const failKey = 'al:fail:' + username;
  const fails = Number(await L.rcmd('GET', failKey)) || 0;
  if (fails >= MAX_FAILS) {
    return L.send(res, 429, { error: 'Too many failed attempts. Please wait a few minutes and try again.' });
  }

  const users = await L.getAllUsers();
  const user = users.find(u => u.username === username);
  const ok = user && L.isActive(user) && L.verifyPassword(password, user.passHash);
  if (!ok) {
    await L.rpipeline([['INCR', failKey], ['EXPIRE', failKey, LOCK_SECONDS]]);
    return L.send(res, 401, { error: 'Invalid username or password.' });
  }

  await L.rcmd('DEL', failKey);
  L.send(res, 200, { token: L.signToken(user.id), user: L.sanitizeUser(user) });
});
