<template>
  <div v-loading="loading">
    <div class="toolbar">
      <h3>系统配置</h3>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </div>
    <el-form label-width="140px" style="max-width: 720px">
      <el-form-item label="公告标题">
        <el-input v-model="form.announcementTitle" />
      </el-form-item>
      <el-form-item label="公告内容">
        <el-input v-model="form.announcementContent" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="下次采购日">
        <el-input v-model="form.nextPurchaseDate" placeholder="如 2026-09-05" />
      </el-form-item>
      <el-form-item label="截单说明">
        <el-input v-model="form.cutoffText" />
      </el-form-item>
      <el-form-item label="客服微信">
        <el-input v-model="form.customerWechat" />
      </el-form-item>
      <el-form-item label="企微链接">
        <el-input v-model="form.customerWorkWechatUrl" />
      </el-form-item>
      <el-form-item label="代购须知">
        <el-input v-model="form.guideText" type="textarea" :rows="4" />
      </el-form-item>
      <el-form-item label="关于我们">
        <el-input v-model="form.aboutText" type="textarea" :rows="4" />
      </el-form-item>
      <el-form-item label="运费说明">
        <el-input v-model="form.shippingNote" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="留资成功提示">
        <el-input v-model="form.leadSuccessText" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../api/admin'

const loading = ref(false)
const saving = ref(false)
const form = reactive({
  announcementTitle: '',
  announcementContent: '',
  nextPurchaseDate: '',
  cutoffText: '',
  customerWechat: '',
  customerWorkWechatUrl: '',
  guideText: '',
  aboutText: '',
  shippingNote: '',
  leadSuccessText: '将在 24 小时内联系您'
})

async function load() {
  loading.value = true
  try {
    const data = await adminApi.getConfigs()
    Object.assign(form, data.configs || {})
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await adminApi.setConfigs({ ...form })
    ElMessage.success('已保存')
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
