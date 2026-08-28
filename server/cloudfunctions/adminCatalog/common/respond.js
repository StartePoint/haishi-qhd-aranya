function ok(data) {
  return { ok: true, data }
}
function fail(code, message) {
  return { ok: false, code, message }
}
module.exports = { ok, fail }
