function call(name, data = {}) {
  return wx.cloud.callFunction({ name, data }).then((res) => {
    const body = res.result
    if (!body || body.ok !== true) {
      const err = new Error((body && body.message) || '请求失败')
      err.code = body && body.code
      throw err
    }
    return body.data
  })
}

module.exports = { call }
