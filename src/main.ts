import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// 按需注册：只引入用到的组件与其样式，替代全量 ElementPlus（包体 ~-1MB）
import { ElButton, ElColorPicker, ElConfigProvider, ElDatePicker, ElDialog, ElInput } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/color-picker/style/css'
import 'element-plus/es/components/config-provider/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/dialog/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/notification/style/css'
// 放在 Element Plus 样式之后：这里的令牌要盖过它自带的 :root 变量
import './styles.css'

const app = createApp(App).use(createPinia())
for (const comp of [ElButton, ElColorPicker, ElConfigProvider, ElDatePicker, ElDialog, ElInput]) {
  app.use(comp)
}
app.mount('#app')
