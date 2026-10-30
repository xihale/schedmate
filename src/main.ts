import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles.css'

// 按需注册：只引入用到的组件与其样式，替代全量 ElementPlus（包体 ~-1MB）
import {
  ElButton,
  ElColorPicker,
  ElConfigProvider,
  ElContainer,
  ElDatePicker,
  ElDialog,
  ElDivider,
  ElInput,
  ElMain,
  ElRadio,
  ElTooltip,
} from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/color-picker/style/css'
import 'element-plus/es/components/config-provider/style/css'
import 'element-plus/es/components/container/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/dialog/style/css'
import 'element-plus/es/components/divider/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/main/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/notification/style/css'
import 'element-plus/es/components/radio/style/css'
import 'element-plus/es/components/radio-group/style/css'
import 'element-plus/es/components/radio-button/style/css'
import 'element-plus/es/components/tooltip/style/css'

const app = createApp(App).use(createPinia())
for (const comp of [
  ElButton,
  ElColorPicker,
  ElConfigProvider,
  ElContainer,
  ElDatePicker,
  ElDialog,
  ElDivider,
  ElInput,
  ElMain,
  ElRadio, // 2.10 起 ElRadioGroup/ElRadioButton 是空 install，只有 ElRadio 会注册整个 radio 家族
  ElTooltip,
]) {
  app.use(comp)
}
app.mount('#app')
