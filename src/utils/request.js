/**
 * axios封装
 * 请求拦截、响应拦截、错误统一处理
 */
import axios from 'axios'
import store from '@/store'
import config from '@/assets/scripts/config'
import { Message } from 'element-ui'
import { getToken } from '@/utils/auth'

const { BASE_URL, TIMEOUT, THROTTLE_TIME } = config

const service = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? BASE_URL.PRO : BASE_URL.DEV, // 测试环境用dev 生产环境用pro
  withCredentials: true, // 跨域请求时发送cookies
  timeout: TIMEOUT // 请求超时
})

// 节流计时器
let throttleTimer = null

service.interceptors.request.use(
  request => {
    request.headers['Content-Type'] = 'application/json;charset=UTF-8' // 'application/x-www-form-urlencoded'

    if (store.getters.token) {
      request.headers['token'] = getToken()
    }

    // 频繁请求拦截
    if (request.isThrottle) {
      if (throttleTimer) {
        return Promise.reject({
          data: { msg: '请勿频繁操作～' }
        })
      } else {
        throttleTimer = setTimeout(() => {
          throttleTimer && clearTimeout(throttleTimer)
          throttleTimer = null
        }, THROTTLE_TIME)
      }
    }

    return request
  },
  error => {
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  response => {
    const res = response.data
    // 错误处理
    if (res.code !== '0000') {
      if (res.code === '4003') {
        store.dispatch('user/logout').then(() => {
          location.reload()
        })
      } else {
        Message({
          message: res.msg || 'Error',
          type: 'error',
          duration: 3e3
        })
      }
      return Promise.reject(new Error(res.msg || 'Error'))
    } else {
      return res
    }
  },
  error => {
    if (error && error.request && error.request.status === 200) {
      Message({
        message: '数据请求异常，请稍后再试！',
        type: 'error',
        duration: 3e3
      })
    } else {
      Message({
        message: error.message,
        type: 'error',
        duration: 3e3
      })
    }
    return Promise.reject(error)
  }
)

export default service
