const { fenToYuanText } = require('./money')

function calcServiceFeeFen(rule, referencePriceFen, qty) {
  if (!rule || !rule.type) return null
  const q = Math.max(1, Number(qty) || 1)
  const ref = Number(referencePriceFen) || 0
  if (rule.type === 'fixed') {
    return (Number(rule.fixedAmountFen) || 0) * q
  }
  if (rule.type === 'percent') {
    const rateBps = Number(rule.rateBps) || 0
    return Math.round((ref * rateBps) / 10000) * q
  }
  return null
}

function ruleLabel(rule) {
  if (!rule) return '详询客服'
  if (rule.type === 'fixed') {
    return `代购服务费 ¥${fenToYuanText(rule.fixedAmountFen)}/件`
  }
  if (rule.type === 'percent') {
    const pct = ((Number(rule.rateBps) || 0) / 100).toFixed(2)
    return `代购服务费 ${pct}%`
  }
  return '详询客服'
}

/** 列表/详情均按 qty=1 */
function buildPriceSummary(referencePriceFen, rule) {
  const referenceFen = Number(referencePriceFen) || 0
  const serviceFeeFen = calcServiceFeeFen(rule, referenceFen, 1)
  if (serviceFeeFen === null) {
    return {
      referenceFen,
      serviceFeeFen: null,
      totalFen: referenceFen,
      askServiceFee: true,
      mainText: `约 ¥${fenToYuanText(referenceFen)}`,
      subText: '服务费详询客服',
      ruleLabel: '详询客服'
    }
  }
  const totalFen = referenceFen + serviceFeeFen
  return {
    referenceFen,
    serviceFeeFen,
    totalFen,
    askServiceFee: false,
    mainText: `约 ¥${fenToYuanText(totalFen)}`,
    subText: `参考价 ¥${fenToYuanText(referenceFen)} · 服务费 ¥${fenToYuanText(serviceFeeFen)}`,
    ruleLabel: ruleLabel(rule)
  }
}

function resolveRule(productRule, categoryRule) {
  return productRule || categoryRule || null
}

module.exports = {
  calcServiceFeeFen,
  buildPriceSummary,
  resolveRule,
  ruleLabel
}
