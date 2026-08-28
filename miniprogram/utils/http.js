const { baseUrl } = require('./config')

function request(path, { method = 'GET', data, auth = false } = {}) {
  const header = { 'content-type': 'application/json' }
  if (auth) {
    const token = wx.getStorageSync('token')
    if (token) header.Authorization = `Bearer ${token}`
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + path,
      method,
      data,
      header,
      success(res) {
        const body = res.data
        if (!body || body.code !== 0) {
          reject(new Error((body && body.message) || '请求失败'))
          return
        }
        resolve(body.data)
      },
      fail: reject
    })
  })
}

module.exports = { request }
