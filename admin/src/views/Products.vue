<template>
  <div>
    <div class="toolbar">
      <h3>商品管理</h3>
      <div class="right">
        <el-select
          v-model="categoryId"
          clearable
          placeholder="全部品类"
          style="width: 180px"
          @change="load"
        >
          <el-option
            v-for="c in categories"
            :key="c._id"
            :label="c.name"
            :value="c._id"
          />
        </el-select>
        <el-button type="primary" @click="$router.push('/products/edit')">新建商品</el-button>
      </div>
    </div>
    <el-table :data="list" v-loading="loading">
      <el-table-column prop="name" label="名称" />
      <el-table-column label="参考价" width="120">
        <template #default="{ row }">
          ¥{{ ((row.referencePriceFen || 0) / 100).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column label="上架" width="80">
        <template #default="{ row }">
          <el-tag :type="row.onSale ? 'success' : 'info'">{{ row.onSale ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="推荐" width="80">
        <template #default="{ row }">
          {{ row.isRecommended ? '是' : '否' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="$router.push(`/products/edit/${row._id}`)">
            编辑
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../api/admin'

const categories = ref([])
const categoryId = ref('')
const list = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await adminApi.listProducts({
      categoryId: categoryId.value || undefined,
      page: 1,
      pageSize: 100
    })
    list.value = data.list || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const data = await adminApi.listCategories()
    categories.value = data.list || []
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
