import request from './request'

// 获取客户分页列表，支持按名称搜索
export const getCustomers = params => request.get('/customers', { params })

// 新建客户
export const createCustomer = data => request.post('/customers', data)

// 更新客户信息
export const updateCustomer = (id, data) => request.put(`/customers/${id}`, data)

// 软删除客户
export const deleteCustomer = id => request.delete(`/customers/${id}`)

// 查询该客户对指定商品的最近一次成交价
export const getLastPrice = (customerId, productId) =>
  request.get(`/customers/${customerId}/last-price`, { params: { productId } })

// 查询客户历史出库单及总消费额
export const getCustomerOrders = id => request.get(`/customers/${id}/orders`)