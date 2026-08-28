<template>
  <div>
    <div class="toolbar">
      <h3>种类管理</h3>
      <div class="right">
        <el-select v-model="categoryId" placeholder="选择品类" style="width: 200px" @change="load">
          <el-option
            v-for="c in categories"
            :key="c._id"
            :label="c.name"
            :value="c._id"
          />
        </el-select>
        <el-button type="primary" :disabled="!categoryId" @click="openEdit()">新建种类</el-button>
      </div>
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

    <el-dialog v-model="visible" :title="form.id ? '编辑种类' : '新建种类'" width="420px">
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

const categories = ref([])
const categoryId = ref('')
const list = ref([])
const loading = ref(false)
const visible = ref(false)
const saving = ref(false)
const form = reactive({ id: '', name: '', sort: 0, enabled: true })

async function loadCategories() {
  const data = await adminApi.listCategories()
  categories.value = data.list || []
  if (!categoryId.value && categories.value[0]) {
    categoryId.value = categories.value[0]._id
  }
}

async function load() {
  if (!categoryId.value) return
  loading.value = true
  try {
    const data = await adminApi.listSubCategories(categoryId.value)
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
    await adminApi.saveSubCategory({
      ...form,
      categoryId: categoryId.value
    })
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
    await adminApi.setSubCategoryEnabled(row._id, enabled)
    row.enabled = enabled
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(async () => {
  try {
    await loadCategories()
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  }
})
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.right {
  display: flex;
  gap: 12px;
}
h3 {
  margin: 0;
}
</style>
