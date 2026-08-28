<template>
  <div>
    <div class="toolbar">
      <h3>品类管理</h3>
      <el-button type="primary" @click="openEdit()">新建品类</el-button>
    </div>
    <el-table :data="list" v-loading="loading">
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="sort" label="排序" width="100" />
      <el-table-column label="启用" width="120">
        <template #default="{ row }">
          <el-switch
            :model-value="row.enabled"
            @change="(v) => toggle(row, v)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="visible" :title="form.id ? '编辑品类' : '新建品类'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
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

const list = ref([])
const loading = ref(false)
const visible = ref(false)
const saving = ref(false)
const form = reactive({ id: '', name: '', sort: 0, enabled: true })

async function load() {
  loading.value = true
  try {
    const data = await adminApi.listCategories()
    list.value = data.list || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function openEdit(row) {
  form.id = row?._id || ''
  form.name = row?.name || ''
  form.sort = row?.sort || 0
  form.enabled = row?.enabled !== false
  visible.value = true
}

async function save() {
  saving.value = true
  try {
    await adminApi.saveCategory({ ...form })
    visible.value = false
    ElMessage.success('已保存')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

async function toggle(row, enabled) {
  try {
    await adminApi.setCategoryEnabled(row._id, enabled)
    row.enabled = enabled
  } catch (e) {
    ElMessage.error(e.message)
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
