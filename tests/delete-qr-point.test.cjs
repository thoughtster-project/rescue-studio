const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(
  readFileSync(resolve(__dirname, '../lib/delete-qr-point.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const context = { exports: {} };
runInNewContext(compiled, context);
const { deleteQRPoint } = context.exports;
const foreignKey = { data: null, error: { code: '23503', message: 'incidents_qr_point_id_fkey' } };
const success = { data: [{ id: 'target' }], error: null };

function mock(results, detachError = null) {
  const operations = [];
  return {
    operations,
    from(table) {
      return {
        delete() {
          assert.equal(table, 'qr_points');
          return { eq(column, id) {
            assert.equal(column, 'id');
            assert.equal(id, 'target');
            operations.push('delete');
            return { select(columns) {
              assert.equal(columns, 'id');
              return Promise.resolve(results.shift());
            } };
          } };
        },
        update(values) {
          assert.equal(table, 'incidents');
          assert.equal(JSON.stringify(values), '{"qr_point_id":null}');
          return { eq(column, id) {
            assert.equal(column, 'qr_point_id');
            assert.equal(id, 'target');
            operations.push('detach');
            return Promise.resolve({ error: detachError });
          } };
        },
      };
    },
  };
}

test('deletes an unused point without updating history', async () => {
  const client = mock([success]);
  await deleteQRPoint(client, 'target');
  assert.deepEqual(client.operations, ['delete']);
});

test('detaches history only for the known FK, then verifies deletion', async () => {
  const client = mock([foreignKey, success]);
  await deleteQRPoint(client, 'target');
  assert.deepEqual(client.operations, ['delete', 'detach', 'delete']);
});

test('does not report success for RLS zero-row deletion', async () => {
  await assert.rejects(deleteQRPoint(mock([{ data: [], error: null }]), 'target'), /ไม่ได้ยืนยัน/);
});

test('stops when history cannot be detached', async () => {
  const client = mock([foreignKey], { message: 'permission denied' });
  await assert.rejects(deleteQRPoint(client, 'target'), /permission denied/);
  assert.deepEqual(client.operations, ['delete', 'detach']);
});

test('keeps the point visible if references remain or arrive during deletion', async () => {
  await assert.rejects(deleteQRPoint(mock([foreignKey, foreignKey]), 'target'), /ยังมีประวัติ/);
});

test('never detaches history for an unrelated foreign key', async () => {
  const client = mock([{ error: { code: '23503', message: 'other_reference' } }]);
  await assert.rejects(deleteQRPoint(client, 'target'), /ข้อมูลอื่น/);
  assert.deepEqual(client.operations, ['delete']);
});
