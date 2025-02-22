<template>
    <div>
      <n-layout style="height: 100vh;">
        <n-layout-content style="margin-top: 30px; margin-left: 30px; margin-right: 10px">
          <n-spin :show="loadingRef">
            <n-grid :cols="4" x-gap="12" y-gap="12">
              <n-gi v-for="item in data" :key="item.id">
                <n-card hoverable class="card" :title="item.name">
                  {{ item.description }}
                  <template #footer>
                    <n-flex justify="flex-start" style="margin-left: 0">
                      <n-button tertiary style="margin-right: 5px;">详细</n-button>
                      <n-button size="medium" tertiary @click="handleClickSetting(item)">配置</n-button>
                    </n-flex>
                  </template>
                </n-card>
              </n-gi>
            </n-grid>
          </n-spin>
        </n-layout-content>
      </n-layout>
  
      <n-drawer v-model:show="active" :width="502" placement="right">
        <n-drawer-content title="修改配置" closable>
          <div v-for="(value, key) in config" :key="key" style="margin-bottom: 10px;">
            <span style="display: inline-block; width: 80px;">{{ key }}</span>
            <template v-if="typeof value === 'boolean'">
              <n-switch v-model:value="config[key]" />
            </template>
            <template v-else-if="typeof value === 'string'">
              <n-input v-model:value="config[key]" :placeholder="config[key]" />
            </template>
          </div>
          <template #footer>
            <n-button type="primary" :loading="Setloading" @click="saveConfig">
              提交
            </n-button>
          </template>
        </n-drawer-content>
      </n-drawer>
    </div>
  </template>
  
  <script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import axios from 'axios';
  import { useMessage } from 'naive-ui';
  const message = useMessage();
  
  const data = ref([]);
  const loadingRef = ref(true);
  const active = ref(false);
  const config = ref({});
  const Setloading = ref(false);
  const currentItem = ref(null);
  
  async function saveConfig() {
    Setloading.value = true;
    if (!currentItem.value) return;
    try {
      const resp = await axios.post(
        '/api/plugins/setConfig',
        {
          name: currentItem.value.name, 
          config: config.value,
        },
        {
          withCredentials: true,
        }
      );
      Setloading.value = false;
      active.value = false;
      message.success('配置保存成功, 请等待稍后生效');
    } catch (err) {
      Setloading.value = false;
      active.value = false;
      message.error('配置保存失败:', err);
    }
  }
  
  async function handleClickSetting(item) {
    currentItem.value = item;
    try {
      const resp = await axios.post(
        '/api/plugins/getConfig',
        {
          name: item.name,
        },
        {
          withCredentials: true,
        }
      );
      config.value = resp.data;
      active.value = true;
    } catch (e) {
      console.error('获取配置失败:', e);
    }
  }
  
  onMounted(async () => {
    try {
      const resp = await axios.get('/api/plugins/list', {
        withCredentials: true,
      });
      if (resp.status === 200) {
        loadingRef.value = false;
        data.value = resp.data;
      }
    } catch (e) {
      console.error('获取插件列表失败:', e);
    }
  });
  </script>
  
  <style>
  .card {
    width: 100%;
  }
  </style>