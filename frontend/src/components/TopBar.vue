<template>
  <n-card size="small">
    <n-flex justify="flex-start" align="center"> 
      <n-avatar 
        round
        size="medium"
        src="https://avatars.githubusercontent.com/u/198344200" />
      <div>
        Skibot Dashboard
      </div>
      <n-button v-if="!theme" strong secondary @click="switchTheme">
        <n-icon>
          <Moon />
        </n-icon>
      </n-button>
      <n-button v-if="theme" strong secondary @click="switchTheme">
        <n-icon>
          <Sunny />
        </n-icon>
      </n-button>
    </n-flex>
  </n-card>
</template>

<script setup>
import { inject, computed } from 'vue'
import {
  Moon,
  Sunny
} from '@vicons/ionicons5'

const switchTheme = inject('switchTheme')
const isdark = inject('isdark')

const theme = computed(() => isdark.value)
</script>