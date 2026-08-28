const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { calcServiceFeeFen, buildPriceSummary } = require('./fee')

describe('calcServiceFeeFen', () => {
  it('fixed per piece', () => {
    assert.equal(
      calcServiceFeeFen({ type: 'fixed', fixedAmountFen: 500 }, 4800, 2),
      1000
    )
  })
  it('percent with rateBps rounding', () => {
    // 10% of 999 fen = 99.9 -> 100
    assert.equal(
      calcServiceFeeFen({ type: 'percent', rateBps: 1000 }, 999, 1),
      100
    )
  })
  it('returns null when no rule', () => {
    assert.equal(calcServiceFeeFen(null, 1000, 1), null)
  })
})

describe('buildPriceSummary', () => {
  it('with rule shows total and lines', () => {
    const s = buildPriceSummary(4800, { type: 'fixed', fixedAmountFen: 500 })
    assert.equal(s.referenceFen, 4800)
    assert.equal(s.serviceFeeFen, 500)
    assert.equal(s.totalFen, 5300)
    assert.equal(s.askServiceFee, false)
    assert.match(s.mainText, /约 ¥53\.00/)
  })
  it('without rule asks客服', () => {
    const s = buildPriceSummary(4800, null)
    assert.equal(s.serviceFeeFen, null)
    assert.equal(s.totalFen, 4800)
    assert.equal(s.askServiceFee, true)
    assert.equal(s.subText, '服务费详询客服')
  })
})
