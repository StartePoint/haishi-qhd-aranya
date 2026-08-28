<template>
  <div v-loading="loading">
    <div class="toolbar">
      <h3>{{ id ? '编辑商品' : '新建商品' }}</h3>
      <el-button @click="$router.back()">返回</el-button>
    </div>
    <el-form label-width="120px" style="max-width: 720px">
      <el-form-item label="名称" required>
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="种类" required>
        <el-select v-model="form.subCategoryId" filterable style="width: 100%">
          <el-option-group
            v-for="g in subGroups"
            :key="g.categoryId"
            :label="g.categoryName"
          >
            <el-option
              v-for="s in g.subs"
              :key="s._id"
              :label="s.name"
              :value="s._id"
            />
          </el-option-group>
        </el-select>
      </el-form-item>
      <el-form-item label="封面图 URL">
        <el-input v-model="form.cover" placeholder="云存储 fileID 或 https 地址" />
      </el-form-item>
      <el-form-item label="规格说明">
        <el-input v-model="form.specText" />
      </el-form-item>
      <el-form-item label="详情 HTML">
        <el-input v-model="form.detailHtml" type="textarea" :rows="4" />
      </el-form-item>
      <el-form-item label="参考价（元）" required>
        <el-input-number v-model="form.priceYuan" :min="0" :precision="2" :step="1" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
      <el-form-item label="上架">
        <el-switch v-model="form.onSale" />
      </el-form-item>
      <el-form-item label="本期推荐">
        <el-switch v-model="form.isRecommended" />
      </el-form-item>
      <el-divider>代购费用</el-divider>
      <el-form-item label="费用来源">
        <el-radio-group v-model="feeMode">
          <el-radio-button value="inherit">继承品类</el-radio-button>
          <el-radio-button value="override">商品覆盖</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <template v-if="feeMode === 'override'">
        <el-form-item label="类型">
          <el-radio-group v-model="feeRule.type">
            <el-radio value="fixed">按件固定</el-radio>
            <el-radio value="percent">按比例</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="feeRule.type === 'fixed'" label="每件（元）">
          <el-input-number v-model="feeRule.fixedYuan" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item v-else label="比例（%）">
          <el-input-number v-model="feeRule.percent" :min="0" :precision="2" />
        </el-form-item>
      </template>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminApi } from '../api/admin'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id || '')
const loading = ref(false)
const saving = ref(false)
const categories = ref([])
const allSubs = ref([])
const feeMode = ref('inherit')
const form = reactive({
  name: '',
  subCategoryId: '',
  cover: '',
  specText: '',
  detailHtml: '',
  priceYuan: 0,
  sort: 0,
  onSale: true,
  isRecommended: false
})
const feeRule = reactive({
  type: 'fixed',
  fixedYuan: 5,
  percent: 10
})

const subGroups = computed(() =>
  categories.value.map((c) => ({
    categoryId: c._id,
    categoryName: c.name,
    subs: allSubs.value.filter((s) => s.categoryId === c._id)
  }))
)

async function loadMeta() {
  const catData = await adminApi.listCategories()
  categories.value = catData.list || []
  const subs = []
  for (const c of categories.value) {
    const data = await adminApi.listSubCategories(c._id)
    subs.push(...(data.list || []))
  }
  allSubs.value = subs
}

async function loadProduct() {
  if (!id.value) return
  const data = await adminApi.getProduct(id.value)
  const p = data.product
  form.name = p.name
  form.subCategoryId = p.subCategoryId
  form.cover = p.cover || ''
  form.specText = p.specText || ''
  form.detailHtml = p.detailHtml || ''
  form.priceYuan = (p.referencePriceFen || 0) / 100
  form.sort = p.sort || 0
  form.onSale = !!p.onSale
  form.isRecommended = !!p.isRecommended
  if (data.productFeeRule) {
    feeMode.value = 'override'
    feeRule.type = data.productFeeRule.type
    feeRule.fixedYuan = (data.productFeeRule.fixedAmountFen || 0) / 100
    feeRule.percent = (data.productFeeRule.rateBps || 0) / 100
  } else {
    feeMode.value = 'inherit'
  }
}

async function save() {
  saving.value = true
  try {
    const payload = {
      id: id.value || undefined,
      name: form.name,
      subCategoryId: form.subCategoryId,
      cover: form.cover,
      gallery: form.cover ? [form.cover] : [],
      specText: form.specText,
      detailHtml: form.detailHtml,
      referencePriceFen: Math.round(form.priceYuan * 100),
      sort: form.sort,
      onSale: form.onSale,
      isRecommended: form.isRecommended,
      feeRule:
        feeMode.value === 'inherit'
          ? null
          : {
              type: feeRule.type,
              fixedAmountFen: Math.round(feeRule.fixedYuan * 100),
              rateBps: Math.round(feeRule.percent * 100)
            }
    }
    await adminApi.saveProduct(payload)
    ElMessage.success('已保存')
    router.push('/products')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await loadMeta()
    await loadProduct()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
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
h3 {
  margin: 0;
}
</style>
