<template>
  <div>
    <div class="toolbar">
      <h3>询价单</h3>
      <el-select v-model="status" clearable placeholder="全部状态" style="width: 160px" @change="load">
        <el-option label="新询价" value="new" />
        <el-option label="已沟通" value="contacted" />
        <el-option label="已成交" value="won" />
        <el-option label="已关闭" value="closed" />
      </el-select>
    </div>
    <el-table :data="list" v-loading="loading">
      <el-table-column label="商品">
        <template #default="{ row }">
          {{ row.snapshot?.name || row.productId }}
        </template>
      </el-table-column>
      <el-table-column prop="contactName" label="联系人" width="100" />
      <el-table-column prop="phone" label="手机" width="130" />
      <el-table-column prop="qty" label="数量" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ statusText(row.status) }}</template>
      </el-table-column>
      <el-table-column label="时间" width="180">
        <template #default="{ row }">
          {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">处理</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="visible" title="处理询价" width="480px">
      <el-form label-width="90px">
        <el-form-item label="状态">
          <el-select v-model="edit.status">
            <el-option label="新询价" value="new" />
            <el-option label="已沟通" value="contacted" />
            <el-option label="已成交" value="won" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item label="内部备注">
          <el-input v-model="edit.adminRemark" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="用户备注">
          <div>{{ edit.remark || '-' }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../api/admin'

const STATUS_MAP = {
  new: '新询价',
  contacted: '已沟通',
  won: '已成交',
  closed: '已关闭'
}

const list = ref([])
const loading = ref(false)
const status = ref('')
const visible = ref(false)
const saving = ref(false)
const edit = reactive({
  id: '',
  status: 'new',
  adminRemark: '',
  remark: ''
})

function statusText(s) {
  return STATUS_MAP[s] || s
}

async function load() {
  loading.value = true
  try {
    const data = await adminApi.listLeads({
      status: status.value || undefined,
      page: 1,
      pageSize: 50
    })
    list.value = data.list || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function openEdit(row) {
  edit.id = row._id
  edit.status = row.status
  edit.adminRemark = row.adminRemark || ''
  edit.remark = row.remark || ''
  visible.value = true
}

async function save() {
  saving.value = true
  try {
    await adminApi.updateLeadStatus({
      id: edit.id,
      status: edit.status,
      adminRemark: edit.adminRemark
    })
    visible.value = false
    ElMessage.success('已更新')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
h3 {
  margin: 0;
}
</style>
