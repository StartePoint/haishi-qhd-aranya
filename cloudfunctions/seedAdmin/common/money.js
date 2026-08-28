function fenToYuanText(fen) {
  const n = Number(fen) || 0
  return (n / 100).toFixed(2)
}

module.exports = { fenToYuanText }
