<template>
  <n-space vertical>
    <n-layout>
      <n-layout-header>
        <TopBar />
      </n-layout-header>
      <n-layout has-sider>
        <n-layout-sider
          v-if="!isphone"
          bordered
          collapse-mode="width"
          :collapsed-width="64"
          :width="240"
          :collapsed="collapsed"
          show-trigger
          @collapse="collapsed = true"
          @expand="collapsed = false"
        >
          <n-menu
            :collapsed="collapsed"
            :collapsed-width="64"
            :collapsed-icon-size="22"
            :options="filteredMenuOptions"
            :render-label="renderMenuLabel"
            :render-icon="renderMenuIcon"
            :expand-icon="expandIcon"
            :style="{ width: collapsed ? '64px' : '240px' }"
          />
        </n-layout-sider>
        <n-layout-sider
          v-else
          bordered
          collapse-mode="width"
          :collapsed-width="10"
          :width="240"
          :collapsed="collapsed"
          show-trigger
          @collapse="collapsed = true"
          @expand="collapsed = false"
        >
          <n-menu
            :collapsed="collapsed"
            :collapsed-width="64"
            :collapsed-icon-size="22"
            :options="filteredMenuOptions"
            :render-label="renderMenuLabel"
            :render-icon="renderMenuIcon"
            :expand-icon="expandIcon"
            :style="{ width: collapsed ? '64px' : '240px' }"
          />
        </n-layout-sider>

        <n-layout>
          <span>
            <router-view />
          </span>
        </n-layout>
      </n-layout>
    </n-layout>
  </n-space>
</template>

<script setup lang="js">
import { LogIn, AppsSharp,LogOut,Albums } from "@vicons/ionicons5";
import { ref, h, onMounted, computed, provide, inject } from "vue";
import { useDialog } from "naive-ui";
import TopBar from '../components/TopBar.vue';
import router from '../router';

const collapsed = ref(true);
const isphone = ref(false);
provide('isphone', isphone);
const getToken = inject('getToken');

const menuOptions = [
  {
    label: "概览",
    key: "overview",
    icon: AppsSharp,
    onClick: () => {
      router.push("/dashboard/");
    },
  },
  {
    label: "插件管理",
    key: "plugins",
    icon: Albums,
    onClick: () => {
      router.push("/dashboard/plugins");
    },
  },
  {
    label: "登录",
    key: "login",
    icon: LogIn,
    onClick: () => {
      router.push('/dashboard/auth/login');
    },
  },
  {
    label: "登出",
    key: "logout",
    icon: LogOut,
    onClick: () => {
      document.cookie = "token=; path=/; max-age=0"
      window.location.href = '/dashboard/';
    },
  },
];

const filteredMenuOptions = computed(() => {
  const token = getToken();
  return menuOptions.filter(option => {
    if (!token && option.key === 'overview') {
      return false; 
    }
    if (!token && option.key === 'plugins') {
      return false; 
    }
    if (!token && option.key === 'logout') {
      return false; 
    }
    if (token && option.key === 'login') {
      return false; 
    }
    return true;
  });
});

function IsPhone() {
  const info = navigator.userAgent;
  const isPhone = /mobile/i.test(info);
  isphone.value = isPhone;
  return isPhone;
}

function renderMenuLabel(option) {
  if ("href" in option) {
    return h("a", { href: option.href, target: "_blank" }, option.label);
  }
  return option.label;
}

function renderMenuIcon(option) {
  return h(option.icon);
}

onMounted(() => {
  IsPhone();
  if (!getToken() && !window.location.pathname.startsWith('/dashboard/auth')) {
    router.push('/dashboard/auth/login');
    }
});
</script>
