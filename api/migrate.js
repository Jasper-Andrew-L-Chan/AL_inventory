'use strict';
const L = require('./_lib');

/**
 * POST /api/migrate  (Owner / Administrator only)
 * One-time import of the old per-PC database (data/pharmacy_db.json from the
 * pharmacy PC) into the central database. Safe to re-run: records are matched
 * by id, so nothing is duplicated and existing stock levels are never reset.
 */
const arr = v => (Array.isArray(v) ? v : (v && typeof v === 'object' ? [v] : []));

async function runChunks(cmds, size = 250) {
  for (let i = 0; i < cmds.length; i += size) {
    await L.rpipeline(cmds.slice(i, i + size));
  }
}

module.exports = L.handler(async (req, res) => {
  if (req.method !== 'POST') return L.send(res, 405, { error: 'Method not allowed' });
  const me = await L.authUser(req, res);
  if (!me) return;

  const body = L.readBody(req);
  const seedVersion = body.seedVersion ? String(body.seedVersion) : '';
  if (!L.isAdminUser(me) && !seedVersion) {
    return L.send(res, 403, { error: 'Only an Owner or Administrator can import data.' });
  }

  if (seedVersion && !body.forceSeed) {
    const curSeedVer = await L.rcmd('HGET', L.K.meta, 'seedVer');
    if (curSeedVer === seedVersion) {
      return L.send(res, 200, { ok: true, alreadySeeded: true, seedVer: curSeedVer });
    }
  }

  const items = arr(body.items).filter(i => i && typeof i.id === 'string');
  const txns = arr(body.transactions).filter(t => t && typeof t.id === 'string');
  const oldUsers = arr(body.users).filter(u => u && u.username && u.password);
  const overwriteUsers = body.overwriteUsers !== false;
  const replaceItems = body.replaceItems === true;
  const summary = { items: items.length, transactions: txns.length, users: 0, skippedUsers: 0 };

  if (replaceItems && items.length > 0) {
    await L.rpipeline([['DEL', L.K.items], ['DEL', L.K.stock]]);
    for (let i = 0; i < items.length; i += 100) {
      const slice = items.slice(i, i + 100);
      const itemArgs = ['HSET', L.K.items];
      const stockArgs = ['HSET', L.K.stock];
      slice.forEach((it, idx) => {
        const withOrd = { ...it };
        if (!withOrd._ord) withOrd._ord = items.length - (i + idx);
        const { rest, stock } = L.splitItem(withOrd);
        itemArgs.push(rest.id, JSON.stringify(rest));
        stockArgs.push(
          rest.id + '|b', String(stock.beginningStock),
          rest.id + '|a', String(stock.addedStock),
          rest.id + '|d', String(stock.deductedStock),
          rest.id + '|c', String(stock.currentStock)
        );
      });
      await L.rpipeline([itemArgs, stockArgs]);
    }
  } else {
    // Items (+ stock; existing server stock is never overwritten)
    const itemCmds = [];
    items.forEach((it, idx) => {
      const withOrd = { ...it };
      if (!withOrd._ord) withOrd._ord = items.length - idx;
      const { rest, stock } = L.splitItem(withOrd);
      itemCmds.push(['HSET', L.K.items, rest.id, JSON.stringify(rest)]);
      L.stockCmds(rest.id, stock, 'init').forEach(c => itemCmds.push(c));
    });
    await runChunks(itemCmds);
  }

  // Transactions + receipt numbers
  let maxReceipt = 0;
  const txnCmds = [];
  txns.forEach((t, idx) => {
    const withOrd = { ...t };
    if (!withOrd._ord) withOrd._ord = txns.length - idx;
    txnCmds.push(['HSET', L.K.txns, withOrd.id, JSON.stringify(withOrd)]);
    if (withOrd.receiptNo) {
      txnCmds.push(['SADD', L.K.receipts, String(withOrd.receiptNo)]);
      const m = /(\d+)\s*$/.exec(String(withOrd.receiptNo));
      if (m) maxReceipt = Math.max(maxReceipt, Number(m[1]));
    }
  });
  await runChunks(txnCmds);
  if (maxReceipt > 0) {
    const cur = Number(await L.rcmd('GET', L.K.rcptCounter)) || 0;
    if (maxReceipt > cur) await L.rcmd('SET', L.K.rcptCounter, maxReceipt);
  }

  // Settings / drawer only when the central DB has none yet
  if (body.settings && typeof body.settings === 'object') {
    await L.rcmd('SET', L.K.settings, JSON.stringify(body.settings), 'NX');
  }
  if (body.drawer && typeof body.drawer === 'object') {
    await L.rcmd('SET', L.K.drawer, JSON.stringify(body.drawer), 'NX');
  }

  // Users: passwords are hashed on the way in; plain text is never stored.
  const existing = await L.getAllUsers();
  for (const u of oldUsers) {
    const username = String(u.username).toLowerCase().trim();
    const found = existing.find(x => x.username === username);
    if (found && !overwriteUsers) {
      summary.skippedUsers++;
      continue;
    }
    const rec = L.newUserRecord({ ...u, username, id: found ? found.id : (u.id || undefined) });
    if (found) {
      // keep the existing account id so current sessions stay valid
      rec.id = found.id;
    }
    await L.rpipeline([['HSET', L.K.users, rec.id, JSON.stringify(rec)]]);
    summary.users++;
  }

  // Treat the imported stock figures as belonging to the current shift (no surprise reset).
  const metaCmds = [['HSETNX', L.K.meta, 'shift', L.currentShiftId()]];
  if (seedVersion) {
    metaCmds.push(['HSET', L.K.meta, 'seedVer', seedVersion]);
  }
  metaCmds.push(L.bumpCmd());
  await L.rpipeline(metaCmds);

  L.send(res, 200, { ok: true, summary, seedVer: seedVersion || undefined });
});
