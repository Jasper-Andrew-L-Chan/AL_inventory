'use strict';
const L = require('./_lib');

/**
 * POST /api/mutate   { ops: [ ... ] }
 *
 * Every change made on any PC is sent here as small, per-record operations —
 * never a whole-database overwrite — so two pharmacists working at the same
 * time cannot erase each other's work:
 *   - stock changes are atomic increments (HINCRBYFLOAT), not "set" values
 *   - each stock/receipt operation carries a unique opId, so a retried
 *     request after a network drop is applied only once
 *   - receipt numbers are reserved centrally, so they can never duplicate
 */

const MAX_OPS = 200;

const PERMS = {
  'item.put': ['inventory'],
  'item.del': ['inventory'],
  'item.delMany': ['inventory'],
  'item.clear': ['inventory'],
  'stock.set': ['inventory'],
  'stock.adj': ['inventory', 'transactions'],
  'txn.add': ['transactions'],
  'txn.put': ['transactions'],
  'txn.del': ['transactions'],
  'settings.put': ['settings'],
  'drawer.put': ['cashdrawer']
};

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isId = v => typeof v === 'string' && v.length > 0 && v.length < 200 && !v.includes('|');

async function firstTime(opId) {
  if (!opId) return true;
  const r = await L.rcmd('SET', 'al:op:' + String(opId), '1', 'NX', 'EX', '172800');
  return r === 'OK';
}

async function reserveReceipt(txnId, wanted) {
  const existing = await L.rcmd('GET', 'al:rcptfor:' + txnId);
  if (existing) return existing;
  let rn = String(wanted || '').trim();
  if (!rn) rn = 'IO-' + (await L.rcmd('INCR', L.K.rcptCounter));
  for (let i = 0; i < 100; i++) {
    const added = await L.rcmd('SADD', L.K.receipts, rn);
    if (Number(added) === 1) break;
    rn = 'IO-' + (await L.rcmd('INCR', L.K.rcptCounter));
  }
  await L.rcmd('SET', 'al:rcptfor:' + txnId, rn, 'EX', '604800');
  return rn;
}

async function applyOp(op, user) {
  const type = op && op.type;
  const need = PERMS[type];
  if (!need) return { ok: false, error: 'Unknown operation' };
  if (!L.hasPerm(user, need)) return { ok: false, error: 'You do not have permission for this action.' };

  switch (type) {
    case 'item.put': {
      if (!isObj(op.item) || !isId(op.item.id)) return { ok: false, error: 'Invalid item' };
      const { rest, stock } = L.splitItem(op.item);
      const cmds = [['HSET', L.K.items, rest.id, JSON.stringify(rest)]];
      if (op.stockMode === 'init' || op.stockMode === 'set') {
        L.stockCmds(rest.id, stock, op.stockMode).forEach(c => cmds.push(c));
      }
      cmds.push(L.bumpCmd());
      await L.rpipeline(cmds);
      return { ok: true };
    }

    case 'item.del': {
      if (!isId(op.id)) return { ok: false, error: 'Invalid id' };
      await L.rpipeline([
        ['HDEL', L.K.items, op.id],
        ['HDEL', L.K.stock, op.id + '|b', op.id + '|a', op.id + '|d', op.id + '|c'],
        L.bumpCmd()
      ]);
      return { ok: true };
    }

    case 'item.delMany': {
      const ids = (Array.isArray(op.ids) ? op.ids : []).filter(isId);
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const fields = [];
        chunk.forEach(id => fields.push(id + '|b', id + '|a', id + '|d', id + '|c'));
        await L.rpipeline([['HDEL', L.K.items, ...chunk], ['HDEL', L.K.stock, ...fields]]);
      }
      await L.rpipeline([L.bumpCmd()]);
      return { ok: true };
    }

    case 'item.clear': {
      await L.rpipeline([['DEL', L.K.items], ['DEL', L.K.stock], L.bumpCmd()]);
      return { ok: true };
    }

    case 'stock.set': {
      if (!isId(op.id)) return { ok: false, error: 'Invalid id' };
      const cur = Number(op.current);
      if (!Number.isFinite(cur) || cur < 0) return { ok: false, error: 'Invalid quantity' };
      if (!Number(await L.rcmd('HEXISTS', L.K.items, op.id))) return { ok: true, skipped: true };
      await L.rpipeline([['HSET', L.K.stock, op.id + '|c', cur], L.bumpCmd()]);
      return { ok: true };
    }

    case 'stock.adj': {
      const d = Number(op.delta);
      if (!isId(op.id) || !Number.isFinite(d) || d === 0) return { ok: false, error: 'Invalid adjustment' };
      if (!(await firstTime(op.opId))) return { ok: true, duplicate: true };
      if (!Number(await L.rcmd('HEXISTS', L.K.items, op.id))) return { ok: true, skipped: true };

      const id = op.id;
      const isReturn = !!op.isReturn;
      const cmds = [['HINCRBYFLOAT', L.K.stock, id + '|c', d]];
      if (d > 0) {
        if (isReturn) cmds.push(['HINCRBYFLOAT', L.K.stock, id + '|d', -d]);
        else cmds.push(['HINCRBYFLOAT', L.K.stock, id + '|a', d]);
      } else {
        cmds.push(['HINCRBYFLOAT', L.K.stock, id + '|d', Math.abs(d)]);
      }
      cmds.push(L.bumpCmd());
      const r = await L.rpipeline(cmds);

      // Stock can never go below zero; deducted can never go below zero on returns.
      const fix = [];
      const cur = Number(r[0]);
      if (cur < 0) fix.push(['HINCRBYFLOAT', L.K.stock, id + '|c', -cur]);
      if (d > 0 && isReturn && Number(r[1]) < 0) fix.push(['HINCRBYFLOAT', L.K.stock, id + '|d', -Number(r[1])]);
      if (fix.length) await L.rpipeline(fix);
      return { ok: true };
    }

    case 'txn.add': {
      const t = op.txn;
      if (!isObj(t) || !isId(t.id)) return { ok: false, error: 'Invalid transaction' };
      const receiptNo = await reserveReceipt(t.id, t.receiptNo);
      const stored = { ...t, receiptNo };
      await L.rpipeline([['HSET', L.K.txns, t.id, JSON.stringify(stored)], L.bumpCmd()]);
      return { ok: true, receiptNo };
    }

    case 'txn.put': {
      const t = op.txn;
      if (!isObj(t) || !isId(t.id)) return { ok: false, error: 'Invalid transaction' };
      const cmds = [['HSET', L.K.txns, t.id, JSON.stringify(t)]];
      if (t.receiptNo) cmds.push(['SADD', L.K.receipts, String(t.receiptNo)]);
      cmds.push(L.bumpCmd());
      await L.rpipeline(cmds);
      return { ok: true };
    }

    case 'txn.del': {
      if (!isId(op.id)) return { ok: false, error: 'Invalid id' };
      await L.rpipeline([['HDEL', L.K.txns, op.id], L.bumpCmd()]);
      return { ok: true };
    }

    case 'settings.put': {
      if (!isObj(op.settings)) return { ok: false, error: 'Invalid settings' };
      await L.rpipeline([['SET', L.K.settings, JSON.stringify(op.settings)], L.bumpCmd()]);
      return { ok: true };
    }

    case 'drawer.put': {
      if (!isObj(op.drawer)) return { ok: false, error: 'Invalid drawer' };
      await L.rpipeline([['SET', L.K.drawer, JSON.stringify(op.drawer)], L.bumpCmd()]);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Unknown operation' };
}

module.exports = L.handler(async (req, res) => {
  if (req.method !== 'POST') return L.send(res, 405, { error: 'Method not allowed' });
  const user = await L.authUser(req, res);
  if (!user) return;

  const body = L.readBody(req);
  const ops = Array.isArray(body.ops) ? body.ops : [];
  if (ops.length === 0) return L.send(res, 200, { ok: true, results: [] });
  if (ops.length > MAX_OPS) return L.send(res, 400, { error: 'Too many operations in one request.' });

  const results = [];
  for (const op of ops) {
    results.push(await applyOp(op, user));
  }
  L.send(res, 200, { ok: true, results });
});
