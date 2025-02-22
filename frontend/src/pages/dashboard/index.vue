<template>
    <n-layout style="height: 100vh;">
        <n-layout-content style="margin-top: 30px; margin-left: 30px; margin-right: 10px">
            <n-spin :show="loadingRef">
                <n-grid :cols="4" :x-gap="16" :y-gap="16">
                    <n-grid-item>
                        <n-card size="small" title="群聊数" class="card" hoverable>
                            {{ data.today.groups }}
                        </n-card>
                    </n-grid-item>
                    <n-grid-item>
                        <n-card size="small" title="用户数" class="card" hoverable>
                            {{ data.today.users }}
                        </n-card>
                    </n-grid-item>
                    <n-grid-item>
                        <n-card size="small" title="消息数" class="card" hoverable>
                            {{ data.today.messages }}
                        </n-card>
                    </n-grid-item>
                    <n-grid-item>
                        <n-card size="small" title="加载插件数" class="card" hoverable>
                            {{ data.plugins }}
                        </n-card>
                    </n-grid-item>
                </n-grid>
                <n-grid :cols="2" :x-gap="16" :y-gap="16" style="margin-top: 25px">
                    <n-grid-item>
                        <n-card size="small" title="用户/群聊数" class="card" hoverable>
                            <div ref="userGroupChart" style="width: 100%; height: 400px;"></div>
                        </n-card>
                    </n-grid-item>
                    <n-grid-item>
                        <n-card size="small" title="消息数" class="card" hoverable>
                            <div ref="messageChart" style="width: 100%; height: 400px;"></div>
                        </n-card>
                    </n-grid-item>
                </n-grid>
            </n-spin>
        </n-layout-content>
    </n-layout>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import axios from 'axios';
import { useMessage } from 'naive-ui';
import * as echarts from 'echarts';
import { transport } from 'pino';
const message = useMessage();
let data = {
    today: {
        groups: 0,
        users: 0,
        messages: 0
    },
    plugins: 0,
    daily: {
        "messages": [],
        "users": [],
        "groups": []
    }
};

const days = Array.from({ length: 30 }, (_, i) => i + 1);

const UserGroupChartOption = {
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        },
        borderWidth: 1,
        textStyle: { 
            color: '#000',
            fontSize: 12
        }
    },
    xAxis: {
        type: 'category',
        data: days
    },
    yAxis: {
        type: 'value'
    },
    series: [
        {
            data: data.daily.users,
            type: 'line',
            name: '用户数'
        },
        {
            data: data.daily.groups,
            type: 'line',
            name: '群聊数'
        }
    ]
};

const MessageChartOption = {
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        },
        borderWidth: 1,
        textStyle: { 
            color: '#000',
            fontSize: 12
        }
    },
    xAxis: {
        type: 'category',
        data: days
    },
    yAxis: {
        type: 'value'
    },
    series: [
        {
            data: data.daily.messages,
            type: 'line',
            name: '消息数'
        }
    ]
};

const loadingRef = ref(true);
const userGroupChart = ref(null);
const messageChart = ref(null);

onMounted(async () => {
    try {
        const res = await axios.get('/api/status', {
            withCredentials: true
        });
        loadingRef.value = false;
        data = res.data;
        UserGroupChartOption.series[0].data = data.daily.users;
        UserGroupChartOption.series[1].data = data.daily.groups;
        MessageChartOption.series[0].data = data.daily.messages;
        const userGroupChartInstance = echarts.init(userGroupChart.value);
        userGroupChartInstance.setOption(UserGroupChartOption);
        const messageChartInstance = echarts.init(messageChart.value);
        messageChartInstance.setOption(MessageChartOption);
    } catch (e) {
        loadingRef.value = false;
        message.error(`获取数据失败: ${e.message || '未知错误'}`);
        console.log(e);
    }
});
</script>

<style>
.card {
    width: 100%;
}
</style>