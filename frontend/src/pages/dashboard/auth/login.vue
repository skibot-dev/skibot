<template>
  <n-layout style="height: 100vh;">
    <n-layout-content>
      <n-flex direction="column" justify="center" align="center" style="height: 100%; padding-top: 100px;">
        <n-form :model="form" :rules="rules" ref="formRef" label-placement="top" style="width: 800px;">
          <n-form-item label="用户名" path="username">
            <n-input v-model:value="form.username" placeholder="请输入用户名" />
          </n-form-item>
          <n-form-item label="密码" path="password">
            <n-input v-model:value="form.password" placeholder="请输入密码" type="password" />
          </n-form-item>
          <n-button :loading="loadingRef" type="primary" style="width: 100%;" @click="handleSubmit">
            登录
          </n-button>
        </n-form>
      </n-flex>
    </n-layout-content>
  </n-layout>
</template>

<script setup>
import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import axios from 'axios';
import { useRouter } from 'vue-router';
const router = useRouter();

const form = ref({
  username: '',
  password: ''
});

const loadingRef = ref(false);
const message = useMessage();

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const formRef = ref(null);

async function handleSubmit() {
  try {
    loadingRef.value = true;
    const body = {
      username: form.value.username,
      password: form.value.password
    };
    const res = await axios.post('/auth/login', body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log(res.data);
    if (res.status === 200) {
      loadingRef.value = false;
      message.success('登录成功');
      window.location.href = "/"
    } else {
      loadingRef.value = false;
      message.error(`登录失败: ${res.data.message || '未知错误'}`);
    }
  } catch (e) {
    loadingRef.value = false;
    message.error(`登录失败: ${e.message || '未知错误'}`);
  }
}
</script>