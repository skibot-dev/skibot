
<template>
  <n-config-provider :theme="theme">
    <n-dialog-provider>
      <n-message-provider>
        <DefaultLayout />
      </n-message-provider>
    </n-dialog-provider>
    <n-global-style />
  </n-config-provider>
</template>

<script setup>
import DefaultLayout from '@/layouts/default.vue'
import { ref, provide, onMounted } from 'vue'
import { darkTheme, lightTheme, useMessage } from "naive-ui";
import router from './router';
import { get } from '@vueuse/core';

const theme = ref(lightTheme)
const isdark = ref(false)

function getToken() {
  const cookie = document.cookie;
  const tokenMatch = cookie.match(/(^| )token=([^;]+)/);
  return tokenMatch ? tokenMatch[2] : null;
}

provide('getToken', getToken)

function switchtheme() {
  console.log(theme.value.name)
  if (theme.value.name == 'light') {
    theme.value = darkTheme
    isdark.value = true
  } else {
    theme.value = lightTheme
    isdark.value = false
  }
}

provide('switchTheme', switchtheme)
provide('isdark', isdark)

onMounted(() => {
  if(getToken() && window.location.pathname === '/'){
    router.push('/dashboard/')
  }
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    theme.value = darkTheme
  }

  });

</script>

